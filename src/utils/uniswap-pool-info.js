/**
 * Получение данных о пуле Uniswap через Web3 из контекста
 * Решение для CORS проблем - используем локальный Web3 provider
 */

import { UNISWAP_CONFIG } from './uniswap-config';

const SWAP_EVENT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "id", "type": "bytes32"},
      {"indexed": true, "name": "sender", "type": "address"},
      {"indexed": false, "name": "amount0", "type": "int128"},
      {"indexed": false, "name": "amount1", "type": "int128"},
      {"indexed": false, "name": "sqrtPriceX96", "type": "uint160"},
      {"indexed": false, "name": "liquidity", "type": "uint128"},
      {"indexed": false, "name": "tick", "type": "int24"},
      {"indexed": false, "name": "fee", "type": "uint24"}
    ],
    "name": "Swap",
    "type": "event"
  }
];

/**
 * Получить информацию о ликвидности пула через Web3 из контекста
 * @param {object} web3 - Web3 instance из контекста
 * @param {number} ethPriceUSD - цена ETH в USD
 * @returns {Promise<{amountETH: number, amountDFC: number, tvlUSD: number, liquidity: string, sqrtPriceX96: string, tick: number}>}
 */
export async function getPoolLiquidityViaWeb3(web3, ethPriceUSD = null) {
  try {
    console.log('🔄 Getting pool data via Swap events (Web3)...');
    
    if (!web3) {
      throw new Error('Web3 not initialized');
    }
    
    const poolManagerContract = new web3.eth.Contract(
      SWAP_EVENT_ABI,
      UNISWAP_CONFIG.V4.POOL_MANAGER
    );
    
    console.log(`   Pool Manager: ${UNISWAP_CONFIG.V4.POOL_MANAGER}`);
    console.log(`   Pool ID: ${UNISWAP_CONFIG.POOLS.DFC_ETH_V4.substring(0, 20)}...`);
    
    const currentBlock = await web3.eth.getBlockNumber();
    const fromBlock = Math.max(0, Number(currentBlock) - 100000);
    
    console.log(`   Fetching Swap events from block ${fromBlock} to ${currentBlock}...`);
    
    const events = await poolManagerContract.getPastEvents('Swap', {
      filter: { id: UNISWAP_CONFIG.POOLS.DFC_ETH_V4 },
      fromBlock: fromBlock,
      toBlock: 'latest'
    });
    
    console.log(`   Found ${events.length} Swap events for DFC/ETH pool`);
    
    if (events.length === 0) {
      console.warn('⚠️ No Swap events found');
      return {
        liquidity: '0',
        sqrtPriceX96: '0',
        tick: 0,
        fee: 3000,
        amountETH: 0,
        amountDFC: 0,
        tvlUSD: 0,
        source: 'web3-no-events'
      };
    }
    
    const lastSwap = events[events.length - 1];
    const returnValues = lastSwap.returnValues;
    
    const liquidity = returnValues.liquidity.toString();
    const sqrtPriceX96 = returnValues.sqrtPriceX96.toString();
    const tick = Number(returnValues.tick);
    const lpFee = Number(returnValues.fee);
    
    console.log(`✅ Last Swap event (block ${lastSwap.blockNumber}):`);
    console.log(`   Liquidity: ${liquidity}`);
    console.log(`   sqrtPriceX96: ${sqrtPriceX96}`);
    console.log(`   Tick: ${tick}`);
    console.log(`   Fee: ${lpFee} (${lpFee / 10000}%)`);
    
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
        source: 'web3-events-empty'
      };
    }
    
    // eslint-disable-next-line no-undef
    const liquidityBigInt = BigInt(liquidity);
    // eslint-disable-next-line no-undef
    const sqrtPriceX96BigInt = BigInt(sqrtPriceX96);
    // eslint-disable-next-line no-undef
    const Q96 = BigInt(2) ** BigInt(96);
    
    const sqrtPrice = Number(sqrtPriceX96BigInt) / Number(Q96);
    
    const liquidityNum = Number(liquidityBigInt);
    
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
      source: 'web3-events',
      blockNumber: lastSwap.blockNumber
    };
    
  } catch (error) {
    console.error('❌ Error getting pool data via Web3:', error.message);
    throw error;
  }
}

export default {
  getPoolLiquidityViaWeb3,
};
