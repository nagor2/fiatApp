// DeFiLlama adapter for DotFlat protocol
// Submit this file as: projects/dotflat/index.js
// in the DefiLlama/DefiLlama-Adapters repository

const sdk = require("@defillama/sdk");

const CDP_ADDRESS = "0xbCf58DE37791eFe60fE87a6d420FE8F7AEA99ef8";
const DEPOSIT_ADDRESS = "0x44881F5ac2938AAaF4260d7DBE18997318788f9f";
const DFC_ADDRESS = "0x1F709Cfa0C409E158C68EdcD32453809c9Eb69EE";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Uniswap V4
const POOL_MANAGER = "0x000000000004444c5dc75cB358380D2e3dE08A90";
const STATE_VIEW = "0x7ffe42c4a5deea5b0fec41c94c136cf115597227";
const DFC_ETH_POOL_ID = "0xCA0A1A9AB72C583A8CCD487E6D8C75BCC62F9792B4C8C5AEDD1707FE2B8BD3CF";

const STATE_VIEW_ABI = {
  getLiquidity: "function getLiquidity(bytes32 poolId) view returns (uint128 liquidity)",
  getSlot0: "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
};

// TVL: ETH locked as collateral in CDP positions
async function tvl(api) {
  const ethBalance = await sdk.api.eth.getBalance({
    target: CDP_ADDRESS,
    block: api.block,
  });
  api.add("0x0000000000000000000000000000000000000000", ethBalance.output);
}

// Staking: DFC locked in Deposit contract (yield deposits)
async function staking(api) {
  const dfcBalance = await sdk.api.erc20.balanceOf({
    target: DFC_ADDRESS,
    owner: DEPOSIT_ADDRESS,
    block: api.block,
  });
  api.add(DFC_ADDRESS, dfcBalance.output);
}

// Pool2: DFC/ETH liquidity in Uniswap V4 pool
// Reads token balances from PoolManager that belong to our pool
// using sqrtPriceX96 + liquidity from StateView
async function pool2(api) {
  const [slot0, liquidity] = await Promise.all([
    sdk.api.abi.call({
      target: STATE_VIEW,
      abi: STATE_VIEW_ABI.getSlot0,
      params: [DFC_ETH_POOL_ID],
      block: api.block,
    }),
    sdk.api.abi.call({
      target: STATE_VIEW,
      abi: STATE_VIEW_ABI.getLiquidity,
      params: [DFC_ETH_POOL_ID],
      block: api.block,
    }),
  ]);

  const sqrtPriceX96 = BigInt(slot0.output.sqrtPriceX96);
  const L = BigInt(liquidity.output);
  const Q96 = BigInt(2 ** 96);

  // ETH amount: L * Q96 / sqrtPriceX96
  // DFC amount: L * (sqrtPriceX96 - sqrtPriceLower) / Q96
  // For full-range position approximation (tick -887272 to 887272):
  const ethAmount = (L * Q96) / sqrtPriceX96;
  const dfcAmount = (L * sqrtPriceX96) / Q96;

  api.add("0x0000000000000000000000000000000000000000", ethAmount.toString());
  api.add(DFC_ADDRESS, dfcAmount.toString());
}

module.exports = {
  methodology:
    "TVL counts ETH collateral locked in CDP positions. Staking counts DFC locked in yield deposit contracts. Pool2 counts DFC/ETH liquidity in the Uniswap V4 pool.",
  ethereum: {
    tvl,
    staking,
    pool2,
  },
};
