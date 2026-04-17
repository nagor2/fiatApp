# Oracle Deployment Guide

**Version**: 1.0.0  
**Date**: 2026-04-04  
**Networks**: Sepolia (testnet), Ethereum Mainnet

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Testnet Deployment](#testnet-deployment)
- [Mainnet Deployment](#mainnet-deployment)
- [Oracle Node Deployment](#oracle-node-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Tools

```bash
# Node.js and npm
node --version  # >= v18.0.0
npm --version   # >= v9.0.0

# Hardhat
npm install --save-dev hardhat

# OpenZeppelin Contracts
npm install @openzeppelin/contracts

# Python (for oracle node)
python --version  # >= 3.9

# Web3 libraries
pip install web3 eth-account requests
```

### Required Accounts

1. **Deployer Account**: With ETH for gas
2. **Treasury Account**: Receives slashed RLE
3. **Dispute Resolver Account**: Can trigger slashing (initially multisig)
4. **Oracle Accounts** (3-5): Run oracle nodes

### Environment Setup

Create `.env` file:

```bash
# Network RPCs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY

# Private Keys (NEVER commit to git!)
DEPLOYER_PRIVATE_KEY=0x...
ORACLE_1_PRIVATE_KEY=0x...
ORACLE_2_PRIVATE_KEY=0x...
ORACLE_3_PRIVATE_KEY=0x...

# Contract Addresses (will be filled after deployment)
RLE_TOKEN_ADDRESS=
ORACLE_REGISTRY_ADDRESS=
ORACLE_PRICE_FEED_ADDRESS=
ORACLE_GOVERNANCE_ADDRESS=

# API Keys
ETHERSCAN_API_KEY=...
METALS_API_KEY=...
GOLD_API_KEY=...
```

---

## Local Development

### 1. Setup Local Blockchain

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# This will output 20 test accounts with private keys
# Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
# Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 2. Deploy Mock RLE Token

```javascript
// scripts/deploy-mocks.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying with account:", deployer.address);
  
  // Deploy mock RLE token
  const RuleToken = await hre.ethers.getContractFactory("RuleToken");
  const rleToken = await RuleToken.deploy();
  await rleToken.deployed();
  
  console.log("RLE Token deployed to:", rleToken.address);
  
  // Mint tokens to test accounts
  const mintAmount = hre.ethers.utils.parseEther("100000");
  
  for (let i = 0; i < 5; i++) {
    const account = (await hre.ethers.getSigners())[i];
    await rleToken.mint(account.address, mintAmount);
    console.log(`Minted 100k RLE to ${account.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run:
```bash
npx hardhat run scripts/deploy-mocks.js --network localhost
```

### 3. Deploy Oracle Contracts

```javascript
// scripts/deploy-oracle.js
const hre = require("hardhat");

async function main() {
  const [deployer, treasury, disputeResolver] = await hre.ethers.getSigners();
  
  // Get RLE token address from previous deployment
  const RLE_TOKEN_ADDRESS = process.env.RLE_TOKEN_ADDRESS;
  
  console.log("Deploying Oracle contracts...");
  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasury.address);
  console.log("Dispute Resolver:", disputeResolver.address);
  
  // 1. Deploy OracleRegistry
  const OracleRegistry = await hre.ethers.getContractFactory("OracleRegistry");
  const registry = await OracleRegistry.deploy(
    RLE_TOKEN_ADDRESS,
    disputeResolver.address,
    treasury.address
  );
  await registry.deployed();
  console.log("✅ OracleRegistry deployed to:", registry.address);
  
  // 2. Deploy OraclePriceFeed
  const OraclePriceFeed = await hre.ethers.getContractFactory("OraclePriceFeed");
  const priceFeed = await OraclePriceFeed.deploy(registry.address);
  await priceFeed.deployed();
  console.log("✅ OraclePriceFeed deployed to:", priceFeed.address);
  
  // 3. Deploy OracleGovernance
  const OracleGovernance = await hre.ethers.getContractFactory("OracleGovernance");
  const governance = await OracleGovernance.deploy(
    RLE_TOKEN_ADDRESS,
    registry.address,
    priceFeed.address
  );
  await governance.deployed();
  console.log("✅ OracleGovernance deployed to:", governance.address);
  
  // 4. Setup permissions
  await registry.setDisputeResolver(priceFeed.address);
  console.log("✅ PriceFeed authorized to record reports");
  
  // 5. Save addresses
  const addresses = {
    network: hre.network.name,
    rleToken: RLE_TOKEN_ADDRESS,
    oracleRegistry: registry.address,
    oraclePriceFeed: priceFeed.address,
    oracleGovernance: governance.address,
    treasury: treasury.address,
    disputeResolver: disputeResolver.address
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    `deployments/${hre.network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("\n📝 Deployment complete! Addresses saved to deployments/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run:
```bash
npx hardhat run scripts/deploy-oracle.js --network localhost
```

### 4. Register Test Oracles

```javascript
// scripts/register-oracles.js
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const addresses = JSON.parse(
    fs.readFileSync('deployments/localhost.json')
  );
  
  const RuleToken = await hre.ethers.getContractAt(
    "RuleToken",
    addresses.rleToken
  );
  
  const OracleRegistry = await hre.ethers.getContractAt(
    "OracleRegistry",
    addresses.oracleRegistry
  );
  
  // Register first 3 accounts as oracles
  const stakeAmount = hre.ethers.utils.parseEther("10000");
  
  for (let i = 1; i <= 3; i++) {
    const oracle = (await hre.ethers.getSigners())[i];
    
    console.log(`\nRegistering oracle ${i}: ${oracle.address}`);
    
    // Approve RLE
    await RuleToken.connect(oracle).approve(
      OracleRegistry.address,
      stakeAmount
    );
    
    // Register
    await OracleRegistry.connect(oracle).registerOracle(stakeAmount);
    
    console.log(`✅ Oracle ${i} registered with 10k RLE stake`);
  }
  
  // Verify
  const activeOracles = await OracleRegistry.getActiveOracles();
  console.log(`\n✅ Total active oracles: ${activeOracles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run:
```bash
npx hardhat run scripts/register-oracles.js --network localhost
```

### 5. Test Price Reporting

```javascript
// scripts/test-price-feed.js
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const addresses = JSON.parse(
    fs.readFileSync('deployments/localhost.json')
  );
  
  const OraclePriceFeed = await hre.ethers.getContractAt(
    "OraclePriceFeed",
    addresses.oraclePriceFeed
  );
  
  const GOLD = hre.ethers.utils.keccak256(
    hre.ethers.utils.toUtf8Bytes("XAU/USD")
  );
  
  // Simulate 3 oracles reporting gold price
  const prices = [
    205000000000,  // $2,050.00 (8 decimals)
    204500000000,  // $2,045.00
    205200000000   // $2,052.00
  ];
  
  for (let i = 1; i <= 3; i++) {
    const oracle = (await hre.ethers.getSigners())[i];
    
    console.log(`Oracle ${i} reporting: $${prices[i-1] / 1e8}`);
    
    await OraclePriceFeed.connect(oracle).reportPrice(GOLD, prices[i-1]);
  }
  
  // Auto-finalization should have occurred
  const result = await OraclePriceFeed.getLatestPrice(GOLD);
  
  console.log("\n✅ Price finalized!");
  console.log(`   Median: $${result.price / 1e8}`);
  console.log(`   Timestamp: ${new Date(result.timestamp * 1000)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run:
```bash
npx hardhat run scripts/test-price-feed.js --network localhost
```

---

## Testnet Deployment

### 1. Get Testnet ETH

Visit [Sepolia Faucet](https://sepoliafaucet.com/) and get ETH for:
- Deployer account
- 3-5 oracle accounts

### 2. Deploy to Sepolia

```bash
# Deploy RLE token (if not already deployed)
npx hardhat run scripts/deploy-mocks.js --network sepolia

# Deploy oracle contracts
npx hardhat run scripts/deploy-oracle.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia ORACLE_REGISTRY_ADDRESS "RLE_ADDRESS" "DISPUTE_RESOLVER" "TREASURY"
npx hardhat verify --network sepolia ORACLE_PRICE_FEED_ADDRESS "REGISTRY_ADDRESS"
```

### 3. Register Testnet Oracles

```bash
# Fund oracle accounts with testnet RLE
npx hardhat run scripts/fund-oracles.js --network sepolia

# Register oracles
npx hardhat run scripts/register-oracles.js --network sepolia
```

### 4. Run Oracle Nodes (Testnet)

```bash
# Terminal 1: Oracle Node 1
cd oracle-node
export ORACLE_PRIVATE_KEY=$ORACLE_1_PRIVATE_KEY
export NETWORK=sepolia
python main.py

# Terminal 2: Oracle Node 2
export ORACLE_PRIVATE_KEY=$ORACLE_2_PRIVATE_KEY
export NETWORK=sepolia
python main.py

# Terminal 3: Oracle Node 3
export ORACLE_PRIVATE_KEY=$ORACLE_3_PRIVATE_KEY
export NETWORK=sepolia
python main.py
```

### 5. Monitoring Dashboard

```bash
# Install dependencies
cd monitoring
npm install

# Start dashboard
npm start

# Access at http://localhost:3001
```

Dashboard shows:
- Active oracles count
- Latest prices for each commodity
- Oracle accuracy scores
- Recent slashing events
- Price deviation alerts

---

## Mainnet Deployment

### Pre-Deployment Checklist

- [ ] All contracts audited by reputable firm (Certora, Trail of Bits)
- [ ] Comprehensive test coverage (>95%)
- [ ] Fuzz testing passed
- [ ] Testnet running smoothly for 1+ month
- [ ] 5+ independent oracles ready
- [ ] Emergency pause mechanism tested
- [ ] Multisig for admin functions configured
- [ ] Insurance fund allocated

### 1. Deploy Contracts

```bash
# CRITICAL: Triple-check addresses before deployment
# Use a multisig as deployer for added security

npx hardhat run scripts/deploy-oracle.js --network mainnet

# Verify immediately
npx hardhat verify --network mainnet ...
```

### 2. Transfer Ownership to Multisig

```solidity
// Transfer to 3/5 multisig (Gnosis Safe)
const MULTISIG = "0x...";

await registry.transferOwnership(MULTISIG);
await priceFeed.transferOwnership(MULTISIG);
await governance.transferOwnership(MULTISIG);
```

### 3. Initial Oracle Registration

```bash
# Coordinate with oracle operators
# Each oracle runs:
npx hardhat run scripts/self-register.js --network mainnet
```

### 4. Integration with DotFlat

```bash
# Update CDP contract to use oracle
npx hardhat run scripts/integrate-cdp.js --network mainnet

# Update Basket contract
npx hardhat run scripts/integrate-basket.js --network mainnet

# Keep Chainlink as fallback
```

### 5. Gradual Rollout

**Week 1**: Parallel operation (monitoring only)
```solidity
// CDP.sol - both oracles active but only Chainlink used
useOraclePrice = false;  // Still using Chainlink
```

**Week 2**: Hybrid mode (oracle primary, Chainlink fallback)
```solidity
useOraclePrice = true;
chainlinkFallback = true;
```

**Week 3+**: Full migration (oracle only)
```solidity
useOraclePrice = true;
chainlinkFallback = false;  // Emergency only
```

---

## Oracle Node Deployment

### Production Node Setup

#### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  oracle-node:
    build: .
    restart: always
    environment:
      - NETWORK=mainnet
      - RPC_URL=${MAINNET_RPC_URL}
      - ORACLE_PRIVATE_KEY=${ORACLE_PRIVATE_KEY}
      - METALS_API_KEY=${METALS_API_KEY}
      - GOLD_API_KEY=${GOLD_API_KEY}
    volumes:
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Systemd Service

```ini
# /etc/systemd/system/dotflat-oracle.service
[Unit]
Description=DotFlat Oracle Node
After=network.target

[Service]
Type=simple
User=oracle
WorkingDirectory=/opt/dotflat-oracle
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10
Environment="NETWORK=mainnet"
Environment="ORACLE_PRIVATE_KEY=..."

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable dotflat-oracle
sudo systemctl start dotflat-oracle
sudo systemctl status dotflat-oracle

# View logs
sudo journalctl -u dotflat-oracle -f
```

#### Health Monitoring

```python
# health_check.py
from flask import Flask, jsonify
import time

app = Flask(__name__)

last_report_time = time.time()

@app.route('/health')
def health():
    # Check if reported in last 2 hours
    time_since_report = time.time() - last_report_time
    
    if time_since_report < 7200:  # 2 hours
        return jsonify({
            'status': 'healthy',
            'last_report': time_since_report
        }), 200
    else:
        return jsonify({
            'status': 'unhealthy',
            'last_report': time_since_report
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

#### Alerting

```bash
# alert.sh - Run as cron job every 15 minutes
#!/bin/bash

HEALTH_URL="http://localhost:8080/health"
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response != "200" ]; then
    curl -X POST -H 'Content-type: application/json' \
         --data '{"text":"🚨 Oracle node unhealthy!"}' \
         $WEBHOOK_URL
fi
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Oracle Health**
   - Active oracle count
   - Uptime per oracle
   - Reports submitted per hour
   - Accuracy rate per oracle

2. **Price Quality**
   - Price deviation vs Chainlink (if available)
   - Time since last price update
   - Number of reports per finalization
   - Circuit breaker triggers

3. **Economic Security**
   - Total RLE staked
   - Largest oracle stake (centralization risk)
   - Slashing events
   - Oracle churn rate

### Monitoring Stack

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'oracle-nodes'
    static_configs:
      - targets: ['oracle1:8080', 'oracle2:8080', 'oracle3:8080']

  - job_name: 'blockchain-metrics'
    static_configs:
      - targets: ['eth-node:9090']
```

```yaml
# grafana-dashboard.json
{
  "dashboard": {
    "title": "DotFlat Oracle Network",
    "panels": [
      {
        "title": "Active Oracles",
        "type": "stat"
      },
      {
        "title": "Gold Price (24h)",
        "type": "graph"
      },
      {
        "title": "Oracle Accuracy",
        "type": "table"
      }
    ]
  }
}
```

### Incident Response

#### Scenario 1: Oracle Offline

```bash
# Check node status
systemctl status dotflat-oracle

# Check logs
journalctl -u dotflat-oracle --since "1 hour ago"

# Restart if needed
systemctl restart dotflat-oracle
```

#### Scenario 2: Extreme Price Deviation

```javascript
// Emergency pause script
const OraclePriceFeed = await ethers.getContractAt(
  "OraclePriceFeed",
  PRICE_FEED_ADDRESS
);

// Via multisig
await OraclePriceFeed.pause(GOLD_ID);

// Investigate
const reports = await OraclePriceFeed.priceRounds(GOLD_ID, currentRound);

// Unpause after resolution
await OraclePriceFeed.unpause(GOLD_ID);
```

#### Scenario 3: Oracle Manipulation Detected

```javascript
// Slash malicious oracle
const OracleRegistry = await ethers.getContractAt(
  "OracleRegistry",
  REGISTRY_ADDRESS
);

// Via dispute resolver (multisig)
await OracleRegistry.slashOracle(
  MALICIOUS_ORACLE_ADDRESS,
  ethers.utils.parseEther("2000"),  // Slash 2000 RLE
  "Reported fake gold price"
);
```

### Upgradeability

Contracts are NOT upgradeable by design (security > flexibility).

For critical fixes:
1. Deploy new contracts
2. Migrate oracles to new registry
3. Update DotFlat integration
4. Deprecate old contracts

For parameter updates:
- Use governance (OracleGovernance.sol)
- No contract redeployment needed

---

## Cost Estimation

### Deployment Costs (Mainnet)

| Contract | Gas Used | Cost @ 30 gwei | Cost @ 100 gwei |
|----------|----------|----------------|-----------------|
| OracleRegistry | ~2.5M | ~0.075 ETH | ~0.25 ETH |
| OraclePriceFeed | ~2.0M | ~0.060 ETH | ~0.20 ETH |
| OracleGovernance | ~1.8M | ~0.054 ETH | ~0.18 ETH |
| **Total** | **~6.3M** | **~0.19 ETH** | **~0.63 ETH** |

### Operational Costs

| Operation | Gas | Frequency | Daily Cost @ 30 gwei |
|-----------|-----|-----------|----------------------|
| Register Oracle | ~150k | Once | - |
| Report Price | ~100k | 24/day/oracle | ~0.072 ETH/oracle |
| Finalize Round | ~80k | 24/day | Auto (included) |
| Slash Oracle | ~80k | Rare | - |

For 5 oracles: **~0.36 ETH/day** (~$750/day @ $2000 ETH)

**Cost Reduction**:
- Use Layer 2 (Arbitrum, Optimism): **90%+ savings**
- Batch reports: ~30% savings
- Optimize finalization: ~20% savings

---

## Security Checklist

- [ ] Contracts audited
- [ ] Admin keys in multisig (3/5 minimum)
- [ ] Emergency pause tested
- [ ] Oracle nodes geographically distributed
- [ ] Price sources diversified
- [ ] Monitoring and alerting active
- [ ] Incident response plan documented
- [ ] Insurance fund allocated
- [ ] Bug bounty program launched
- [ ] Gradual rollout plan executed

---

## Support & Resources

- **Documentation**: https://docs.dotflat.io/oracle
- **GitHub**: https://github.com/dotflat/oracle
- **Discord**: https://discord.gg/dotflat (oracle channel)
- **Bug Bounty**: https://immunefi.com/dotflat

---

**Deployment Complete!** 🎉

Now proceed to `ORACLE-INTEGRATION.md` for integrating with DotFlat contracts.
