# Mirror.xyz — Статья 2

**Title:** RWA Perps: The $6.7T Market Running on Centralized Oracles

---

$6.7 trillion. That's the DEX derivatives volume in the last year — up 346% year over year.

44% of Hyperliquid's volume is RWA assets. Traders are speculating on gold, oil, FX, equities — all on-chain. The market exists. It's massive. It's growing.

There's one problem: every single one of these protocols uses centralized price oracles.

## What centralized means in practice

Hyperliquid computes oracle prices via its own validator committee — a weighted median of CEX prices (Binance, OKX, Bybit, and others) submitted every 3 seconds. It looks decentralized until something goes wrong: during the JELLY incident in March 2025, the validator committee manually overrode the oracle and delisted the market via a governance vote. Users had no recourse.

Ostium uses a custom pull-based oracle with a whitelist of approved data providers. Chainlink Data Streams handles crypto assets. Both systems require trusting a permissioned set of entities.

This works fine for today's volumes. It won't work when real institutional money is at stake and someone needs to audit exactly who controls the price feed and under what conditions it can be overridden.

For a stablecoin, this is existential. If your peg depends on a price feed controlled by a small group of entities, it's not truly decentralized collateral. It's a gentlemen's agreement dressed in smart contracts.

## A different approach

DotFlat's oracle is built with decentralization as the design goal.

The oracle node is open-source. It reads commodity prices from public data sources, aggregates them, and pushes transactions to a smart contract on Ethereum mainnet. The contracts are verified on Etherscan — every price update is a public transaction anyone can audit.

Currently the oracle runs on a single node. Decentralization — multiple independent nodes, median aggregation, permissionless participation — is the explicit roadmap. The architecture supports it from day one: the contract already accepts pushes from authorized addresses, and the authorization list is governed on-chain.

The direction is clear: toward a model where anyone can run a node and contribute to price discovery. No whitelist, no governance permission needed. This is how Bitcoin mining works. This is how Ethereum validators work. It's the only model that's credibly neutral at scale.

## The 34 feeds

Our oracle currently tracks:

**Precious Metals:** Gold (XAU/USD), Silver (XAG/USD), Platinum, Palladium

**Energy:** Crude Oil WTI, Brent Crude, Natural Gas, Heating Oil, Gasoline RBOB, London Gas Oil

**Base Metals:** Copper (COMEX), Copper (London), Aluminum, Zinc, Nickel

**Grains:** US Wheat, US Corn, US Soybeans, Soybean Oil, Soybean Meal, Oats, Rough Rice

**Softs:** Coffee C, London Coffee, Sugar, Cocoa, Cotton, Orange Juice, Lumber

**Livestock:** Live Cattle, Lean Hogs, Feeder Cattle

All pushing on-chain, all verifiable on Etherscan.

## What we're building toward

The vision isn't just DFC the stablecoin. It's commodity price infrastructure for all of DeFi.

**Phase 1** — Done: Oracle live, 34 feeds, DFC mintable via CDP, Uniswap pool.

**Phase 2** — In progress: Uniswap V4 hook for commodity pairs (DFC/ETH with commodity-indexed pricing), enabling commodity-backed liquidity positions.

**Phase 3** — Roadmap: Permissionless commodity perps built on top of our oracle. Anyone can create a Gold/ETH or Oil/ETH perpetual using our price feeds. No permission required.

This is the infrastructure layer for commodity DeFi. We're not competing with Hyperliquid. We're the oracle they should be using.

## Why now

The RWA narrative is here. TradFi is onboarding. Institutions want commodity exposure on-chain. They'll need price feeds they can audit, verify, and run themselves.

Centralized oracles work for today's market. They won't work when real money is at stake.

**App:** https://beta.app.dotflat.io  
**Oracle contracts:** Verified on Etherscan mainnet  
**GitHub:** https://github.com/nagor2/cryptoFiat
