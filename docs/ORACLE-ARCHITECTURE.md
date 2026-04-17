# Decentralized Oracle Architecture with RLE Staking

**Version**: 1.0.0  
**Date**: 2026-04-04  
**Status**: Design Document

## Table of Contents

- [Overview](#overview)
- [Why Not Chainlink?](#why-not-chainlink)
- [Architecture Design](#architecture-design)
- [Components](#components)
- [Consensus Mechanisms](#consensus-mechanisms)
- [Economic Security Model](#economic-security-model)
- [Governance](#governance)
- [Attack Vectors & Mitigations](#attack-vectors--mitigations)
- [Implementation Roadmap](#implementation-roadmap)

---

## Overview

DotFlat requires reliable price feeds for commodities (gold, silver, oil, wheat, etc.) to maintain the peg and calculate collateralization ratios. Instead of using Chainlink (which has limited commodity price feeds), we design a **permissionless, decentralized oracle network** secured by **RLE token staking**.

### Key Features

✅ **Permissionless Entry**: Anyone can become an oracle by staking RLE  
✅ **Economic Security**: Slash mechanism punishes malicious/inaccurate reports  
✅ **Weighted Consensus**: Voting power proportional to stake + accuracy history  
✅ **Decentralized Governance**: DAO controls oracle parameters  
✅ **RLE Utility**: Governance token gains additional use case  
✅ **Sybil Resistance**: Attack cost = MIN_STAKE × number of fake oracles  

---

## Why Not Chainlink?

| Issue | Chainlink | Our Oracle |
|-------|-----------|------------|
| **Commodity Coverage** | Limited (mainly crypto, forex, some indices) | Unlimited (any commodity) |
| **Cost** | High per-update fees | Self-hosted (only gas) |
| **Customization** | Fixed structure | Fully customizable |
| **Decentralization** | Chainlink node operators | RLE stakers (community) |
| **Integration Complexity** | Simple but inflexible | Custom but tailored |

For **MVP**, we can use Chainlink for ETH/USD and build our oracle for commodities. As TVL grows, migrate ETH/USD to our oracle too.

---

## Architecture Design

### High-Level Flow

```
┌─────────────────┐
│  Oracle Nodes   │
│  (RLE Stakers)  │
└────────┬────────┘
         │
         │ 1. Fetch prices from APIs
         │    (Bloomberg, CME, ICE, etc.)
         │
         ▼
┌─────────────────────────┐
│  OracleRegistry.sol     │
│  - Manages oracle list  │
│  - Handles staking      │
│  - Slashing mechanism   │
└────────┬────────────────┘
         │
         │ 2. Submit signed prices
         │
         ▼
┌─────────────────────────┐
│  OraclePriceFeed.sol    │
│  - Collects reports     │
│  - Calculates median    │
│  - Finalizes price      │
└────────┬────────────────┘
         │
         │ 3. Use finalized price
         │
         ▼
┌─────────────────────────┐
│  DotFlat Core Contracts │
│  - CDP.sol              │
│  - Auction.sol          │
│  - Basket.sol           │
└─────────────────────────┘
```

### Oracle Lifecycle

```
1. REGISTRATION
   └─> Stake MIN_STAKE (10,000 RLE)
   └─> Become active oracle

2. PRICE REPORTING
   └─> Monitor commodity APIs
   └─> Submit price reports (1 hour window)
   └─> Weighted by stake + accuracy

3. CONSENSUS
   └─> Collect 3+ reports
   └─> Calculate weighted median
   └─> Finalize price

4. ACCURACY TRACKING
   └─> Compare report to finalized price
   └─> Update accuracy score
   └─> Slash if deviation > 15%

5. DEACTIVATION (Optional)
   └─> Unbond stake (7-day period)
   └─> Withdraw RLE
```

---

## Components

### 1. OracleRegistry.sol

**Purpose**: Manages oracle registration, staking, and slashing.

**Key Functions**:
- `registerOracle(uint256 stake)` - Stake RLE to become oracle
- `increaseStake(uint256 amount)` - Boost voting weight
- `deactivate()` - Exit oracle role (7-day unbonding)
- `withdrawStake()` - Withdraw after unbonding
- `slashOracle(address oracle, uint256 amount)` - Penalize bad behavior
- `getVotingWeight(address oracle)` - Calculate voting power

**State Variables**:
```solidity
uint256 public MIN_STAKE = 10,000 * 10**18;  // 10k RLE
uint256 public SLASH_AMOUNT = 2,000 * 10**18; // 2k RLE
uint256 public UNBONDING_PERIOD = 7 days;

struct Oracle {
    address oracleAddress;
    uint256 stakedAmount;
    uint256 registeredAt;
    uint256 totalReports;
    uint256 accurateReports;
    uint256 slashedAmount;
    bool active;
}
```

### 2. OraclePriceFeed.sol

**Purpose**: Collects price reports, calculates consensus, finalizes prices.

**Key Functions**:
- `reportPrice(bytes32 commodity, uint256 price)` - Oracle submits price
- `finalizePrice(bytes32 commodity)` - Calculate weighted median
- `getLatestPrice(bytes32 commodity)` - Get finalized price
- `calculateWeightedMedian(PriceReport[])` - Consensus algorithm

**Reporting Rounds**:
```
Round 1: 10:00 - 11:00  →  Finalized at 11:00
Round 2: 11:00 - 12:00  →  Finalized at 12:00
...
```

Each round:
- **Duration**: 1 hour window
- **Min Reports**: 3 oracles
- **Consensus**: Weighted median by stake

### 3. OracleGovernance.sol

**Purpose**: DAO controls oracle parameters via RLE voting.

**Governable Parameters**:
- `MIN_STAKE` - Minimum RLE to become oracle
- `SLASH_AMOUNT` - Penalty for bad reports
- `MIN_REPORTS` - Required reports for consensus
- `REPORT_WINDOW` - Time window for reporting
- `MAX_PRICE_AGE` - Maximum age of valid price

**Voting Mechanism**:
```solidity
Proposal threshold: 1,000 RLE
Voting period: 3 days
Execution delay: 1 day (timelock)
Quorum: 10% of circulating RLE
```

---

## Consensus Mechanisms

We implement **Weighted Median** with **Accuracy Multiplier**.

### Step 1: Collect Reports

```
Oracle A (stake: 20,000 RLE) → $2,050
Oracle B (stake: 15,000 RLE) → $2,045
Oracle C (stake: 10,000 RLE) → $2,100
Oracle D (stake: 10,000 RLE) → $2,048
```

### Step 2: Calculate Base Weights

```
Total stake = 55,000 RLE
A weight = 20,000 / 55,000 = 36.4%
B weight = 15,000 / 55,000 = 27.3%
C weight = 10,000 / 55,000 = 18.2%
D weight = 10,000 / 55,000 = 18.2%
```

### Step 3: Apply Accuracy Multiplier

If Oracle A has 95% historical accuracy:
```
A weight = 20,000 × 1.15 = 23,000  (15% bonus)
```

### Step 4: Sort by Price & Find Median

```
Sorted:
B: $2,045 (weight: 15,000)
D: $2,048 (weight: 10,000)
A: $2,050 (weight: 23,000)
C: $2,100 (weight: 10,000)

Cumulative weights:
$2,045 → 15,000
$2,048 → 25,000
$2,050 → 48,000 ✓ (crosses 50% threshold)
$2,100 → 58,000

Weighted Median = $2,050
```

### Step 5: Slash Outliers

Max deviation: 5% of median = ±$102.50

```
Oracle C: $2,100 is 2.4% away → Within bounds (no slash)
```

If Oracle C reported $2,300 (12% deviation):
```
Deviation: 12% > 15% threshold
Action: Slash 20% of stake (2,000 RLE)
```

---

## Economic Security Model

### Cost of Attack

To manipulate the oracle, an attacker needs:

1. **Sybil Attack**: Stake enough to control >50% voting weight
   ```
   If total staked = 500,000 RLE
   Attack cost = 250,001 RLE × price
   Example: 250,001 × $0.10 = $25,000
   ```

2. **Collusion**: Bribe existing oracles
   ```
   Must bribe oracles controlling >50% weight
   Bribe cost > potential profit from exploit
   ```

### Defense Mechanisms

1. **Slashing**: Bad actors lose stake
   - 20% slash for >15% deviation
   - 50% slash for manipulation proof
   - 100% slash for coordinated attack

2. **Reputation System**: Accuracy history affects weight
   - 95%+ accuracy → +15% weight
   - 90-95% accuracy → +10% weight
   - 80-90% accuracy → no bonus
   - <80% accuracy → forced exit

3. **Dispute Resolution**: Off-chain verification
   - Anyone can challenge a price
   - Challenge period: 1 hour
   - Resolution by DAO vote

4. **Circuit Breaker**: Extreme deviation triggers pause
   - If price changes >20% in 1 hour → pause
   - Manual review required
   - DAO vote to resume

---

## Governance

### Phase 1: Multisig Control (MVP)

Initial parameters controlled by 3/5 multisig:
- Core team members
- Trusted advisors
- Can update parameters quickly
- Gradually decentralize

### Phase 2: DAO Governance (Post-Launch)

All parameters governed by RLE holders:

```solidity
Proposal Creation:
- Threshold: 1,000 RLE
- Anyone can propose

Voting:
- Power: 1 RLE = 1 vote
- Period: 3 days
- Quorum: 10% of circulating

Execution:
- Timelock: 1 day delay
- Allows emergency exit if malicious
```

**Governable Parameters**:
```javascript
MIN_STAKE: 10,000 RLE → adjustable based on RLE price
SLASH_AMOUNT: 2,000 RLE → can increase for stricter security
MIN_REPORTS: 3 → can increase as network grows
REPORT_WINDOW: 1 hour → can adjust for faster updates
ACCURACY_THRESHOLD: 95% → can tune for balance
UNBONDING_PERIOD: 7 days → security vs convenience
```

---

## Attack Vectors & Mitigations

### 1. Price Manipulation

**Attack**: Oracle reports fake price to liquidate CDPs.

**Mitigation**:
- ✅ Weighted median (need >50% weight)
- ✅ Slashing (lose stake if caught)
- ✅ Reputation decay (harder to rebuild trust)
- ✅ Circuit breaker (pause on extreme deviation)

### 2. Sybil Attack

**Attack**: Create many fake oracles to control consensus.

**Mitigation**:
- ✅ High MIN_STAKE (10k RLE = ~$1k-$5k)
- ✅ Weighted voting (need 50%+ of TOTAL stake)
- ✅ Cost of attack > potential profit

### 3. Oracle Failure

**Attack**: All oracles go offline (DoS).

**Mitigation**:
- ✅ Fallback to Chainlink for critical pairs (ETH/USD)
- ✅ Grace period (use last known price for 2 hours)
- ✅ Incentives for oracle uptime

### 4. Flash Loan Attack

**Attack**: Borrow RLE, stake, manipulate, unstake.

**Mitigation**:
- ✅ 7-day unbonding period (can't exit quickly)
- ✅ Slashing (lose stake if manipulation detected)
- ✅ Snapshot-based voting (block number matters)

### 5. Collusion

**Attack**: Multiple oracles coordinate to report wrong price.

**Mitigation**:
- ✅ Commit-Reveal scheme (hide prices until reveal phase)
- ✅ Economic punishment (all colluders slashed)
- ✅ Reputation decay (lose weight permanently)

---

## Implementation Roadmap

### Phase 1: MVP (Months 1-2)

- [ ] Deploy `OracleRegistry.sol`
- [ ] Deploy `OraclePriceFeed.sol`
- [ ] Build 3 oracle nodes (team-operated)
- [ ] Single commodity: Gold (XAU/USD)
- [ ] Manual slashing (multisig)
- [ ] Testnet deployment

**Deliverables**:
- Working oracle for gold prices
- 3 active oracles
- Testnet proof-of-concept

### Phase 2: Decentralization (Months 3-4)

- [ ] Open registration (permissionless)
- [ ] Add 5 more commodities (silver, oil, copper, wheat, corn)
- [ ] Automated accuracy tracking
- [ ] Reputation system
- [ ] Mainnet deployment

**Deliverables**:
- 10+ independent oracles
- 6 commodity feeds
- Automated slashing

### Phase 3: Governance (Months 5-6)

- [ ] Deploy `OracleGovernance.sol`
- [ ] DAO controls parameters
- [ ] Dispute resolution system
- [ ] Insurance fund from slashed tokens
- [ ] Oracle incentives (rewards)

**Deliverables**:
- Full DAO governance
- Sustainable incentive model
- Security audit

### Phase 4: Scale (Months 7+)

- [ ] 50+ oracles
- [ ] 20+ commodity feeds
- [ ] Sub-1-minute updates
- [ ] Cross-chain expansion (Arbitrum, Optimism)
- [ ] API for external projects

**Deliverables**:
- Production-ready oracle network
- External adoption
- Revenue from API usage

---

## Comparison with Alternatives

| Feature | Our Oracle | Chainlink | Tellor | UMA |
|---------|-----------|-----------|--------|-----|
| **Permissionless** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Commodity Coverage** | ✅ Unlimited | ⚠️ Limited | ✅ Good | ⚠️ Limited |
| **Staking Token** | RLE | LINK | TRB | UMA |
| **Consensus** | Weighted Median | Aggregation | Median | Optimistic |
| **Slashing** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Cost** | Low (self-hosted) | High | Medium | Medium |
| **Update Speed** | 1 hour (configurable) | Minutes | 10 mins | Hours |
| **Decentralization** | High | Medium | High | Medium |

**Conclusion**: Our oracle is optimized for **DotFlat's specific needs** (commodities) while maintaining **economic security** through RLE staking.

---

## References

- [MakerDAO Oracle Design](https://docs.makerdao.com/smart-contract-modules/oracle-module)
- [Tellor Whitepaper](https://tellor.io/whitepaper/)
- [UMA Optimistic Oracle](https://docs.umaproject.org/protocol-overview/how-does-umas-oracle-work)
- [Chainlink Architecture](https://docs.chain.link/architecture-overview/architecture-decentralized-model)

---

**Next Documents**:
- `ORACLE-CONTRACTS.md` - Full Solidity implementation
- `ORACLE-INTEGRATION.md` - How to integrate with DotFlat
- `ORACLE-DEPLOYMENT.md` - Deployment guide
