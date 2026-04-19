/**
 * Кэшированный вызов метода контракта через Block Watcher API
 * с автоматическим fallback на прямой RPC при недоступности worker'а.
 *
 * Последовательность попыток:
 *   1. Если цепь circuit breaker'а открыта — сразу fallback, без обращения к worker.
 *   2. Иначе — HTTP запрос к worker'у с таймаутом (WORKER_CALL_TIMEOUT_MS).
 *      При успехе — результат из кэша worker'а.
 *      При любой ошибке (timeout / 5xx / CORS / оффлайн) — fallback.
 *   3. Fallback: прямой вызов через переданный Web3 contract instance
 *      (который уже инициализирован с window.ethereum либо с /api/rpc → publicnode).
 *
 * @param {string} contractKey - Ключ контракта (cdp, oracle, basket, etc)
 * @param {string} methodName - Имя метода контракта
 * @param {Array} args - Аргументы метода (опционально)
 * @param {Object} fallbackContract - Web3 contract instance для fallback
 * @returns {Promise} - Результат вызова метода
 */

import Web3 from 'web3';
import {
  isWorkerCircuitOpen,
  recordWorkerSuccess,
  recordWorkerFailure,
  fetchWorkerWithTimeout,
  classifyWorkerError,
} from './workerCircuitBreaker';

const WORKER_CALL_TIMEOUT_MS = 3000;

// Публичные RPC для fallback (CORS-enabled, работают прямо из браузера).
// Критически важно: эти URL не идут через /api/rpc прокси nginx,
// так что если nginx / watcher / всё вместе недоступны — fallback всё равно работает.
const PUBLIC_FALLBACK_RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
];

const directWeb3Cache = new Map();
function getDirectWeb3(rpcUrl) {
  if (!directWeb3Cache.has(rpcUrl)) {
    directWeb3Cache.set(rpcUrl, new Web3(rpcUrl));
  }
  return directWeb3Cache.get(rpcUrl);
}

/**
 * Выполнить callback (принимающий web3) по списку публичных RPC,
 * перебирая их по очереди на любой ошибке. Возвращает результат первого успешного.
 */
async function withPublicRpc(fn) {
  let lastError = null;
  for (const rpcUrl of PUBLIC_FALLBACK_RPCS) {
    try {
      const w3 = getDirectWeb3(rpcUrl);
      return await fn(w3, rpcUrl);
    } catch (error) {
      lastError = error;
      console.warn(`[DirectRPC] ${rpcUrl} failed: ${error.message || error}`);
    }
  }
  throw lastError || new Error('All public RPC providers failed');
}

function getWorkerBaseUrl() {
  // В dev без прокси nginx — обращаемся напрямую. В проде — относительный путь,
  // который nginx маршрутизирует на watcher.app-dotflat.svc.cluster.local:3002.
  // Совместимо с существующими вызовами fetch(BLOCK_WATCHER_API/...) из компонентов.
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3002';
  }
  return '/api/worker';
}

function getWorkerApiUrl(contractKey, methodName, args) {
  const apiUrl = `${getWorkerBaseUrl()}/api/call/${contractKey}/${methodName}`;
  const params = args.length > 0 ? `?args=${encodeURIComponent(JSON.stringify(args))}` : '';
  return apiUrl + params;
}

async function callFallback(contractKey, methodName, args, fallbackContract) {
  if (!fallbackContract) {
    throw new Error(
      `Worker unavailable for ${contractKey}.${methodName} and no fallback contract provided`
    );
  }
  const abi = fallbackContract.options && fallbackContract.options.jsonInterface;
  const address = fallbackContract._address || (fallbackContract.options && fallbackContract.options.address);
  if (!abi || !address) {
    throw new Error(
      `Worker unavailable and fallback contract lacks ABI/address for ${contractKey}.${methodName}`
    );
  }

  // Fallback НЕ использует web3 из fallbackContract, потому что тот может быть
  // привязан к мёртвому /api/rpc (nginx → watcher). Всегда идём напрямую
  // в публичные RPC — CORS у publicnode/llamarpc включён.
  return withPublicRpc(async (w3) => {
    const contract = new w3.eth.Contract(abi, address);
    if (!contract.methods[methodName]) {
      throw new Error(`Method ${methodName} not found in ABI`);
    }
    return contract.methods[methodName](...args).call();
  });
}

export async function cachedContractCall(contractKey, methodName, args = [], fallbackContract = null) {
  if (!isWorkerCircuitOpen()) {
    try {
      const url = getWorkerApiUrl(contractKey, methodName, args);
      const response = await fetchWorkerWithTimeout(url, {}, WORKER_CALL_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Worker API call failed');
      }

      recordWorkerSuccess();
      console.log(
        `[${data.cached ? 'Cache HIT' : 'Cache MISS'}] ${contractKey}.${methodName}(${args.join(', ')})`
      );
      return data.result;
    } catch (error) {
      const reason = classifyWorkerError(error);
      recordWorkerFailure(reason);
      console.warn(
        `[Worker] ${contractKey}.${methodName} failed (${reason}), falling back to direct RPC`
      );
    }
  } else {
    console.log(
      `[Worker] Circuit open, skipping worker for ${contractKey}.${methodName}`
    );
  }

  return callFallback(contractKey, methodName, args, fallbackContract);
}

/**
 * Batch вызов нескольких методов контракта.
 * Оптимизация: все вызовы идут параллельно.
 */
export async function batchCachedContractCalls(calls) {
  const promises = calls.map(({ contractKey, methodName, args, fallbackContract }) =>
    cachedContractCall(contractKey, methodName, args, fallbackContract)
  );
  return Promise.all(promises);
}

/**
 * Получить ETH-баланс адреса с кэшированием и fallback.
 *
 * Тот же паттерн что и cachedContractCall: сначала worker (с таймаутом),
 * затем — прямой вызов web3.eth.getBalance через RPC (который уже идёт
 * через /api/rpc → publicnode или window.ethereum).
 *
 * @param {string} address - Адрес кошелька / контракта
 * @param {Object} web3 - Web3 instance для fallback
 * @returns {Promise<string>} Баланс в wei (строка)
 */
export async function cachedEthBalance(address, web3) {
  if (!isWorkerCircuitOpen()) {
    try {
      const url = `${getWorkerBaseUrl()}/api/eth/getBalance?address=${address}`;
      const response = await fetchWorkerWithTimeout(url, {}, WORKER_CALL_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Worker API call failed');
      }

      recordWorkerSuccess();
      console.log(
        `[${data.cached ? 'Cache HIT' : 'Cache MISS'}] eth.getBalance(${address})`
      );
      return data.result;
    } catch (error) {
      const reason = classifyWorkerError(error);
      recordWorkerFailure(reason);
      console.warn(
        `[Worker] eth.getBalance(${address}) failed (${reason}), falling back to direct RPC`
      );
    }
  } else {
    console.log(`[Worker] Circuit open, skipping worker for eth.getBalance(${address})`);
  }

  // Игнорируем переданный web3 (он может идти через мёртвый /api/rpc),
  // всегда бьём в публичные RPC напрямую.
  const balance = await withPublicRpc((w3) => w3.eth.getBalance(address));
  return balance.toString();
}
