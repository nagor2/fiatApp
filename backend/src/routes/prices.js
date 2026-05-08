const express = require('express');
const cacheService = require('../services/cacheService');
const contractService = require('../services/contractService');
const logger = require('../utils/logger');
const { withFallback } = require('../utils/rpcProvider');

const router = express.Router();
const CACHE_TTL_MARKET    = 30;  // seconds — market prices (ETH/USD, Uniswap pools)
const CACHE_TTL_ORACLE    = 300; // seconds — oracle DFC index (only changes on-chain tx)
const CACHE_TTL_ETHERSCAN = 60;  // seconds — Etherscan ETH price (rate-limited)

// ── Addresses ─────────────────────────────────────────────────────────────
const USDC_WETH_POOL  = '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640';
const V4_QUOTER       = '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203';
const V4_STATE_VIEW   = '0x7ffe42c4a5deea5b0fec41c94c136cf115597227';
const DFC_ADDRESS     = '0x1f709cfa0c409e158c68edcd32453809c9eb69ee';
const DFC_RLE_POOL_ID = '0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044';
const DFC_ETH_POOL_ID = '0xca0a1a9ab72c583a8ccd487e6d8c75bcc62f9792b4c8c5aedd1707fe2b8bd3cf';
const ZERO_ADDRESS    = '0x0000000000000000000000000000000000000000';

// ── ABIs (minimal) ────────────────────────────────────────────────────────
const SLOT0_ABI = [{
  name: 'slot0', type: 'function', stateMutability: 'view',
  inputs: [],
  outputs: [
    { name: 'sqrtPriceX96', type: 'uint160' },
    { name: 'tick', type: 'int24' },
    { name: 'observationIndex', type: 'uint16' },
    { name: 'observationCardinality', type: 'uint16' },
    { name: 'observationCardinalityNext', type: 'uint16' },
    { name: 'feeProtocol', type: 'uint8' },
    { name: 'unlocked', type: 'bool' },
  ],
}];

const V4_STATE_SLOT0_ABI = [{
  name: 'getSlot0', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'poolId', type: 'bytes32' }],
  outputs: [
    { name: 'sqrtPriceX96', type: 'uint160' },
    { name: 'tick', type: 'int24' },
    { name: 'protocolFee', type: 'uint24' },
    { name: 'lpFee', type: 'uint24' },
  ],
}, {
  name: 'getLiquidity', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'poolId', type: 'bytes32' }],
  outputs: [{ name: '', type: 'uint128' }],
}];

const V4_QUOTER_ABI = [{
  name: 'quoteExactInputSingle', type: 'function', stateMutability: 'nonpayable',
  inputs: [{
    name: 'params', type: 'tuple',
    components: [
      {
        name: 'poolKey', type: 'tuple',
        components: [
          { name: 'currency0',   type: 'address' },
          { name: 'currency1',   type: 'address' },
          { name: 'fee',         type: 'uint24'  },
          { name: 'tickSpacing', type: 'int24'   },
          { name: 'hooks',       type: 'address' },
        ],
      },
      { name: 'zeroForOne',   type: 'bool'    },
      { name: 'exactAmount',  type: 'uint128' },
      { name: 'hookData',     type: 'bytes'   },
    ],
  }],
  outputs: [
    { name: 'amountOut',   type: 'uint256' },
    { name: 'gasEstimate', type: 'uint256' },
  ],
}];

// ── Fetchers ──────────────────────────────────────────────────────────────
async function fetchEthUsd() {
  return withFallback(async (web3) => {
    const pool = new web3.eth.Contract(SLOT0_ABI, USDC_WETH_POOL);
    const s = await pool.methods.slot0().call();
    // USDC/WETH V3: token0=USDC(6dec), token1=WETH(18dec)
    // ETH/USD = 10^12 * 2^192 / sqrtPriceX96^2
    const sqrtPriceX96 = BigInt(s.sqrtPriceX96);
    const ethUsdScaled = (10n ** 18n * 2n ** 192n) / (sqrtPriceX96 ** 2n);
    return Math.round(Number(ethUsdScaled) / 1e6 * 100) / 100;
  });
}

