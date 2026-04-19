/**
 * Получение ликвидности пула через прямой RPC вызов (без ethers provider)
 */

/* global BigInt */

import * as ethers from 'ethers';
import { UNISWAP_CONFIG } from './uniswap-config';

const { ZeroAddress } = ethers;

// Публичные RPC как fallback на случай, если /api/rpc (nginx прокси) вернёт 503.
// Порядок: nginx-прокси (быстрее, если жив), затем напрямую в публичные ноды.
const RPC_ENDPOINTS = [
  '/api/rpc',
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
];

async function rpcCall(body, timeoutMs = 5000) {
  let lastError = null;
  for (const endpoint of RPC_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        throw new Error(`Non-JSON response (content-type: ${ct})`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      return data;
    } catch (error) {
      lastError = error;
      console.warn(`[RPC] ${endpoint} failed: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('All RPC endpoints failed');
}

const STATE_VIEW_ABI = [
  {
    "inputs": [
      {"name": "poolId", "type": "bytes32"}
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
      {"name": "poolId", "type": "bytes32"}
    ],
    "name": "getLiquidity",
    "outputs": [
      {"name": "liquidity", "type": "uint128"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export async function getPoolSwaps(limit = 10) {
  try {
    console.log(`🔄 Getting last ${limit} swaps from DFC/ETH pool...`);
    
    const poolId = UNISWAP_CONFIG.POOLS.DFC_ETH_V4;
    const poolManagerAddress = UNISWAP_CONFIG.V4.POOL_MANAGER;
    
    console.log('   Pool Manager:', poolManagerAddress);
    console.log('   Pool ID:', poolId);
    
    // Swap event signature
    const swapEventSignature = ethers.id('Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)');
    
    const blockResult = await rpcCall({
      jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1,
    });
    const currentBlock = parseInt(blockResult.result, 16);
    const fromBlock = Math.max(0, currentBlock - 49999);

    console.log(`   Fetching from block ${fromBlock} to ${currentBlock}...`);

    const logsResult = await rpcCall({
      jsonrpc: '2.0',
      method: 'eth_getLogs',
      params: [{
        address: poolManagerAddress,
        topics: [swapEventSignature, poolId],
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: 'latest',
      }],
      id: 2,
    });

    const logs = logsResult.result || [];
    console.log(`   Found ${logs.length} Swap events`);
    
    if (logs.length === 0) {
      return [];
    }
    
    // Декодируем события
    const swapABI = ['event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)'];
    const iface = new ethers.Interface(swapABI);
    
    const swaps = logs.slice(-limit).map(log => {
      const decoded = iface.parseLog(log);
      return {
        blockNumber: parseInt(log.blockNumber, 16),
        txHash: log.transactionHash,
        sender: decoded.args.sender,
        amount0: decoded.args.amount0.toString(),
        amount1: decoded.args.amount1.toString(),
        sqrtPriceX96: decoded.args.sqrtPriceX96.toString(),
        liquidity: decoded.args.liquidity.toString(),
        tick: Number(decoded.args.tick),
        fee: Number(decoded.args.fee)
      };
    });
    
    console.log('✅ Last', swaps.length, 'swaps retrieved');
    return swaps;
    
  } catch (error) {
    console.error('❌ Error getting swaps:', error.message);
    throw error;
  }
}

export async function getPoolLiquidityDirect(ethPriceUSD = null) {
  try {
    console.log('🔄 Getting pool liquidity via direct RPC...');
    
    const stateViewAddress = UNISWAP_CONFIG.V4.STATE_VIEW;
    const poolId = UNISWAP_CONFIG.POOLS.DFC_ETH_V4;
    
    console.log('   StateView:', stateViewAddress);
    console.log('   Pool ID:', poolId);
    
    const iface = new ethers.Interface(STATE_VIEW_ABI);
    
    const getSlot0Data = iface.encodeFunctionData('getSlot0', [poolId]);
    const getLiquidityData = iface.encodeFunctionData('getLiquidity', [poolId]);
    
    console.log('   getSlot0 calldata:', getSlot0Data);
    console.log('   Calling eth_call via RPC chain (/api/rpc → publicnode → llamarpc)...');

    const [slot0Result, liquidityResult] = await Promise.all([
      rpcCall({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: stateViewAddress, data: getSlot0Data }, 'latest'],
        id: 1,
      }),
      rpcCall({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: stateViewAddress, data: getLiquidityData }, 'latest'],
        id: 2,
      }),
    ]);

    const slot0 = iface.decodeFunctionResult('getSlot0', slot0Result.result);
    const liq = iface.decodeFunctionResult('getLiquidity', liquidityResult.result);
    
    const liquidity = liq[0].toString();
    const sqrtPriceX96 = slot0.sqrtPriceX96.toString();
    const tick = Number(slot0.tick);
    const lpFee = Number(slot0.lpFee);
    
    console.log('✅ Pool data:');
    console.log('   Liquidity:', liquidity);
    console.log('   sqrtPriceX96:', sqrtPriceX96);
    console.log('   Tick:', tick);
    console.log('   Fee:', lpFee);
    
    if (liquidity === '0' || sqrtPriceX96 === '0') {
      return {
        liquidity: '0',
        sqrtPriceX96: '0',
        tick: 0,
        fee: lpFee,
        amountETH: 0,
        amountDFC: 0,
        tvlUSD: 0,
        source: 'rpc-empty'
      };
    }
    
    const liqBigInt = BigInt(liquidity);
    const priceBigInt = BigInt(sqrtPriceX96);
    const Q96 = BigInt(2) ** BigInt(96);
    
    const sqrtPrice = Number(priceBigInt) / Number(Q96);
    const liqNum = Number(liqBigInt);
    
    const amountETH = liqNum / sqrtPrice / (10 ** 18);
    const amountDFC = liqNum * sqrtPrice / (10 ** 18);
    
    console.log('💰 Pool:', amountETH.toFixed(4), 'ETH,', amountDFC.toFixed(2), 'DFC');
    
    let tvlUSD = 0;
    if (ethPriceUSD > 0) {
      tvlUSD = (amountETH * 2) * ethPriceUSD;
      console.log('   TVL: $' + tvlUSD.toFixed(2));
    }
    
    return {
      liquidity,
      sqrtPriceX96,
      tick,
      fee: lpFee,
      amountETH,
      amountDFC,
      tvlUSD,
      source: 'rpc-direct'
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}
