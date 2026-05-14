# Dev.to — Статья 2 (Техническая)

**Title:** How We Built a Permissionless Commodity Oracle on Ethereum

---

Most DeFi protocols need price feeds. Most of them use Chainlink.

Chainlink is great for crypto pairs. But for commodity prices — oil, wheat, lumber, coffee — the coverage is thin. And even where it exists, you're trusting a closed set of data providers that Chainlink governance controls.

We needed 34 commodity feeds for DotFlat's stablecoin protocol. Here's how we built them.

## The design constraints

We had three requirements:

1. **Permissionless** — anyone should be able to run the oracle node, not just us
2. **Chainlink-compatible** — implement `AggregatorV3Interface` so any protocol can consume our feeds without changes
3. **Manipulation-resistant** — price can't jump 50% in one block

## The architecture

```
  Public data sources (investing.com, financial APIs)
        │
        ▼
  ┌─────────────────┐
  │   Oracle Node   │  (open-source Node.js, anyone can run)
  │                 │
  │  Parse prices   │
  │  Validate       │
  │  Sign tx        │
  └────────┬────────┘
           │ pushPrice(feed, price, timestamp)
           ▼
  ┌─────────────────────────────────┐
  │   ExchangeRate.sol              │
  │   (Ethereum mainnet)            │
  │                                 │
  │  - Stores latest price per feed │
  │  - Implements AggregatorV3      │
  │  - Bounds check on every update │
  └─────────────────────────────────┘
           │
           ▼
  Any DeFi protocol via latestRoundData()
```

## The oracle node

The node is a Node.js script that:

1. Reads commodity prices from public financial data sources
2. Checks if the price has moved more than the threshold (default: 0.1%)
3. If yes, submits a transaction to the on-chain contract

```js
async function checkAndUpdate(feed) {
  const currentPrice = await fetchPrice(feed.symbol);
  const lastOnChainPrice = await contract.methods.latestAnswer(feed.id).call();

  const deviation = Math.abs(currentPrice - lastOnChainPrice) / lastOnChainPrice;

  if (deviation > DEVIATION_THRESHOLD) {
    await submitPrice(feed.id, currentPrice);
  }
}
```

Price updates only happen when prices actually change. This keeps gas costs low — no spam updates every block.

## Manipulation protection

The on-chain contract rejects updates that move the price more than a configured maximum per update (e.g., 15% for most commodities, 5% for stable commodities like lumber):

```solidity
function pushPrice(uint256 feedId, int256 price) external onlyOracle {
    int256 lastPrice = feeds[feedId].price;
    int256 maxMove = (lastPrice * int256(maxPriceMovePct)) / 100;

    require(
        price >= lastPrice - maxMove && price <= lastPrice + maxMove,
        "Price move exceeds maximum"
    );

    feeds[feedId] = Feed(price, block.timestamp, roundId++);
    emit PriceUpdated(feedId, price, block.timestamp);
}
```

A flash loan attack can't move the oracle price 50% in one block. The contract simply rejects it.

## AggregatorV3 compatibility

```solidity
function latestRoundData() external view returns (
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
) {
    Feed memory f = feeds[activeFeed];
    return (f.roundId, f.price, f.updatedAt, f.updatedAt, f.roundId);
}
```

Any protocol that consumes Chainlink feeds can swap in our contract address and get commodity prices with zero code changes.

## The 34 feeds

Precious metals, energy (WTI, Brent, Natural Gas, Heating Oil, Gasoline, London Gas Oil), base metals (Copper, Aluminum, Zinc, Nickel), grains (Wheat, Corn, Soybeans, Oats, Rice), softs (Coffee, Cocoa, Sugar, Cotton, OJ, Lumber), livestock (Live Cattle, Lean Hogs, Feeder Cattle).

All pushing on Ethereum mainnet. All verifiable. No API key needed to read them.

## What we learned

**Gas is not the bottleneck.** At current ETH prices, pushing 34 price updates costs a few cents per update. For a protocol that's collateralizing millions in assets, this is trivial.

**Public data sources work.** Financial data is publicly available in many forms. The challenge is normalization and validation, not access.

**Anyone can run it.** We open-sourced the oracle node. If you want to run a redundant node pointing at the same contract, you can. More nodes = harder to corrupt.

## Try it

The oracle contract is deployed and verified on Ethereum mainnet:
`0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B`

Call `latestRoundData(feedId)` for any of the 34 commodity IDs.

**GitHub:** https://github.com/nagor2/cryptoFiat  
**Protocol:** https://beta.app.dotflat.io