async function fetchDfcEth() {
  return withFallback(async (web3) => {
    const quoter = new web3.eth.Contract(V4_QUOTER_ABI, V4_QUOTER);
    const oneToken = '1000000000000000000'; // 1 DFC in wei
    const result = await quoter.methods.quoteExactInputSingle({
      poolKey: {
        currency0:   ZERO_ADDRESS,
        currency1:   DFC_ADDRESS,
        fee:         3000,
        tickSpacing: 60,
        hooks:       ZERO_ADDRESS,
      },
      zeroForOne:  false, // DFC (currency1) → ETH (currency0)
      exactAmount: oneToken,
      hookData:    '0x',
    }).call();
    return Number(BigInt(result.amountOut)) / 1e18;
  });
}

async function fetchDfcEthPool() {
  return withFallback(async (web3) => {
    const sv = new web3.eth.Contract(V4_STATE_SLOT0_ABI, V4_STATE_VIEW);
    const [slot0, liquidity] = await Promise.all([
      sv.methods.getSlot0(DFC_ETH_POOL_ID).call(),
      sv.methods.getLiquidity(DFC_ETH_POOL_ID).call(),
    ]);
    return {
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: Number(slot0.tick),
      liquidity: liquidity.toString(),
    };
  });
}

async function fetchRleDfcPool(rleAddress) {
  return withFallback(async (web3) => {
    const sv = new web3.eth.Contract(V4_STATE_SLOT0_ABI, V4_STATE_VIEW);
    const [slot0, liquidity] = await Promise.all([
      sv.methods.getSlot0(DFC_RLE_POOL_ID).call(),
      sv.methods.getLiquidity(DFC_RLE_POOL_ID).call(),
    ]);
    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
    const SCALE = 10n ** 18n;
    const priceC1PerC0Scaled = sqrtPriceX96 ** 2n * SCALE / (2n ** 192n);
    const rleIsCurrency0 = rleAddress.toLowerCase() < DFC_ADDRESS.toLowerCase();
    const priceRleInDfcScaled = rleIsCurrency0
      ? priceC1PerC0Scaled
      : (priceC1PerC0Scaled > 0n ? SCALE * SCALE / priceC1PerC0Scaled : 0n);
    return {
      priceRleInDfc: Number(priceRleInDfcScaled) / Number(SCALE),
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: Number(slot0.tick),
      lpFee: Number(slot0.lpFee),
      liquidity: liquidity.toString(),
    };
  });
}

// DFC index = basket.getCurrentSharePriceChange() / 1e6
// (ratio of current weighted basket price to initial, e.g. 1.28 = +28% since inception)
async function fetchDfcIndex() {
  const basket = contractService.contracts?.basket;
  if (!basket) throw new Error('basket contract not ready');
  const raw = await basket.methods.getCurrentSharePriceChange().call();
  return Number(BigInt(raw)) / 1e6;
}

async function fetchEthUsdOracle() {
  const oracle = contractService.contracts?.oracle;
  if (!oracle) throw new Error('oracle contract not ready');
  const raw = await oracle.methods.getPrice('eth').call();
  return Number(BigInt(raw)) / 1e6;
}

async function fetchEthUsdEtherscan() {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) throw new Error('ETHERSCAN_API_KEY not set');
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${apiKey}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== '1') throw new Error(`Etherscan: ${data.message}`);
  return parseFloat(data.result.ethusd);
}

// ── Helpers ───────────────────────────────────────────────────────────────

// In-memory stale cache — survives Redis misses and RPC failures
const _stale = {};

async function cachedFetch(key, ttl, fn) {
  try {
    const cached = await cacheService.get(key);
    if (cached != null) {
      _stale[key] = cached; // keep warm
      return cached;
    }
  } catch (_) {}

  // Return stale data immediately and refresh in background
  if (_stale[key] != null) {
    fn().then(result => {
      _stale[key] = result;
      cacheService.set(key, result, ttl).catch(() => {});
    }).catch(() => {});
    return _stale[key];
  }

  // Cold start — must fetch synchronously
  const result = await fn();
  _stale[key] = result;
  try { await cacheService.set(key, result, ttl); } catch (_) {}
  return result;
}

