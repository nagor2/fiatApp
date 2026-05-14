# paragraph.com — Newsletter #1

**Subject:** DotFlat Protocol Update #1 — Oracle live, Uniswap pool open, what's next

---

Hey,

Welcome to the first DotFlat protocol update. This is where I'll share what's happening on-chain, what we're building, and what's coming next. No hype, just facts and progress.

## What's live right now

**Oracle — 34 commodity feeds on Ethereum mainnet**

The DotFlat oracle has been running since 2025. It tracks 34 commodity price feeds and pushes them on-chain continuously. Every price update is a verifiable transaction on Ethereum. The oracle node is open-source — anyone can run their own.

Current feeds: Gold, Silver, Platinum, Palladium, Crude Oil WTI, Brent, Natural Gas, Heating Oil, Gasoline, Copper, Aluminum, Zinc, Nickel, Wheat, Corn, Soybeans, Coffee, Cocoa, Sugar, Cotton, and more.

**CDP system — mint DFC with ETH collateral**

The Collateralized Debt Position system is live on mainnet. Deposit ETH, mint DFC. Same overcollateralization model as MakerDAO, but DFC tracks commodity purchasing power instead of USD.

Contracts verified on Etherscan:
- CDP: 0xbCf58DE37791eFe60fE87a6d420FE8F7AEA99ef8
- DFC Token: 0x1F709Cfa0C409E158C68EdcD32453809c9Eb69EE
- Oracle: 0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B

**Uniswap V4 pool — DFC/ETH tradeable**

You can now buy and sell DFC on Uniswap V4 without opening a CDP. Direct swap, same as any other token.

→ https://beta.app.dotflat.io

## What we just open-sourced: Blockpulse

During DotFlat development, I built a block-watcher service that watches Ethereum contracts and invalidates Redis cache when transactions land. It's been running in production since 2025.

Last week I extracted it into a standalone open-source tool: **Blockpulse**.

If you're building a dApp backend that caches contract reads, Blockpulse replaces TTL-based expiry with event-driven invalidation. Cache lives forever, deleted only when on-chain state actually changes. Zero RPC calls during quiet periods.

→ https://github.com/nagor2/blockpulse

## What's coming next

- **Uniswap V4 hook** for commodity pairs — DFC/ETH pool with commodity-indexed pricing
- **DeFiLlama listing** — submitting this week
- **Improved CDP UI** — better position management interface
- **Oracle documentation** — technical docs for protocols wanting to use our feeds

## One ask

If you find DotFlat interesting, the most helpful thing you can do is share it with one person who builds in DeFi. No referral links, no rewards — just signal that this exists.

→ https://beta.app.dotflat.io

---

*DotFlat is built by a solo developer. No VC, no team tokens. A small community presale raised ~$10k from early supporters. Just code and ETH collateral.*

*Unsubscribe anytime.*
