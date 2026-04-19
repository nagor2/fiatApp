// API для работы с block-watcher cache с fallback на Etherscan.
//
// Последовательность:
//   1. Если worker-circuit закрыт — идём в worker с таймаутом.
//   2. При ошибке / таймауте / открытой цепи — fallback на Etherscan API
//      (ключ из config.etherscanApiKey). Logs API поддерживает фильтрацию
//      по адресу и topic0 (хэш сигнатуры события).
//   3. Полученные raw logs декодируются через ethers Interface в формат,
//      совместимый с тем, что раньше отдавал worker (поля returnValues,
//      blockNumber, transactionHash, address).
//
// Важно: Etherscan free tier = 5 rps / 100k в день. Это fallback-режим,
// активируется только когда worker лежит. Для одного пользователя лимитов
// хватает; при массовой нагрузке в fallback-режиме — стоит закрывать
// worker как приоритет.

import { Interface } from 'ethers';
import config from './config';
import {
  isWorkerCircuitOpen,
  recordWorkerSuccess,
  recordWorkerFailure,
  fetchWorkerWithTimeout,
  classifyWorkerError,
} from './workerCircuitBreaker';

const WORKER_EVENTS_TIMEOUT_MS = 5000;
const WORKER_TX_TIMEOUT_MS = 5000;

const rawWorkerUrl = process.env.REACT_APP_WORKERS_HEALTH_URL || '/api/worker/health';
const absoluteWorkerUrl = rawWorkerUrl.startsWith('http')
  ? rawWorkerUrl
  : (typeof window !== 'undefined' ? `${window.location.origin}${rawWorkerUrl}` : rawWorkerUrl);
const WORKER_API_URL = absoluteWorkerUrl.replace(/\/health$/, '');

// ======== Worker API (с таймаутами и circuit breaker) ========

