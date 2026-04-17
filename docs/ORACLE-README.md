# DotFlat Decentralized Oracle Documentation

**Version**: 1.0.0  
**Date**: 2026-04-04  
**Status**: Design & Implementation Phase

---

## 📚 Documentation Index

### 1. [Architecture](./ORACLE-ARCHITECTURE.md) ⭐ **Start Here**

High-level overview of the decentralized oracle design.

**Topics**:
- Why build a custom oracle vs Chainlink?
- Permissionless registration with RLE staking
- Weighted consensus mechanism
- Economic security model
- Attack vectors and mitigations
- Implementation roadmap

**Target Audience**: Product managers, architects, investors

**Reading Time**: 15 minutes

---

### 2. [Smart Contracts](./ORACLE-CONTRACTS.md)

Complete Solidity implementation of all oracle contracts.

**Contracts**:
- `OracleRegistry.sol` - Manages oracles, staking, slashing
- `OraclePriceFeed.sol` - Collects reports, calculates consensus
- `OracleGovernance.sol` - DAO voting for parameters
- Interfaces and testing strategy

**Target Audience**: Smart contract developers, auditors

**Reading Time**: 30 minutes

---

### 3. [Integration Guide](./ORACLE-INTEGRATION.md)

How to integrate the oracle with DotFlat's existing contracts and frontend.

**Topics**:
- Modifications to Basket, CDP, Auction contracts
- Frontend integration (Web3Context, new components)
- Oracle node software (Python implementation)
- Migration strategy (Chainlink → Custom Oracle)

**Target Audience**: Full-stack developers, DevOps

**Reading Time**: 25 minutes

---

### 4. [Deployment Guide](./ORACLE-DEPLOYMENT.md)

Step-by-step instructions for deploying to testnet and mainnet.

**Topics**:
- Local development setup
- Testnet deployment (Sepolia)
- Mainnet deployment checklist
- Oracle node deployment (Docker, Systemd)
- Monitoring and incident response

**Target Audience**: DevOps, blockchain engineers

**Reading Time**: 40 minutes

---

## 🚀 Quick Start

### For Product/Business Team

1. Read [ORACLE-ARCHITECTURE.md](./ORACLE-ARCHITECTURE.md)
2. Review "Why Not Chainlink?" section
3. Understand economics and attack vectors
4. Review implementation roadmap

### For Developers

1. Skim [ORACLE-ARCHITECTURE.md](./ORACLE-ARCHITECTURE.md)
2. Deep-dive [ORACLE-CONTRACTS.md](./ORACLE-CONTRACTS.md)
3. Follow [ORACLE-INTEGRATION.md](./ORACLE-INTEGRATION.md)
4. Test using [ORACLE-DEPLOYMENT.md](./ORACLE-DEPLOYMENT.md) local setup

### For Oracle Operators

1. Understand [ORACLE-ARCHITECTURE.md](./ORACLE-ARCHITECTURE.md) - Economics section
2. Review oracle requirements in [ORACLE-INTEGRATION.md](./ORACLE-INTEGRATION.md) - Oracle Node Setup
3. Follow [ORACLE-DEPLOYMENT.md](./ORACLE-DEPLOYMENT.md) - Oracle Node Deployment

---

## 💡 Key Concepts

### Permissionless Registration

Anyone can become an oracle by staking **10,000 RLE** (≈ $1,000-$5,000 at launch). No whitelist, no approval needed.

```solidity
function registerOracle(uint256 stakeAmount) external {
    require(stakeAmount >= MIN_STAKE);
    rleToken.transferFrom(msg.sender, address(this), stakeAmount);
    // Oracle is now active
}
```

### Weighted Consensus

Voting power = Stake × Accuracy Multiplier

```
Oracle A: 20,000 RLE × 1.15 (95% accuracy) = 23,000 weight
Oracle B: 10,000 RLE × 1.00 (80% accuracy) = 10,000 weight
Oracle C: 15,000 RLE × 1.10 (92% accuracy) = 16,500 weight
```

Median is calculated weighted by these values.

### Economic Security