// ── Routes ────────────────────────────────────────────────────────────────
// GET /api/prices — returns all prices: ETH/USD, DFC/ETH, DFC/USD, RLE/DFC, RLE/USD
// RLE address is resolved automatically from contractService (no query params needed)
//
// Cache-Control: dfcIndex → 5 min (oracle, changes only on-chain tx)
//                market prices → 30 s + stale-while-revalidate
router.get('/', async (req, res) => {
  try {
    const rleAddress = contractService.contracts?.rule?._address || null;

    const [ethUsdUniswap, dfcEth, dfcIndex, ethUsdEtherscan, ethUsd, dfcEthPool] = await Promise.allSettled([
      cachedFetch('price:eth_usd_uniswap',   CACHE_TTL_MARKET,    fetchEthUsd),
      cachedFetch('price:dfc_eth',           CACHE_TTL_MARKET,    fetchDfcEth),
      cachedFetch('price:dfc_index',         CACHE_TTL_ORACLE,    fetchDfcIndex),
      cachedFetch('price:eth_usd_etherscan', CACHE_TTL_ETHERSCAN, fetchEthUsdEtherscan),
      cachedFetch('price:eth_usd_oracle',    CACHE_TTL_ORACLE,    fetchEthUsdOracle),
      cachedFetch('price:dfc_eth_pool',      CACHE_TTL_MARKET,    fetchDfcEthPool),
    ]);

    // ethUsd = oracle price (what the protocol actually uses)
    // ethUsdUniswap / ethUsdEtherscan = market reference prices
    const response = {
      ethUsd:          ethUsd.status          === 'fulfilled' ? ethUsd.value          : null,
      ethUsdUniswap:   ethUsdUniswap.status   === 'fulfilled' ? ethUsdUniswap.value   : null,
      ethUsdEtherscan: ethUsdEtherscan.status === 'fulfilled' ? ethUsdEtherscan.value : null,
      dfcEth:          dfcEth.status          === 'fulfilled' ? dfcEth.value          : null,
      dfcIndex:        dfcIndex.status        === 'fulfilled' ? dfcIndex.value        : null,
      dfcEthPool:      dfcEthPool.status      === 'fulfilled' ? dfcEthPool.value      : null,
      dfcUsd:   null,
      rleDfc:   null,
      rleUsd:   null,
      ts:       Date.now(),
    };

    // DFC/USD = dfcEth * market ETH price.
    // Use market price (Etherscan → Uniswap) not the oracle price: the oracle
    // reflects the protocol's trusted collateral value (updated on-chain by the
    // team) and can lag the real market, inflating the displayed DFC price.
    // Oracle price (ethUsd) is kept in the response for protocol-internal use.
    const ethForCalc = response.ethUsdEtherscan ?? response.ethUsdUniswap ?? response.ethUsd;
    if (ethForCalc && response.dfcEth) {
      response.dfcUsd = response.dfcEth * ethForCalc;
    }

    if (rleAddress && response.dfcUsd) {
      try {
        const rlePool = await cachedFetch(
          `price:rle_dfc:${rleAddress.toLowerCase()}`,
          CACHE_TTL_MARKET,
          () => fetchRleDfcPool(rleAddress),
        );
        response.rleDfc = rlePool;
        if (rlePool?.priceRleInDfc) {
          response.rleUsd = rlePool.priceRleInDfc * response.dfcUsd;
        }
      } catch (e) {
        logger.warn('RLE pool fetch failed:', e.message);
      }
    }

    const maxAge = response.dfcIndex != null ? CACHE_TTL_ORACLE : CACHE_TTL_MARKET;
    res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 4}`);
    res.json(response);
  } catch (err) {
    logger.error('Prices route error:', err.message);
    res.status(500).json({ error: 'price fetch failed', message: err.message });
  }
});

// Pre-warm cache at startup and refresh every CACHE_TTL_MARKET seconds so
// the first HTTP request always returns from cache (avoids cold-start 504s).
async function warmCache() {
  try {
    await Promise.allSettled([
      cachedFetch('price:eth_usd_uniswap',   CACHE_TTL_MARKET,    fetchEthUsd),
      cachedFetch('price:dfc_eth',           CACHE_TTL_MARKET,    fetchDfcEth),
      cachedFetch('price:dfc_index',         CACHE_TTL_ORACLE,    fetchDfcIndex),
      cachedFetch('price:eth_usd_etherscan', CACHE_TTL_ETHERSCAN, fetchEthUsdEtherscan),
      cachedFetch('price:eth_usd_oracle',    CACHE_TTL_ORACLE,    fetchEthUsdOracle),
    ]);
    logger.info('Prices cache warmed');
  } catch (e) {
    logger.warn('Prices cache warm failed:', e.message);
  }
}

// Delay slightly so contractService is fully initialized before we read it
setTimeout(warmCache, 2000);
setInterval(warmCache, CACHE_TTL_MARKET * 1000);

module.exports = router;
