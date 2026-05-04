/**
 * Circuit breaker для Block Watcher worker API.
 *
 * Назначение: защитить UX от ситуации, когда worker недоступен (упал, висит,
 * не задеплоен из-за проблем пайплайна). Без этого fetch без таймаута может
 * блокировать промисы в компонентах на десятки секунд.
 *
 * Логика:
 *   - Каждый вызов проходит через fetchWorkerWithTimeout с жёстким таймаутом.
 *   - После FAILURE_THRESHOLD подряд ошибок цепь "открывается" на OPEN_DURATION_MS.
 *   - Пока цепь открыта — запросы к worker'у не делаются вообще, вызывающий
 *     код сразу идёт в fallback (прямой RPC / Etherscan).
 *   - По истечении OPEN_DURATION_MS цепь "полуоткрывается": следующий запрос
 *     пройдёт к worker'у. Если он успешен — цепь закрывается, если нет —
 *     открывается заново.
 *
 * Состояние глобальное на модуль (module-level singleton), потому что
 * недоступность worker'а — общая на всё приложение.
 */

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 3000;

const state = {
  consecutiveFailures: 0,
  openedAt: 0,
};

export function isWorkerCircuitOpen() {
  if (state.openedAt === 0) {
    return false;
  }
  const elapsed = Date.now() - state.openedAt;
  if (elapsed >= OPEN_DURATION_MS) {
    state.openedAt = 0;
    state.consecutiveFailures = 0;
    console.log('[WorkerCircuitBreaker] Half-open: next request will probe worker');
    return false;
  }
  return true;
}

export function recordWorkerSuccess() {
  if (state.consecutiveFailures > 0 || state.openedAt !== 0) {
    console.log('[WorkerCircuitBreaker] Worker recovered, circuit closed');
  }
  state.consecutiveFailures = 0;
  state.openedAt = 0;
}

export function recordWorkerFailure(reason) {
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= FAILURE_THRESHOLD && state.openedAt === 0) {
    state.openedAt = Date.now();
    console.warn(
      `[WorkerCircuitBreaker] Circuit OPEN for ${OPEN_DURATION_MS}ms ` +
      `after ${state.consecutiveFailures} failures (last: ${reason})`
    );
  }
}

/**
 * fetch-обёртка с жёстким таймаутом через AbortController.
 * Это главное лекарство от "висящего" worker'а.
 */
export async function fetchWorkerWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Преобразовать ошибку fetch в человекочитаемую причину для логов / breaker'а.
 */
export function classifyWorkerError(error) {
  if (!error) return 'unknown';
  if (error.name === 'AbortError') return 'timeout';
  return error.message || String(error);
}

export const WORKER_CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD,
  OPEN_DURATION_MS,
  DEFAULT_TIMEOUT_MS,
};