export async function renewContractCache(contractNameOrAddress) {
  const response = await fetchWorkerWithTimeout(
    `${WORKER_API_URL}/api/renewCache/${contractNameOrAddress}`,
    { method: 'POST' },
    WORKER_TX_TIMEOUT_MS,
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to renew cache (HTTP ${response.status})`);
  }
  return response.json();
}

async function fetchWorkerEvents(contractAddress, eventName, limit) {
  const url = eventName
    ? `${WORKER_API_URL}/api/events/${contractAddress}?event=${eventName}&limit=${limit}`
    : `${WORKER_API_URL}/api/events/${contractAddress}?limit=${limit}`;
  const response = await fetchWorkerWithTimeout(url, {}, WORKER_EVENTS_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.events || [];
}

async function fetchWorkerTransactions(contractAddress, limit) {
  const url = `${WORKER_API_URL}/api/transactions/${contractAddress}?limit=${limit}`;
  const response = await fetchWorkerWithTimeout(url, {}, WORKER_TX_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.transactions || [];
}

export async function getContractTransactions(contractAddress, limit = 100) {
  if (isWorkerCircuitOpen()) {
    console.log('[Worker] Circuit open, skipping transactions fetch');
    return [];
  }
  try {
    const txs = await fetchWorkerTransactions(contractAddress, limit);
    recordWorkerSuccess();
    return txs;
  } catch (error) {
    recordWorkerFailure(classifyWorkerError(error));
    console.warn(`[Worker] Transactions fetch failed: ${classifyWorkerError(error)}`);
    return [];
  }
}

export async function getContractEvents(contractAddress, eventName = null, limit = 100) {
  if (isWorkerCircuitOpen()) {
    return null;
  }
  try {
    const events = await fetchWorkerEvents(contractAddress, eventName, limit);
    recordWorkerSuccess();
    return events;
  } catch (error) {
    recordWorkerFailure(classifyWorkerError(error));
    console.warn(`[Worker] Events fetch failed: ${classifyWorkerError(error)}`);
    return null;
  }
}

// ======== Fallback: Etherscan Logs API ========

function getContractAbi(contract) {
  // web3 v4 хранит ABI в options.jsonInterface; _jsonInterface — приватное поле
  // старых версий (оставлено как страховка на случай смешанных инстансов).
  return contract?.options?.jsonInterface || contract?._jsonInterface || null;
}

function buildEtherscanLogsUrl({ address, topic0, fromBlock, toBlock }) {
  const fb = typeof fromBlock === 'number' ? fromBlock : (fromBlock || 0);
  const tb = !toBlock || toBlock === 'latest' ? 'latest' : toBlock;
  const params = new URLSearchParams({
    chainid: '1',
    module: 'logs',
    action: 'getLogs',
    address,
    fromBlock: String(fb),
    toBlock: String(tb),
    apikey: config.etherscanApiKey,
  });
  if (topic0) {
    params.set('topic0', topic0);
  }
  return `${config.etherscanApiUrl}?${params.toString()}`;
}

function hexToNumber(hex) {
  if (hex === undefined || hex === null) return null;
  if (typeof hex === 'number') return hex;
  return parseInt(hex, 16);
}

function decodeLog(iface, eventFragment, log) {
  const parsed = iface.parseLog({ topics: log.topics, data: log.data });
  const returnValues = {};
  eventFragment.inputs.forEach((input, i) => {
    let value = parsed.args[i];
    if (typeof value === 'bigint') {
      value = value.toString();
    }
    returnValues[input.name] = value;
    returnValues[String(i)] = value;
  });
  return {
    returnValues,
    event: eventFragment.name,
    address: log.address,
    contractAddress: log.address,
    blockNumber: hexToNumber(log.blockNumber),
    transactionHash: log.transactionHash,
    transactionIndex: hexToNumber(log.transactionIndex),
    logIndex: hexToNumber(log.logIndex),
    timeStamp: hexToNumber(log.timeStamp),
  };
}

async function fetchEtherscanEvents(contract, eventName, options) {
  const abi = getContractAbi(contract);
  if (!abi) {
    throw new Error('Contract ABI is not available for Etherscan fallback');
  }
  if (!config.etherscanApiKey) {
    throw new Error('Etherscan API key is not configured');
  }

  const iface = new Interface(abi);
  const eventFragment = eventName ? iface.getEvent(eventName) : null;
  if (eventName && !eventFragment) {
    throw new Error(`Event ${eventName} not found in ABI`);
  }

  const url = buildEtherscanLogsUrl({
    address: contract.options.address,
    topic0: eventFragment ? eventFragment.topicHash : null,
    fromBlock: options.fromBlock,
    toBlock: options.toBlock,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Etherscan HTTP ${response.status}`);
  }
  const data = await response.json();

  // У Etherscan status=0 + message="No records found" — это НЕ ошибка,
  // просто пустой результат. Всё остальное со status=0 — реальная ошибка.
  if (data.status === '0') {
    if (data.message === 'No records found') {
      return [];
    }
    throw new Error(`Etherscan API error: ${data.message} ${data.result || ''}`);
  }

  const logs = Array.isArray(data.result) ? data.result : [];

  if (eventFragment) {
    return logs.map(log => decodeLog(iface, eventFragment, log));
  }

  // Если eventName не задан — декодируем по topic0 каждого лога.
  return logs
    .map(log => {
      try {
        const topic = log.topics && log.topics[0];
        const frag = topic ? iface.getEvent(topic) : null;
        if (!frag) return null;
        return decodeLog(iface, frag, log);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ======== Общие хелперы ========

export function normalizeCachedEvent(cachedEvent) {
  return {
    ...cachedEvent,
    address: cachedEvent.contractAddress || cachedEvent.address,
  };
}

export function filterEvents(events, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) {
    return events;
  }
  return events.filter(event => {
    for (const [key, value] of Object.entries(filter)) {
      const eventValue = event.returnValues?.[key];
      if (typeof value === 'string' && value.startsWith('0x')) {
        if (eventValue?.toLowerCase() !== value.toLowerCase()) {
          return false;
        }
      } else if (eventValue !== value) {
        return false;
      }
    }
    return true;
  });
}

function applyRangeFilters(events, options) {
  let filtered = events;
  if (options.filter) {
    filtered = filterEvents(filtered, options.filter);
  }
  if (options.fromBlock && options.fromBlock !== 0) {
    filtered = filtered.filter(e => e.blockNumber >= options.fromBlock);
  }
  if (options.toBlock && options.toBlock !== 'latest') {
    filtered = filtered.filter(e => e.blockNumber <= options.toBlock);
  }
  return filtered;
}

/**
 * Заменитель для getPastEventsChunked.
 *
 * Worker — основной источник (отдаёт декодированные события из Redis),
 * Etherscan — fallback при его недоступности. Сигнатура результата одинаковая.
 *
 * @param {Object} contract - Web3 contract instance
 * @param {string} eventName - Название события (или null для всех)
 * @param {Object} options - {filter, fromBlock, toBlock}
 * @param {Object} web3 - Web3 instance (оставлен для обратной совместимости)
 * @returns {Promise<Array>}
 */
export async function getPastEventsCached(contract, eventName, options = {}, web3) {
  const contractAddress = contract.options.address;

  const workerEvents = await getContractEvents(contractAddress, eventName, 10000);

  // Worker вернул непустой ответ — доверяем, это быстрый путь.
  if (workerEvents !== null && workerEvents.length > 0) {
    return applyRangeFilters(workerEvents, options).map(normalizeCachedEvent);
  }

  // workerEvents === null: ошибка/таймаут worker'а, падаем в Etherscan.
  // workerEvents === []: worker ответил, но кеш пустой — возможно прогрев
  // воркера после рестарта или промах. Для активных контрактов (DFC/RLE)
  // пустой ответ в 99% случаев означает именно промах, поэтому
  // перестраховываемся и всё равно дёргаем Etherscan. Если реальных событий
  // нет — получим пустой массив; если есть — вернём корректные данные
  // вместо ложного нуля.
  const workerReturnedEmpty = workerEvents !== null && workerEvents.length === 0;

  try {
    if (workerReturnedEmpty) {
      console.log(
        `[Etherscan double-check] worker returned empty for ${eventName || 'all'} on ${contractAddress}`
      );
    } else {
      console.log(`[Etherscan fallback] ${eventName || 'all events'} on ${contractAddress}`);
    }
    const events = await fetchEtherscanEvents(contract, eventName, options);
    return applyRangeFilters(events, options).map(normalizeCachedEvent);
  } catch (error) {
    console.error(`[Etherscan fallback] failed: ${error.message}`);
    // Etherscan тоже лёг — возвращаем что есть (пустой worker-ответ лучше,
    // чем бросок, иначе рушится весь компонент).
    if (workerEvents !== null) {
      return workerEvents.map(normalizeCachedEvent);
    }
    return [];
  }
}
