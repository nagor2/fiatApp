/**
 * Конфигурация Uniswap для Dotflat
 */

export const UNISWAP_CONFIG = {
  // Адреса токенов
  TOKENS: {
    ETH: '0x0000000000000000000000000000000000000000',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    DFC: '0x1f709cfa0c409e158c68edcd32453809c9eb69ee',
  },
  
  // Информация о токенах
  TOKEN_INFO: {
    ETH: {
      decimals: 18,
      symbol: 'ETH',
      name: 'Ether',
    },
    WETH: {
      decimals: 18,
      symbol: 'WETH',
      name: 'Wrapped Ether',
    },
    USDC: {
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
    },
    DFC: {
      decimals: 18,
      symbol: 'DFC',
      name: 'Dotflat',
    },
  },
  
  // Uniswap V3 контракты
  V3: {
    FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    POSITION_MANAGER: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  },
  
  // Uniswap V4 контракты
  V4: {
    POOL_MANAGER: '0x000000000004444c5dc75cB358380D2e3dE08A90',
    QUOTER: '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203',
    STATE_VIEW: '0x7ffe42c4a5deea5b0fec41c94c136cf115597227',
    UNIVERSAL_ROUTER: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
  },
  
  // Адреса пулов ликвидности
  POOLS: {
    DFC_ETH_V4: '0xCA0A1A9AB72C583A8CCD487E6D8C75BCC62F9792B4C8C5AEDD1707FE2B8BD3CF',
    DFC_RLE_V4: '0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044',
    USDC_WETH_V3_005: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    USDC_WETH_V3_03: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
  },
  
  // Настройки пулов
  POOL_SETTINGS: {
    DFC_POOL: {
      fee: 3000,
      tickSpacing: 60,
      hooks: '0x0000000000000000000000000000000000000000',
    },
  },
  
  // Chain ID
  CHAIN_ID: 1, // Ethereum Mainnet
  
  // Explorer
  EXPLORER_URL: 'https://etherscan.io',
};

export default UNISWAP_CONFIG;
