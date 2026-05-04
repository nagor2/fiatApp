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

const WORKER_CALL_TIMEOUT_MS = 8000;

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

// Injected wallet (MetaMask, etc.) — fastest fallback when user is connected.
// EIP-1193 provider is already authenticated and has no CORS or rate-limit issues.
let _injectedWeb3 = null;
function getInjectedWeb3() {
  if (!_injectedWeb3 && typeof window !== 'undefined' && window.ethereum) {
    _injectedWeb3 = new Web3(window.ethereum);
  }
  return _injectedWeb3;
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

export function getWorkerBaseUrl() {
  // В dev без прокси nginx — обращаемся напрямую. В проде — относительный путь,
  // который nginx маршрутизирует на watcher.app-dotflat.svc.cluster.local:3002.
  // Совместимо с существующими вызовами fetch(BLOCK_WATCHER_API/...) из компонентов.
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3002';
  }
  return '/api/worker';
}

function getWorkerApiUrl(contractKey, methodName, args, options = {}) {
  const apiUrl = `${getWorkerBaseUrl()}/api/call/${contractKey}/${methodName}`;
  const search = new URLSearchParams();
  if (args.length > 0) search.set('args', JSON.stringify(args));
  if (options.noCache) search.set('noCache', '1');
  const qs = search.toString();
  return qs ? `${apiUrl}?${qs}` : apiUrl;
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

  // Priority: injected wallet (MetaMask) → public RPC.
  // Injected provider is already live, no CORS, no rate limits.
  const injected = getInjectedWeb3();
  if (injected) {
    try {
      const contract = new injected.eth.Contract(abi, address);
      const result = await contract.methods[methodName](...args).call();
      console.log(`[InjectedRPC] ${contractKey}.${methodName}(${args.join(', ')}) ok`);
      return result;
    } catch (err) {
      console.warn(`[InjectedRPC] ${contractKey}.${methodName} failed: ${err.message}`);
    }
  }

  return withPublicRpc(async (w3) => {
    const contract = new w3.eth.Contract(abi, address);
    if (!contract.methods[methodName]) {
      throw new Error(`Method ${methodName} not found in ABI`);
    }
    return contract.methods[methodName](...args).call();
  });
}

export async function cachedContractCall(contractKey, methodName, args = [], fallbackContract = null, options = {}) {
  if (!isWorkerCircuitOpen()) {
    try {
      const url = getWorkerApiUrl(contractKey, methodName, args, options);
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
 * Batch — single HTTP round-trip to /api/batch for all calls.
 * Returns per-item { success, result, error } objects so partial failures
 * don't break the whole load. Falls back to individual calls if the request itself fails.
 *
 * @param {Array<{ contractKey, methodName, args?, noCache?, fallbackContract? }>} calls
 * @returns {Promise<Array<{ success: boolean, result?: any, error?: string }>>}
 */
export async function batchCachedContractCalls(calls) {
  if (!calls.length) return [];

  if (!isWorkerCircuitOpen()) {
    try {
      const body = JSON.stringify(calls.map(({ contractKey, methodName, args = [], noCache = false }) => ({
        contract: contractKey,
        method: methodName,
        args,
        noCache,
      })));

      const url = `${getWorkerBaseUrl()}/api/batch`;
      const response = await fetchWorkerWithTimeout(
        url,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
        WORKER_CALL_TIMEOUT_MS,
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const results = await response.json();

      recordWorkerSuccess();
      // Return per-item results; callers decide how to handle individual failures.
      return results.map(r => ({ success: r.success, result: r.result, error: r.error }));
    } catch (error) {
      const reason = classifyWorkerError(error);
      recordWorkerFailure(reason);
      console.warn(`[Worker] batch failed (${reason}), falling back per-call`);
    }
  }

  // Fallback: individual calls (injected provider or public RPC per item).
  return Promise.all(
    calls.map(async ({ contractKey, methodName, args = [], fallbackContract = null, noCache = false }) => {
      try {
        const result = await cachedContractCall(contractKey, methodName, args, fallbackContract, { noCache });
        return { success: true, result };
      } catch (e) {
        return { success: false, error: e.message };
      }
    })
  );
}

/**
 * Принудительно попросить воркер перечитать состояние контракта.
 *
 * Вызываем после успешного write-tx (openCDP / closeCDP / deposit / topUp / etc),
 * чтобы UI сразу увидел свежие данные, не дожидаясь, пока воркер сам обработает
 * блок с транзакцией (это может занять 10-30 секунд при polling-режиме).
 *
 * Никогда не бросает — это best-effort инвалидация. Если воркер лежит,
 * клиент потом всё равно свалится на direct RPC в своём cachedContractCall.
 *
 * @param {string} contractKeyOrName - Ключ контракта ('cdp', 'deposit', etc)
 * @returns {Promise<boolean>} true — воркер подтвердил инвалидацию.
 */
export async function renewWorkerCache(contractKeyOrName) {
  if (!contractKeyOrName) return false;
  if (isWorkerCircuitOpen()) {
    console.log(`[Worker] Circuit open, skipping renewCache for ${contractKeyOrName}`);
    return false;
  }
  try {
    const url = `${getWorkerBaseUrl()}/api/renewCache/${encodeURIComponent(contractKeyOrName)}`;
    const response = await fetchWorkerWithTimeout(
      url,
      { method: 'POST' },
      WORKER_CALL_TIMEOUT_MS
    );
    if (!response.ok) {
      console.warn(`[Worker] renewCache(${contractKeyOrName}) HTTP ${response.status}`);
      return false;
    }
    const data = await response.json().catch(() => ({}));
    recordWorkerSuccess();
    console.log(`[Worker] renewCache(${contractKeyOrName}) ok`, data);
    return true;
  } catch (error) {
    const reason = classifyWorkerError(error);
    recordWorkerFailure(reason);
    console.warn(`[Worker] renewCache(${contractKeyOrName}) failed (${reason})`);
    return false;
  }
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

  // Priority: injected wallet → public RPC.
  const injected = getInjectedWeb3();
  if (injected) {
    try {
      const balance = await injected.eth.getBalance(address);
      return balance.toString();
    } catch (err) {
      console.warn(`[InjectedRPC] eth.getBalance failed: ${err.message}`);
    }
  }

  const balance = await withPublicRpc((w3) => w3.eth.getBalance(address));
  return balance.toString();
}
