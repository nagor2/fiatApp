/**
 * Получение данных о пуле Uniswap через block-watcher API
 * Решение для CORS проблем - используем локальный API
 */

import { UNISWAP_CONFIG } from './uniswap-config';

const BLOCK_WATCHER_URL = 'http://localhost:3002';

/**
 * Получить информацию о ликвидности пула DFC/ETH через события Swap
 * @param {number} ethPriceUSD - цена ETH в USD
 * @returns {Promise<{amountETH: number, amountDFC: number, tvlUSD: number, liquidity: string, sqrtPriceX96: string, tick: number}>}
 */
export async function getPoolLiquidityFromBlockWatcher(ethPriceUSD = null) {
  try {
    console.log('🔄 Getting pool data via block-watcher API...');
    
    const poolManagerAddress = UNISWAP_CONFIG.V4.POOL_MANAGER;
    const poolId = UNISWAP_CONFIG.POOLS.DFC_ETH_V4;
    
    console.log(`   Pool Manager: ${poolManagerAddress}`);
    console.log(`   Pool ID: ${poolId.substring(0, 20)}...`);
    
    const response = await fetch(`${BLOCK_WATCHER_URL}/api/events/${poolManagerAddress}?event=Swap`);
    
    if (!response.ok) {
      throw new Error(`Block-watcher API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📊 Block-watcher response:', data);
    
    if (!data.events || data.events.length === 0) {
      console.warn('⚠️ No Swap events found');
      return {
        amountETH: 0,
        amountDFC: 0,
        tvlUSD: 0,
        liquidity: '0',
        sqrtPriceX96: '0',
        tick: 0,
        fee: 3000,
        source: 'block-watcher-no-events'
      };
    }
    
    const swapEvents = data.events.filter(event => {
      const eventPoolId = event.returnValues?.id;
      return eventPoolId && eventPoolId.toLowerCase() === poolId.toLowerCase();
    });
    
    if (swapEvents.length === 0) {
      console.warn(`⚠️ No Swap events for pool ${poolId.substring(0, 20)}...`);
      return {
        amountETH: 0,
        amountDFC: 0,
        tvlUSD: 0,
        liquidity: '0',
        sqrtPriceX96: '0',
        tick: 0,
        fee: 3000,
        source: 'block-watcher-no-pool-events'
      };
    }
    
    const lastSwap = swapEvents[swapEvents.length - 1];
    const returnValues = lastSwap.returnValues;
    
    const liquidity = returnValues.liquidity;
    const sqrtPriceX96 = returnValues.sqrtPriceX96;
    const tick = parseInt(returnValues.tick);
    const fee = parseInt(returnValues.fee);
    
    console.log(`✅ Last swap data (block ${lastSwap.blockNumber}):`);
    console.log(`   Liquidity: ${liquidity}`);
    console.log(`   sqrtPriceX96: ${sqrtPriceX96}`);
    console.log(`   Tick: ${tick}`);
    console.log(`   Fee: ${fee}`);
    
    const liquidityBigInt = BigInt(liquidity);
    const sqrtPriceX96BigInt = BigInt(sqrtPriceX96);
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
      fee: fee,
      amountETH: amountETH,
      amountDFC: amountDFC,
      tvlUSD: tvlUSD,
      source: 'block-watcher-api',
      blockNumber: lastSwap.blockNumber
    };
    
  } catch (error) {
    console.error('❌ Error getting pool data from block-watcher:', error.message);
    throw error;
  }
}

export default {
  getPoolLiquidityFromBlockWatcher,
};
