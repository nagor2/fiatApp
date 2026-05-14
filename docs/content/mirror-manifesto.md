# Mirror.xyz — Статья 1 (Манифест)

**Title:** The Stablecoin Problem Nobody Talks About

---

Every stablecoin in DeFi solves the same problem: volatility.

ETH goes up 40%, down 60%. You can't run a business on that. You can't save in that. So stablecoins emerged: park your value, avoid the swings.

But in solving volatility, they created a different problem. One that nobody talks about.

**They're all pegged to the dollar.**

DAI is the dollar. USDC is the dollar. LUSD is the dollar. Every "stable" coin in your wallet is just a digital version of a fiat currency that loses 3-7% of its value every year to inflation.

You escaped ETH volatility and walked straight into dollar debasement.

## The math nobody shows you

$10,000 in USDC in 2020. Today, after inflation, that's worth roughly $8,200 in real purchasing power. You didn't lose money. You just didn't gain any either — while real assets went up.

Meanwhile:
- Gold: +40% over the same period
- Oil: +60%
- Agricultural commodities: +35%

The things the dollar buys got more expensive. Your stablecoin stayed "stable" — denominated in a unit that was quietly shrinking.

## What a commodity-backed stablecoin actually means

DFC (DotFlat Coin) is pegged to a basket of real commodities — gold, crude oil, agricultural indices, metals, energy. Not the dollar. Not a single metal. A diversified basket of the things that make up the physical economy.

When the dollar inflates, commodities typically rise with it. Your DFC position holds real purchasing power, not nominal dollar value.

This is not a new idea. Central banks have held commodity reserves for centuries. It's just never been done permissionlessly on a public blockchain before.

## How it works on-chain

The DotFlat oracle tracks 34 commodity feeds: Gold (XAU), Silver (XAG), Crude Oil WTI, Brent Crude, Natural Gas, Copper, Aluminum, Zinc, Nickel, Wheat, Corn, Soybeans, Coffee, Cocoa, Sugar, Cotton, and more.

These prices are pushed on-chain to Ethereum mainnet on every significant price movement. No Chainlink dependency. The oracle node is open-source, the contracts are verified, every price update is a transaction you can look up on Etherscan. Full decentralization of the oracle is on the roadmap — the architecture is built for it.

To mint DFC, you deposit ETH as collateral (overcollateralized, like MakerDAO). The collateral ratio is maintained by the protocol, liquidations happen on-chain via an auction mechanism. A commit-reveal scheme to prevent MEV in liquidations is in active development.

## Why this matters for RWA

The $6.7T derivatives market is moving on-chain. Hyperliquid and Ostium are already running RWA perpetuals at scale. But both rely on permissioned oracle systems: Hyperliquid uses its own validator committee (which manually overrode the oracle during the JELLY incident in 2025), Ostium uses a custom pull-based oracle with a whitelist of data providers.

DotFlat is building toward a different model — open-source oracle node, on-chain contracts, verifiable price updates. Any protocol that wants to build commodity derivatives or commodity-backed instruments on Ethereum can consume our feeds directly.

We're not just building a stablecoin. We're building the price infrastructure for commodity DeFi.

## Current state

- 7 smart contracts deployed and verified on Ethereum mainnet
- 34 commodity price feeds updated on-chain continuously since 2025
- CDP system live: mint DFC by depositing ETH
- Uniswap V4 pool: DFC/ETH tradeable
- All contracts open-source, MIT licensed

This is not a whitepaper. This is a working protocol.

**GitHub:** https://github.com/nagor2/cryptoFiat  
**App:** https://beta.app.dotflat.io  
**Oracle:** On Ethereum mainnet, verifiable on Etherscan

---

*DotFlat is built by a single developer with no VC backing, no team allocation. A small community presale raised ~$10k from early supporters. Every DFC in circulation is backed by real ETH collateral.*
