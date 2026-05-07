/**
 * RPC provider with automatic failover across multiple endpoints.
 *
 * RPC_URL env var accepts a comma-separated list:
 *   RPC_URL=https://eth.llamarpc.com,https://rpc.ankr.com/eth,https://cloudflare-eth.com
 *
 * A single URL still works. If RPC_URL is unset, the built-in defaults are used.
 */

const { Web3 } = require('web3');
const logger = require('./logger');

const DEFAULTS = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com',
];

function getRpcUrls() {
  const raw = (process.env.RPC_URL || '').trim();
  const list = raw.split(',').map(u => u.trim()).filter(Boolean);
  return list.length > 0 ? list : DEFAULTS;
}

let _index = 0;
let _web3 = null;

function _makeWeb3(url) {
  return new Web3(new Web3.providers.HttpProvider(url, { timeout: 10_000 }));
}

function getWeb3() {
  if (!_web3) {
    const url = getRpcUrls()[_index];
    _web3 = _makeWeb3(url);
    logger.info(`[RPC] Using ${url}`);
  }
  return _web3;
}

function _rotate(failedUrl) {
  const urls = getRpcUrls();
  _index = (_index + 1) % urls.length;
  const next = urls[_index];
  _web3 = _makeWeb3(next);
  logger.warn(`[RPC] ${failedUrl} failed — rotating to ${next}`);
  return _web3;
}

/**
 * Run fn(web3), rotating to next endpoint on failure.
 * Tries every configured URL before giving up.
 */
async function withFallback(fn) {
  const urls = getRpcUrls();
  let attempts = 0;
  while (attempts < urls.length) {
    const currentUrl = urls[_index];
    try {
      return await fn(getWeb3());
    } catch (err) {
      _rotate(currentUrl);
      attempts++;
    }
  }
  throw new Error(`All RPC endpoints failed (tried: ${urls.join(', ')})`);
}

/**
 * Try to connect to each RPC URL in order, return the first working Web3.
 * Used during startup — verifies the connection before committing.
 */
async function connectWithFallback(testFn) {
  const urls = getRpcUrls();
  let lastError;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const web3 = _makeWeb3(url);
    try {
      if (testFn) await testFn(web3);
      _index = i;
      _web3 = web3;
      logger.info(`[RPC] Connected: ${url}`);
      return web3;
    } catch (err) {
      logger.warn(`[RPC] ${url} unreachable during init: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError || new Error('No RPC endpoints available');
}

module.exports = { getRpcUrls, getWeb3, withFallback, connectWithFallback };