- **Attack Cost**: Need 50%+ of total staked RLE
- **Slashing**: Lose 20% stake for bad reports (>15% deviation)
- **Reputation Decay**: Low accuracy → lower voting weight
- **Unbonding Period**: 7 days before withdrawal (can't exit quickly)

### RLE Utility

1. **Staking** to become oracle (demand ↑)
2. **Governance** voting on parameters
3. **Rewards** for accurate reporting (future)
4. **Slashed tokens** → treasury → buyback & burn

---

## 📊 Comparison

| Feature | DotFlat Oracle | Chainlink | Tellor | UMA |
|---------|----------------|-----------|--------|-----|
| **Permissionless** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Commodity Prices** | ✅ Unlimited | ⚠️ Limited | ✅ Good | ⚠️ Limited |
| **Staking Token** | RLE | LINK | TRB | UMA |
| **Consensus** | Weighted Median | Aggregation | Median | Optimistic |
| **Slashing** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Update Frequency** | 1 hour (tunable) | Minutes | 10 mins | Hours |
| **Cost** | Low (self-hosted) | High | Medium | Medium |

---

## 🛣️ Implementation Roadmap

### Phase 1: MVP (Months 1-2) ✅ Current Phase

- [x] Design architecture
- [x] Write smart contracts
- [x] Create documentation
- [ ] Deploy to testnet
- [ ] Run 3 team oracles
- [ ] Test single commodity (Gold)

**Deliverable**: Working oracle on testnet

### Phase 2: Decentralization (Months 3-4)

- [ ] Open permissionless registration
- [ ] Onboard 10+ independent oracles
- [ ] Add 5 more commodities
- [ ] Automated accuracy tracking
- [ ] Deploy to mainnet

**Deliverable**: Production-ready oracle network

### Phase 3: Governance (Months 5-6)

- [ ] Transfer control to DAO
- [ ] Launch governance voting
- [ ] Implement reward distribution
- [ ] Add dispute resolution
- [ ] Security audit complete

**Deliverable**: Fully decentralized oracle

### Phase 4: Scale (Months 7+)

- [ ] 50+ oracles
- [ ] 20+ commodities
- [ ] Sub-1-minute updates
- [ ] Cross-chain expansion
- [ ] API for external projects

**Deliverable**: Oracle-as-a-Service

---

## 🔐 Security

### Audit Status

- [ ] Internal review complete
- [ ] External audit scheduled (Certora)
- [ ] Bug bounty launched (Immunefi)
- [ ] Formal verification in progress

### Known Limitations

1. **Cold Start**: Need 3+ oracles for consensus (initially team-operated)
2. **Oracle Availability**: If <3 oracles online, price won't finalize
3. **API Dependencies**: Oracles depend on external price APIs (Bloomberg, CME)
4. **Gas Costs**: Reporting costs ~0.072 ETH/day/oracle on mainnet

### Mitigations

1. Start with 5 team oracles (redundancy)
2. Graceful degradation to Chainlink
3. Diversified price sources per oracle
4. Future: Layer 2 deployment (90% gas savings)

---

## 🤝 Contributing

### For Core Team

1. Review architecture document
2. Provide feedback on Discord (#oracle-dev)
3. Propose parameter changes via governance

### For External Contributors

1. Report bugs: [GitHub Issues](https://github.com/dotflat/oracle/issues)
2. Security issues: security@dotflat.io (PGP key available)
3. Improvements: Pull requests welcome

### For Oracle Operators

1. Join Discord #oracle-operators
2. Review requirements in docs
3. Register on testnet first
4. Get verified before mainnet

---

## 📞 Support

- **Documentation**: https://docs.dotflat.io/oracle
- **GitHub**: https://github.com/dotflat/oracle
- **Discord**: https://discord.gg/dotflat (channel: #oracle-support)
- **Email**: oracle@dotflat.io
- **Bug Bounty**: https://immunefi.com/dotflat

---

## 📝 Changelog

### v1.0.0 (2026-04-04) - Initial Design

- Complete architecture documentation
- Smart contract implementation
- Integration guide
- Deployment guide
- Oracle node reference implementation

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **MakerDAO** - Median oracle inspiration
- **Tellor** - Commit-reveal pattern
- **UMA** - Optimistic oracle concepts
- **Chainlink** - Decentralized oracle pioneering

---

**Ready to dive in?** Start with [ORACLE-ARCHITECTURE.md](./ORACLE-ARCHITECTURE.md) 🚀
