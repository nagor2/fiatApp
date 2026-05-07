const express = require('express');
const { Web3 } = require('web3');
const cacheService = require('../services/cacheService');
const contractService = require('../services/contractService');
const logger = require('../utils/logger');

const router = express.Router();
const CACHE_TTL_MARKET = 30;  // seconds — market prices (ETH/USD, Uniswap pools)
const CACHE_TTL_ORACLE = 300; // seconds — oracle DFC index (only changes on-chain tx)

// ── Addresses ─────────────────────────────────────────────────────────────
const USDC_WETH_POOL  = '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640';
const V4_QUOTER       = '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203';
const V4_STATE_VIEW   = '0x7ffe42c4a5deea5b0fec41c94c136cf115597227';
const DFC_ADDRESS     = '0x1f709cfa0c409e158c68edcd32453809c9eb69ee';
const DFC_RLE_POOL_ID = '0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044';
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

// ── RPC web3 instance (separate from contractService — no SDK dependency) ─
let _web3 = null;
function getWeb3() {
  if (!_web3) {
    _web3 = new Web3(process.env.RPC_URL || 'https://ethereum-rpc.publicnode.com');
  }
  return _web3;
}

// ── Fetchers ──────────────────────────────────────────────────────────────
async function fetchEthUsd() {
  const web3 = getWeb3();
  const pool = new web3.eth.Contract(SLOT0_ABI, USDC_WETH_POOL);
  const s = await pool.methods.slot0().call();
  const sqrtPrice = Number(BigInt(s.sqrtPriceX96)) / Number(BigInt(2) ** BigInt(96));
  const price = sqrtPrice * sqrtPrice; // USDC per WETH in raw (USDC=6dec, WETH=18dec)
  // USDC is token0 (6 dec), WETH is token1 (18 dec):
  // priceWETH/USDC = price * 10^12  (price is in USDC units per WETH unit, raw)
  const ethUsd = price * 1e12;
  return Math.round(ethUsd * 100) / 100;
}

async function fetchDfcEth() {
  const web3 = getWeb3();
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
}

async function fetchRleDfcPool(rleAddress) {
  const web3 = getWeb3();
  const sv = new web3.eth.Contract(V4_STATE_SLOT0_ABI, V4_STATE_VIEW);
  const [slot0, liquidity] = await Promise.all([
    sv.methods.getSlot0(DFC_RLE_POOL_ID).call(),
    sv.methods.getLiquidity(DFC_RLE_POOL_ID).call(),
  ]);
  const sqrtBig = BigInt(slot0.sqrtPriceX96);
  const Q96 = BigInt(2) ** BigInt(96);
  const sqrtPrice = Number(sqrtBig) / Number(Q96);
  const priceC1PerC0 = sqrtPrice * sqrtPrice;
  const rleIsCurrency0 = rleAddress.toLowerCase() < DFC_ADDRESS.toLowerCase();
  const priceRleInDfc = rleIsCurrency0 ? priceC1PerC0 : (priceC1PerC0 > 0 ? 1 / priceC1PerC0 : 0);
  return {
    priceRleInDfc,
    sqrtPriceX96: slot0.sqrtPriceX96.toString(),
    tick: Number(slot0.tick),
    lpFee: Number(slot0.lpFee),
    liquidity: liquidity.toString(),
  };
}

// Fetch DFC index from the on-chain oracle contract (already initialized by contractService).
async function fetchDfcIndex() {
  const oracle = contractService.contracts?.oracle;
  if (!oracle) throw new Error('oracle contract not ready');
  const [price, decimals] = await Promise.all([
    oracle.methods.getPrice('dfc').call(),
    oracle.methods.getDecimals('dfc').call(),
  ]);
  return Number(BigInt(price)) / 10 ** Number(decimals);
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function cachedFetch(key, ttl, fn) {
  try {
    const cached = await cacheService.get(key);
    if (cached) return cached;
  } catch (_) {}

  const result = await fn();

  try {
    await cacheService.set(key, result, ttl);
  } catch (_) {}

  return result;
}

// ── Routes ────────────────────────────────────────────────────────────────
// GET /api/prices — returns ETH/USD, DFC/ETH, and optionally RLE/DFC
// Query params: rle=<address>  (optional, enables RLE/DFC pricing)
// GET /api/prices
// Query params: rle=<address>  (optional — enables RLE/DFC pricing)
//
// Cache-Control strategy:
//   dfcIndex — oracle value, only changes on blockchain tx → 5 min browser cache
//   market prices — AMM / Etherscan, change frequently → 60 s browser cache
//   stale-while-revalidate lets the browser serve stale data while refetching in bg
router.get('/', async (req, res) => {
  try {
    const rleAddress = req.query.rle || null;

    const [ethUsd, dfcEth, dfcIndex] = await Promise.allSettled([
      cachedFetch('price:eth_usd',   CACHE_TTL_MARKET, fetchEthUsd),
      cachedFetch('price:dfc_eth',   CACHE_TTL_MARKET, fetchDfcEth),
      cachedFetch('price:dfc_index', CACHE_TTL_ORACLE, fetchDfcIndex),
    ]);

    const response = {
      ethUsd:   ethUsd.status   === 'fulfilled' ? ethUsd.value   : null,
      dfcEth:   dfcEth.status   === 'fulfilled' ? dfcEth.value   : null,
      dfcIndex: dfcIndex.status === 'fulfilled' ? dfcIndex.value : null,
      dfcUsd:   null,
      rleDfc:   null,
      rleUsd:   null,
      ts:       Date.now(),
    };

    if (response.ethUsd && response.dfcEth) {
      response.dfcUsd = response.dfcEth * response.ethUsd;
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

    // dfcIndex is oracle-sourced — valid for 5 min in browser.
    // Market prices rotate every 60 s; stale-while-revalidate covers the gap.
    const maxAge = response.dfcIndex != null ? CACHE_TTL_ORACLE : CACHE_TTL_MARKET;
    res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 4}`);
    res.json(response);
  } catch (err) {
    logger.error('Prices route error:', err.message);
    res.status(500).json({ error: 'price fetch failed', message: err.message });
  }
});

module.exports = router;
