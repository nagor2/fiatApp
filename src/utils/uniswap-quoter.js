/**
 * Получение котировок DFC через Uniswap V4 Quoter контракт
 * Основано на официальной документации: https://docs.uniswap.org/sdk/v4/guides/swaps/quoting
 */

/* global BigInt */

import * as ethers from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { UNISWAP_CONFIG } from './uniswap-config';
import { withFallback } from './rpc-provider';

const { Contract, formatUnits, parseUnits, ZeroAddress } = ethers;

// In-flight dedup + short TTL cache (30s) so multiple components share one RPC call.
const _cache = new Map(); // key → { promise, ts, result }
function _dedupedCall(key, ttlMs, fn) {
  const now = Date.now();
  const entry = _cache.get(key);
  if (entry) {
    if (entry.promise) return entry.promise;           // already in-flight
    if (now - entry.ts < ttlMs) return Promise.resolve(entry.result); // cached
  }
  const promise = fn().then(result => {
    _cache.set(key, { promise: null, ts: Date.now(), result });
    return result;
  }).catch(err => {
    _cache.delete(key);
    throw err;
  });
  _cache.set(key, { promise, ts: 0, result: null });
  return promise;
}

const DFC_TOKEN = new Token(
  UNISWAP_CONFIG.CHAIN_ID,
  UNISWAP_CONFIG.TOKENS.DFC,
  UNISWAP_CONFIG.TOKEN_INFO.DFC.decimals,
  UNISWAP_CONFIG.TOKEN_INFO.DFC.symbol,
  UNISWAP_CONFIG.TOKEN_INFO.DFC.name
);

const QUOTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              { "internalType": "Currency", "name": "currency0", "type": "address" },
              { "internalType": "Currency", "name": "currency1", "type": "address" },
              { "internalType": "uint24", "name": "fee", "type": "uint24" },
              { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
              { "internalType": "contract IHooks", "name": "hooks", "type": "address" }
            ],
            "internalType": "struct PoolKey",
            "name": "poolKey",
            "type": "tuple"
          },
          { "internalType": "bool", "name": "zeroForOne", "type": "bool" },
          { "internalType": "uint128", "name": "exactAmount", "type": "uint128" },
          { "internalType": "bytes", "name": "hookData", "type": "bytes" }
        ],
        "internalType": "struct IV4Quoter.QuoteExactSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "quoteExactInputSingle",
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" },
      { "internalType": "uint256", "name": "gasEstimate", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const STATE_VIEW_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"name": "currency0", "type": "address"},
          {"name": "currency1", "type": "address"},
          {"name": "fee", "type": "uint24"},
          {"name": "tickSpacing", "type": "int24"},
          {"name": "hooks", "type": "address"}
        ],
        "name": "poolKey",
        "type": "tuple"
      }
    ],
    "name": "getSlot0",
    "outputs": [
      {"name": "sqrtPriceX96", "type": "uint160"},
      {"name": "tick", "type": "int24"},
      {"name": "protocolFee", "type": "uint24"},
      {"name": "lpFee", "type": "uint24"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {"name": "currency0", "type": "address"},
          {"name": "currency1", "type": "address"},
          {"name": "fee", "type": "uint24"},
          {"name": "tickSpacing", "type": "int24"},
          {"name": "hooks", "type": "address"}
        ],
        "name": "poolKey",
        "type": "tuple"
      }
    ],
    "name": "getLiquidity",
    "outputs": [
      {"name": "liquidity", "type": "uint128"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// V4 StateView supports two overloads of getSlot0/getLiquidity:
//   - by full PoolKey struct (used above for DFC/ETH)
//   - by precomputed bytes32 poolId (used here for arbitrary pools, e.g. DFC/RLE,
//     where we know the pool ID but not the exact PoolKey params)
const STATE_VIEW_BY_ID_ABI = [
  {
    "inputs": [{"name": "poolId", "type": "bytes32"}],
    "name": "getSlot0",
    "outputs": [
      {"name": "sqrtPriceX96", "type": "uint160"},
      {"name": "tick", "type": "int24"},
      {"name": "protocolFee", "type": "uint24"},
      {"name": "lpFee", "type": "uint24"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "poolId", "type": "bytes32"}],
    "name": "getLiquidity",
    "outputs": [{"name": "liquidity", "type": "uint128"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const UNISWAP_V3_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function liquidity() external view returns (uint128)'
];

function createPoolConfig() {
  const NATIVE_ETH = ZeroAddress;
  
  return {
    poolKey: {
      currency0: NATIVE_ETH,
      currency1: DFC_TOKEN.address,
      fee: UNISWAP_CONFIG.POOL_SETTINGS.DFC_POOL.fee,
      tickSpacing: UNISWAP_CONFIG.POOL_SETTINGS.DFC_POOL.tickSpacing,
      hooks: UNISWAP_CONFIG.POOL_SETTINGS.DFC_POOL.hooks
    },
    zeroForOne: false,
    hookData: '0x',
    poolId: UNISWAP_CONFIG.POOLS.DFC_ETH_V4
  };
}

/**
 * Получить котировку DFC в ETH из Uniswap V4
 * @returns {Promise<{priceInETH: number, source: string, gasEstimate?: string}>}
 */
async function _getDfcPriceInEth() {
  try {
    console.log('🔄 Getting DFC quote from Uniswap V4 Quoter...');
    console.log(`   Quoter: ${UNISWAP_CONFIG.V4.QUOTER}`);
    console.log(`   Query: Price of 1 DFC in ETH`);
    
    const poolConfig = createPoolConfig();
    
    return await withFallback(async (provider) => {
      const quoterContract = new Contract(
        UNISWAP_CONFIG.V4.QUOTER,
        QUOTER_ABI,
        provider
      );
      
      const amountIn = parseUnits('1', DFC_TOKEN.decimals);
    
      console.log('📊 Request params:');
      console.log(`   currency0: ${poolConfig.poolKey.currency0} (Native ETH)`);
      console.log(`   currency1: ${poolConfig.poolKey.currency1} (DFC)`);
      console.log(`   fee: ${poolConfig.poolKey.fee}`);
      console.log(`   tickSpacing: ${poolConfig.poolKey.tickSpacing}`);
      console.log(`   hooks: ${poolConfig.poolKey.hooks}`);
      console.log(`   zeroForOne: ${poolConfig.zeroForOne} (DFC → ETH)`);
      console.log(`   amountIn: ${amountIn.toString()} wei (1 DFC)`);
      
      const params = {
        poolKey: poolConfig.poolKey,
        zeroForOne: poolConfig.zeroForOne,
        exactAmount: amountIn,
        hookData: poolConfig.hookData
      };
      
      console.log('🔍 Calling quoteExactInputSingle.staticCall(params)...');
      
      const result = await quoterContract.quoteExactInputSingle.staticCall(params);
      
      console.log('✅ Quote received from Quoter');
      console.log('   Result:', result);
      
      const amountOut = result[0];
      const gasEstimate = result[1];
      
      console.log(`   amountOut: ${amountOut.toString()}`);
      console.log(`   gasEstimate: ${gasEstimate.toString()}`);
      
      const priceInETH = Number(formatUnits(amountOut, 18));
      
      console.log(`✅ Price of 1 DFC:`);
      console.log(`   ${priceInETH.toFixed(8)} ETH`);
      console.log(`   Method: quoteExactInputSingle (V4 Quoter)`);
      console.log(`   Gas: ${gasEstimate.toString()}`);
      
      return {
        priceInETH: priceInETH,
        source: 'uniswap-v4-quoter',
        gasEstimate: gasEstimate.toString()
      };
    }, { timeout: 10000 });
    
  } catch (error) {
    console.error('❌ Error getting V4 quote:', error.message);
    console.log('   Reason:', error.code || error.reason || 'UNKNOWN');
    throw error;
  }
}

/**
 * Получить информацию о ликвидности пула DFC/ETH через StateView
 * @param {number} ethPriceUSD - цена ETH в USD для расчета TVL
 * @returns {Promise<{liquidity: string, sqrtPriceX96: string, tick: number, fee: number, amountETH: number, amountDFC: number, tvlUSD: number, source: string}>}
 */
async function _getPoolLiquidityInfo(ethPriceUSD = null) {
  try {
    console.log('🔄 Getting liquidity info for DFC/ETH pool via StateView...');
    
    const poolConfig = createPoolConfig();
    
    return await withFallback(async (provider) => {
      const stateViewContract = new Contract(
        UNISWAP_CONFIG.V4.STATE_VIEW,
        STATE_VIEW_ABI,
        provider
      );
      
      console.log(`   StateView address: ${UNISWAP_CONFIG.V4.STATE_VIEW}`);
      console.log(`   Pool ID: ${poolConfig.poolId.substring(0, 20)}...`);
      
      const [slot0Data, liquidityData] = await Promise.all([
        stateViewContract.getSlot0(poolConfig.poolKey),
        stateViewContract.getLiquidity(poolConfig.poolKey)
      ]);
      
      const liquidity = liquidityData.toString();
      const sqrtPriceX96 = slot0Data.sqrtPriceX96.toString();
      const tick = Number(slot0Data.tick);
      const lpFee = Number(slot0Data.lpFee);
      
      console.log(`✅ Data from StateView:`);
      console.log(`   Liquidity: ${liquidity}`);
      console.log(`   sqrtPriceX96: ${sqrtPriceX96}`);
      console.log(`   Tick: ${tick}`);
      console.log(`   LP Fee: ${lpFee} (${lpFee / 10000}%)`);
      
      if (liquidity === '0' || sqrtPriceX96 === '0') {
        console.warn('⚠️ Pool not initialized or empty');
        return {
          liquidity: '0',
          sqrtPriceX96: '0',
          tick: 0,
          fee: lpFee,
          amountETH: 0,
          amountDFC: 0,
          tvlUSD: 0,
          source: 'stateview-empty'
        };
      }
      
      const liquidityBigInt = BigInt(liquidity);
      const sqrtPriceX96BigInt = BigInt(sqrtPriceX96);
      const Q96 = BigInt(2) ** BigInt(96);
      
      const sqrtPrice = Number(sqrtPriceX96BigInt) / Number(Q96);
      
      const liquidityNum = Number(formatUnits(liquidityBigInt, 0));
      const amountETH = liquidityNum / sqrtPrice / (10 ** 18);
      const amountDFC = liquidityNum * sqrtPrice / (10 ** 18);
      
      console.log(`💰 Pool composition:`);
      console.log(`   ETH in pool: ${amountETH.toFixed(4)} ETH`);
      console.log(`   DFC in pool: ${amountDFC.toFixed(2)} DFC`);
      
      let tvlUSD = 0;
      if (ethPriceUSD && ethPriceUSD > 0) {
        const ethValueUSD = amountETH * ethPriceUSD;
        const dfcPriceUSD = (amountETH / amountDFC) * ethPriceUSD;
        const dfcValueUSD = amountDFC * dfcPriceUSD;
        tvlUSD = ethValueUSD + dfcValueUSD;
        
        console.log(`   ETH value: $${ethValueUSD.toFixed(2)}`);
        console.log(`   DFC value: $${dfcValueUSD.toFixed(2)}`);
        console.log(`   Total TVL: $${tvlUSD.toFixed(2)}`);
      }
      
      return {
        liquidity: liquidity,
        sqrtPriceX96: sqrtPriceX96,
        tick: tick,
        fee: lpFee,
        amountETH: amountETH,
        amountDFC: amountDFC,
        tvlUSD: tvlUSD,
        source: 'stateview-direct',
      };
    }, { timeout: 15000 });
    
  } catch (error) {
    console.error('❌ Error getting pool liquidity info:', error.message);
    throw error;
  }
}

/**
 * Получить информацию о токене DFC
 * @returns {Object}
 */
export function getDfcTokenInfo() {
  return {
    address: UNISWAP_CONFIG.TOKENS.DFC,
    symbol: UNISWAP_CONFIG.TOKEN_INFO.DFC.symbol,
    name: UNISWAP_CONFIG.TOKEN_INFO.DFC.name,
    decimals: UNISWAP_CONFIG.TOKEN_INFO.DFC.decimals,
    chainId: UNISWAP_CONFIG.CHAIN_ID,
    uniswapUrl: `https://app.uniswap.org/explore/tokens/ethereum/${UNISWAP_CONFIG.TOKENS.DFC}`,
    wethAddress: UNISWAP_CONFIG.TOKENS.WETH,
    poolId: UNISWAP_CONFIG.POOLS.DFC_ETH_V4
  };
}

/**
 * Получить цену ETH в USD из Uniswap V3 (через пул USDC/WETH)
 * @returns {Promise<{priceInUSD: number, source: string}>}
 */
async function _getEthPriceInUsd() {
  try {
    console.log('🔄 Getting ETH/USD price from Uniswap V3...');
    console.log(`   Pool: USDC/WETH (0.05% fee)`);
    
    return await withFallback(async (provider) => {
      const poolContract = new Contract(
        UNISWAP_CONFIG.POOLS.USDC_WETH_V3_005,
        UNISWAP_V3_POOL_ABI,
        provider
      );
      
      const [sqrtPriceX96, tick] = await poolContract.slot0();
      const token0 = await poolContract.token0();
      const token1 = await poolContract.token1();
      
      console.log(`   token0: ${token0}`);
      console.log(`   token1: ${token1}`);
      console.log(`   sqrtPriceX96: ${sqrtPriceX96.toString()}`);
      console.log(`   tick: ${tick}`);
      
      const isWETHToken0 = token0.toLowerCase() === UNISWAP_CONFIG.TOKENS.WETH.toLowerCase();
      
      const sqrtPriceX96BigInt = BigInt(sqrtPriceX96.toString());
      const Q96 = BigInt(2) ** BigInt(96);
      
      const priceRatio = Number(sqrtPriceX96BigInt) / Number(Q96);
      const price = priceRatio * priceRatio;
      
      console.log(`   priceRatio: ${priceRatio}`);
      console.log(`   price (token1/token0 raw): ${price}`);
      
      let ethPriceInUSD;
      
      if (isWETHToken0) {
        ethPriceInUSD = price * (10 ** 12);
        console.log(`   WETH is token0, USDC is token1`);
        console.log(`   Formula: price * 10^12`);
        console.log(`   ETH price: $${ethPriceInUSD.toFixed(2)}`);
      } else {
        ethPriceInUSD = 1 / (price / (10 ** 12));
        console.log(`   USDC is token0, WETH is token1`);
        console.log(`   Formula: 1 / (price / 10^12) = 10^12 / price`);
        console.log(`   ETH price: $${ethPriceInUSD.toFixed(2)}`);
      }
      
      console.log(`✅ ETH price: $${ethPriceInUSD.toFixed(2)}`);
      console.log(`   Source: Uniswap V3 USDC/WETH (0.05%)`);
      
      return {
        priceInUSD: ethPriceInUSD,
        source: 'uniswap-v3-usdc-weth',
        tick: tick
      };
    }, { timeout: 10000 });
    
  } catch (error) {
    console.error('❌ Error getting ETH/USD price:', error.message);
    throw error;
  }
}

/**
 * Получить slot0 + liquidity для произвольного V4 пула по его bytes32 poolId.
 * Не требует знания PoolKey — идеально для пулов, конфиг которых не
 * захардкожен (например DFC/RLE).
 */
async function getV4PoolStateById(poolId) {
  return withFallback(async (provider) => {
    const stateView = new Contract(
      UNISWAP_CONFIG.V4.STATE_VIEW,
      STATE_VIEW_BY_ID_ABI,
      provider
    );
    const [slot0, liquidity] = await Promise.all([
      stateView.getSlot0(poolId),
      stateView.getLiquidity(poolId),
    ]);
    return {
      sqrtPriceX96: slot0[0].toString(),
      tick: Number(slot0[1]),
      lpFee: Number(slot0[3]),
      liquidity: liquidity.toString(),
    };
  }, { timeout: 15000 });
}

/**
 * Цена 1 RLE в DFC и состав пула DFC/RLE (V4).
 *
 * Оба токена ERC20 с 18 decimals, поэтому поправки на decimals не нужны.
 * Направление (кто currency0) определяем по лексикографическому сравнению
 * адресов (canonical V4 ordering: currency0 < currency1).
 *
 * @param {string} rleAddress - адрес RLE токена (узнаётся из DAO в рантайме)
 * @returns {Promise<{priceRleInDfc:number, amountRle:number, amountDfc:number, liquidity:string, lpFee:number}>}
 */
async function _getRleDfcPoolInfo(rleAddress) {
  if (!rleAddress) {
    throw new Error('RLE address is required');
  }
  const state = await getV4PoolStateById(UNISWAP_CONFIG.POOLS.DFC_RLE_V4);

  const dfcAddr = UNISWAP_CONFIG.TOKENS.DFC.toLowerCase();
  const rleAddr = rleAddress.toLowerCase();
  const rleIsCurrency0 = rleAddr < dfcAddr;

  const sqrtBig = BigInt(state.sqrtPriceX96);
  const Q96 = BigInt(2) ** BigInt(96);

  if (sqrtBig === BigInt(0)) {
    return {
      priceRleInDfc: 0,
      amountRle: 0,
      amountDfc: 0,
      liquidity: '0',
      lpFee: state.lpFee,
    };
  }

  const sqrtPrice = Number(sqrtBig) / Number(Q96);
  const priceC1PerC0 = sqrtPrice * sqrtPrice;

  // priceC1PerC0 = сколько currency1 за 1 currency0 (в raw units, но decimals равны).
  const priceRleInDfc = rleIsCurrency0
    ? priceC1PerC0
    : (priceC1PerC0 > 0 ? 1 / priceC1PerC0 : 0);

  // Упрощённая оценка активной ликвидности в текущей цене:
  //   amount0 ≈ liquidity / sqrtPrice, amount1 ≈ liquidity * sqrtPrice.
  // Это не полная TVL диапазона, а ликвидность, доступная у текущей цены —
  // достаточно для pool volume / TVL-оценки карточки.
  const liq = Number(state.liquidity);
  const amount0 = liq / sqrtPrice / 1e18;
  const amount1 = liq * sqrtPrice / 1e18;
  const amountRle = rleIsCurrency0 ? amount0 : amount1;
  const amountDfc = rleIsCurrency0 ? amount1 : amount0;

  return {
    priceRleInDfc,
    amountRle,
    amountDfc,
    liquidity: state.liquidity,
    lpFee: state.lpFee,
  };
}

// ── Backend price API (Redis-cached, shared across all browser clients) ──
let _backendPricesCache = null;
let _backendPricesTs = 0;
const BACKEND_TTL = 25_000; // slightly under backend's 30s so we always get a fresh answer

async function _fetchBackendPrices(rleAddress) {
  const now = Date.now();
  if (_backendPricesCache && (now - _backendPricesTs) < BACKEND_TTL) {
    return _backendPricesCache;
  }
  const qs = rleAddress ? `?rle=${rleAddress}` : '';
  const resp = await fetch(`/api/prices${qs}`);
  if (!resp.ok) throw new Error(`/api/prices ${resp.status}`);
  const data = await resp.json();
  _backendPricesCache = data;
  _backendPricesTs = now;
  return data;
}

// Public exports — cached + deduped (30s TTL).
// Try backend API first (one shared RPC call server-side + Redis); fall back to direct RPC.
const TTL = 30_000;

export const getEthPriceInUsd = () => _dedupedCall('ethPriceInUsd', TTL, async () => {
  try {
    const d = await _fetchBackendPrices();
    if (d.ethUsd) return { priceInUSD: d.ethUsd, source: 'backend-cache' };
  } catch (_) {}
  return _getEthPriceInUsd();
});

export const getDfcPriceInEth = () => _dedupedCall('dfcPriceInEth', TTL, async () => {
  try {
    const d = await _fetchBackendPrices();
    if (d.dfcEth) return { priceInETH: d.dfcEth, source: 'backend-cache' };
  } catch (_) {}
  return _getDfcPriceInEth();
});

export const getRleDfcPoolInfo = (rleAddress) => _dedupedCall(`rleDfc:${rleAddress}`, TTL, async () => {
  try {
    const d = await _fetchBackendPrices(rleAddress);
    if (d.rleDfc) return d.rleDfc;
  } catch (_) {}
  return _getRleDfcPoolInfo(rleAddress);
});

export const getPoolLiquidityInfo = (ethPriceUSD) => _dedupedCall(`poolLiq:${ethPriceUSD}`, TTL, () => _getPoolLiquidityInfo(ethPriceUSD));

const uniswapQuoterModule = {
  getDfcPriceInEth,
  getPoolLiquidityInfo,
  getDfcTokenInfo,
  getEthPriceInUsd,
  getRleDfcPoolInfo,
};

export default uniswapQuoterModule;
