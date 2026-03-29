/**
 * Получение данных о пуле Uniswap через Web3 из контекста
 * Использует StateView контракт вместо событий
 */

import * as ethers from 'ethers';
import { UNISWAP_CONFIG } from './uniswap-config';
import { withFallback } from './rpc-provider';

const { Contract, ZeroAddress } = ethers;

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

/**
 * Получить информацию о ликвидности пула через Web3 из контекста
 * @param {object} web3 - Web3 instance из контекста
 * @param {number} ethPriceUSD - цена ETH в USD
 * @returns {Promise<{amountETH: number, amountDFC: number, tvlUSD: number, liquidity: string, sqrtPriceX96: string, tick: number}>}
 */
export async function getPoolLiquidityViaWeb3(web3, ethPriceUSD = null) {
  try {
    console.log('🔄 Getting pool data via StateView contract...');
    
    const poolKey = {
      currency0: ZeroAddress,
      currency1: UNISWAP_CONFIG.TOKENS.DFC,
      fee: UNISWAP_CONFIG.POOL_SETTINGS.DFC_POOL.fee,
      tickSpacing: UNISWAP_CONFIG.POOL_SETTINGS.DFC_POOL.tickSpacing,
      hooks: UNISWAP_CONFIG.POOL_SETTINGS.DFC_POOL.hooks
    };
    
    console.log(`   StateView: ${UNISWAP_CONFIG.V4.STATE_VIEW}`);
    console.log(`   Pool: ETH/DFC`);
    
    return await withFallback(async (provider) => {
      const stateViewContract = new Contract(
        UNISWAP_CONFIG.V4.STATE_VIEW,
        STATE_VIEW_ABI,
        provider
      );
      
      const [slot0Data, liquidityData] = await Promise.all([
        stateViewContract.getSlot0(poolKey),
        stateViewContract.getLiquidity(poolKey)
      ]);
      
      const liquidity = liquidityData.toString();
      const sqrtPriceX96 = slot0Data.sqrtPriceX96.toString();
      const tick = Number(slot0Data.tick);
      const lpFee = Number(slot0Data.lpFee);
      
      console.log(`✅ Pool state from StateView:`);
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
          source: 'stateview-empty'
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
        source: 'stateview'
      };
    });
    
  } catch (error) {
    console.error('❌ Error getting pool data via Web3:', error.message);
    throw error;
  }
}

const uniswapPoolInfo = {
  getPoolLiquidityViaWeb3,
};

export default uniswapPoolInfo;
