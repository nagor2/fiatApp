# Oracle Integration Guide

**Version**: 1.0.0  
**Date**: 2026-04-04

## Table of Contents

- [Overview](#overview)
- [Integration Points](#integration-points)
- [Contract Modifications](#contract-modifications)
- [Frontend Integration](#frontend-integration)
- [Oracle Node Setup](#oracle-node-setup)
- [Migration Strategy](#migration-strategy)

---

## Overview

This guide describes how to integrate the decentralized oracle network with DotFlat's existing smart contracts and frontend.

### Current State (Chainlink)

DotFlat currently uses:
- **Chainlink** for ETH/USD price feed
- **Uniswap V3** for DFC/ETH price (via quoter)
- **Manual basket weights** for commodity exposure

### Target State (Custom Oracle)

After integration:
- **Chainlink** for ETH/USD (fallback)
- **Custom Oracle** for ETH/USD (primary)
- **Custom Oracle** for commodities (gold, silver, oil, etc.)
- **Uniswap V3** for DFC/ETH (unchanged)

---

## Integration Points

### 1. Basket Contract

**Location**: `contracts/Basket.sol`

**Current**: Hardcoded commodity weights, no price feeds

**Changes Needed**:

```solidity
// Add oracle integration
import "./oracle/IOraclePriceFeed.sol";

contract Basket {
    IOraclePriceFeed public oracle;
    
    // Commodity identifiers
    bytes32 public constant GOLD = keccak256("XAU/USD");
    bytes32 public constant SILVER = keccak256("XAG/USD");
    bytes32 public constant OIL = keccak256("CL/USD");
    
    struct Commodity {
        bytes32 id;
        uint256 weight;  // Basis points (10000 = 100%)
        uint256 lastPrice;
        uint256 lastUpdate;
    }
    
    Commodity[] public commodities;
    
    constructor(address _oracle) {
        oracle = IOraclePriceFeed(_oracle);
        
        // Initialize commodity basket
        commodities.push(Commodity({
            id: GOLD,
            weight: 3000,  // 30%
            lastPrice: 0,
            lastUpdate: 0
        }));
        
        commodities.push(Commodity({
            id: SILVER,
            weight: 2000,  // 20%
            lastPrice: 0,
            lastUpdate: 0
        }));
        
        commodities.push(Commodity({
            id: OIL,
            weight: 2000,  // 20%
            lastPrice: 0,
            lastUpdate: 0
        }));
    }
    
    /**
     * @notice Calculate basket value in USD (8 decimals)
     * @return Total value of commodity basket
     */
    function getBasketValue() external view returns (uint256) {
        uint256 totalValue = 0;
        
        for (uint i = 0; i < commodities.length; i++) {
            (uint256 price, uint256 timestamp) = oracle.getLatestPrice(
                commodities[i].id
            );
            
            require(
                block.timestamp - timestamp < 2 hours,
                "Commodity price stale"
            );
            
            // Weighted price contribution
            uint256 contribution = (price * commodities[i].weight) / 10000;
            totalValue += contribution;
        }
        
        return totalValue;
    }
    
    /**
     * @notice Update commodity weights (governance)
     * @param newWeights Array of new weights (must sum to 10000)
     */
    function updateWeights(uint256[] memory newWeights) external onlyOwner {
        require(newWeights.length == commodities.length, "Invalid length");
        
        uint256 totalWeight = 0;
        for (uint i = 0; i < newWeights.length; i++) {
            commodities[i].weight = newWeights[i];
            totalWeight += newWeights[i];
        }
        
        require(totalWeight == 10000, "Weights must sum to 100%");
    }
}
```

### 2. CDP Contract

**Location**: `contracts/CDP.sol`

**Current**: Uses Chainlink for ETH/USD

**Changes Needed**:

```solidity
import "./oracle/IOraclePriceFeed.sol";

contract CDP {
    IOraclePriceFeed public oracle;
    address public chainlinkFallback;  // Keep as backup
    
    bytes32 public constant ETH_USD = keccak256("ETH/USD");
    
    constructor(address _oracle, address _chainlink) {
        oracle = IOraclePriceFeed(_oracle);
        chainlinkFallback = _chainlink;
    }
    
    /**
     * @notice Get ETH/USD price with fallback
     * @return Price in 8 decimals
     */
    function getEthPrice() public view returns (uint256) {
        try oracle.getLatestPrice(ETH_USD) returns (
            uint256 price,
            uint256 timestamp
        ) {
            // Check if price is fresh (< 2 hours)
            if (block.timestamp - timestamp < 2 hours) {
                return price;
            }
        } catch {
            // Oracle failed, use fallback
        }
        
        // Fallback to Chainlink
        return _getChainlinkPrice();
    }
    
    function _getChainlinkPrice() internal view returns (uint256) {
        (, int256 price,,,) = AggregatorV3Interface(chainlinkFallback)
            .latestRoundData();
        require(price > 0, "Invalid Chainlink price");
        return uint256(price);
    }
    
    /**
     * @notice Calculate collateral value in USD
     * @param ethAmount Amount of ETH collateral
     * @return USD value (8 decimals)
     */
    function getCollateralValue(uint256 ethAmount) 
        public 
        view 
        returns (uint256) 
    {
        uint256 ethPrice = getEthPrice();
        return (ethAmount * ethPrice) / 1e18;  // ETH has 18 decimals
    }
    
    /**
     * @notice Check if position is safe
     * @param positionId CDP position ID
     * @return True if collateral ratio > 150%
     */
    function isSafe(uint256 positionId) public view returns (bool) {
        Position memory pos = positions[positionId];
        
        uint256 collateralValue = getCollateralValue(pos.ethCollateral);
        uint256 debtValue = pos.dfcDebt;  // DFC is $1 peg
        
        uint256 ratio = (collateralValue * 100) / debtValue;
        return ratio >= 150;  // 150% minimum ratio
    }
}
```

### 3. Auction Contract

**Location**: `contracts/Auction.sol`

**Current**: Uses Chainlink for liquidation pricing

**Changes Needed**:

```solidity
contract Auction {
    IOraclePriceFeed public oracle;
    bytes32 public constant ETH_USD = keccak256("ETH/USD");
    
    /**
     * @notice Calculate starting bid for auction
     * @param ethAmount ETH collateral being auctioned
     * @return Starting bid in DFC
     */
    function calculateStartingBid(uint256 ethAmount) 
        public 
        view 
        returns (uint256) 
    {
        (uint256 ethPrice,) = oracle.getLatestPrice(ETH_USD);
        
        uint256 collateralValue = (ethAmount * ethPrice) / 1e18;
        
        // Start auction at 95% of collateral value (5% discount)
        return (collateralValue * 95) / 100;
    }
}
```

### 4. ExchangeRate Contract

**Location**: `contracts/ExchangeRateContract.sol`

**Current**: Stores ETH/USD price, updated manually

**Changes Needed**:

```solidity
contract ExchangeRateContract {
    IOraclePriceFeed public oracle;
    bytes32 public constant ETH_USD = keccak256("ETH/USD");
    
    event PriceUpdated(uint256 newPrice, uint256 timestamp, string source);
    
    /**
     * @notice Get current ETH/USD price
     * @return Price in 6 decimals (DotFlat standard)
     */
    function getPrice() external view returns (uint256) {
        (uint256 price,) = oracle.getLatestPrice(ETH_USD);
        
        // Convert from 8 decimals to 6 decimals
        return price / 100;
    }
    
    /**
     * @notice Manual price update (emergency only)
     * @param newPrice Price in 6 decimals
     */
    function setPrice(uint256 newPrice) external onlyOwner {
        // Only allow if oracle is stale (> 4 hours)
        try oracle.getLatestPrice(ETH_USD) returns (
            uint256 oraclePrice,
            uint256 timestamp
        ) {
            require(
                block.timestamp - timestamp > 4 hours,
                "Oracle still active"
            );
        } catch {}
        
        emit PriceUpdated(newPrice, block.timestamp, "manual");
    }
}
```

---

## Frontend Integration

### 1. Web3Context.js

**Location**: `src/context/Web3Context.js`

**Changes**:

```javascript
// Add oracle contract
import OraclePriceFeedABI from '../contracts/OraclePriceFeed.json';
import OracleRegistryABI from '../contracts/OracleRegistry.json';

// In initContracts()
const oraclePriceFeed = new web3.eth.Contract(
  OraclePriceFeedABI.abi,
  ORACLE_PRICE_FEED_ADDRESS
);

const oracleRegistry = new web3.eth.Contract(
  OracleRegistryABI.abi,
  ORACLE_REGISTRY_ADDRESS
);

setContracts(prev => ({
  ...prev,
  oraclePriceFeed,
  oracleRegistry
}));

// Add oracle price fetching
const fetchOraclePrices = async () => {
  try {
    const commodities = [
      { id: web3.utils.keccak256('XAU/USD'), name: 'Gold' },
      { id: web3.utils.keccak256('XAG/USD'), name: 'Silver' },
      { id: web3.utils.keccak256('CL/USD'), name: 'Oil' }
    ];
    
    const prices = {};
    
    for (const commodity of commodities) {
      const result = await oraclePriceFeed.methods
        .getLatestPrice(commodity.id)
        .call();
      
      prices[commodity.name] = {
        value: result.price / 1e8,  // Convert from 8 decimals
        timestamp: result.timestamp
      };
    }
    
    setCommodityPrices(prices);
  } catch (error) {
    console.error('Failed to fetch oracle prices:', error);
  }
};

// Poll every 5 minutes
useEffect(() => {
  fetchOraclePrices();
  const interval = setInterval(fetchOraclePrices, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [contracts]);
```

### 2. New Component: OracleStatus.js

**Location**: `src/components/OracleStatus.js`

```javascript
import React, { useState, useEffect } from 'react';

export default function OracleStatus({ contracts, web3 }) {
  const [oracles, setOracles] = useState([]);
  const [commodityPrices, setCommodityPrices] = useState({});
  
  useEffect(() => {
    if (!contracts?.oracleRegistry || !contracts?.oraclePriceFeed) return;
    
    loadOracleData();
  }, [contracts]);
  
  const loadOracleData = async () => {
    try {
      // Get active oracles
      const activeOracles = await contracts.oracleRegistry.methods
        .getActiveOracles()
        .call();
      
      // Get details for each oracle
      const oracleDetails = await Promise.all(
        activeOracles.map(async (addr) => {
          const oracle = await contracts.oracleRegistry.methods
            .oracles(addr)
            .call();
          
          const weight = await contracts.oracleRegistry.methods
            .getVotingWeight(addr)
            .call();
          
          const accuracy = oracle.totalReports > 0
            ? (oracle.accurateReports * 100 / oracle.totalReports).toFixed(1)
            : 'N/A';
          
          return {
            address: addr,
            stake: web3.utils.fromWei(oracle.stakedAmount, 'ether'),
            weight: web3.utils.fromWei(weight, 'ether'),
            accuracy: accuracy,
            reports: oracle.totalReports
          };
        })
      );
      
      setOracles(oracleDetails);
      
      // Get latest prices
      const goldPrice = await contracts.oraclePriceFeed.methods
        .getLatestPrice(web3.utils.keccak256('XAU/USD'))
        .call();
      
      setCommodityPrices({
        gold: {
          price: (goldPrice.price / 1e8).toFixed(2),
          timestamp: new Date(goldPrice.timestamp * 1000).toLocaleString()
        }
      });
      
    } catch (error) {
      console.error('Failed to load oracle data:', error);
    }
  };
  
  return (
    <div className="oracle-status">
      <h2>Oracle Network Status</h2>
      
      <div className="commodity-prices">
        <h3>Commodity Prices</h3>
        {Object.entries(commodityPrices).map(([name, data]) => (
          <div key={name} className="price-item">
            <span>{name}: ${data.price}</span>
            <span className="timestamp">Updated: {data.timestamp}</span>
          </div>
        ))}
      </div>
      
      <div className="oracle-list">
        <h3>Active Oracles ({oracles.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Oracle</th>
              <th>Stake (RLE)</th>
              <th>Weight</th>
              <th>Accuracy</th>
              <th>Reports</th>
            </tr>
          </thead>
          <tbody>
            {oracles.map(oracle => (
              <tr key={oracle.address}>
                <td>{oracle.address.slice(0, 10)}...</td>
                <td>{parseFloat(oracle.stake).toLocaleString()}</td>
                <td>{parseFloat(oracle.weight).toLocaleString()}</td>
                <td>{oracle.accuracy}%</td>
                <td>{oracle.reports}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 3. New Page: BecomeOracle.js

**Location**: `src/components/BecomeOracle.js`

```javascript
import React, { useState, useEffect } from 'react';

export default function BecomeOracle({ contracts, web3, account }) {
  const [stakeAmount, setStakeAmount] = useState('10000');
  const [rleBalance, setRleBalance] = useState('0');
  const [isOracle, setIsOracle] = useState(false);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!account || !contracts?.rule) return;
    
    loadUserData();
  }, [account, contracts]);
  
  const loadUserData = async () => {
    try {
      // Get RLE balance
      const balance = await contracts.rule.methods.balanceOf(account).call();
      setRleBalance(web3.utils.fromWei(balance, 'ether'));
      
      // Check if already an oracle
      const oracle = await contracts.oracleRegistry.methods
        .oracles(account)
        .call();
      setIsOracle(oracle.active);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };
  
  const handleRegister = async () => {
    if (!account || !contracts) return;
    
    setLoading(true);
    
    try {
      const stakeWei = web3.utils.toWei(stakeAmount, 'ether');
      
      // Step 1: Approve RLE
      await contracts.rule.methods
        .approve(contracts.oracleRegistry._address, stakeWei)
        .send({ from: account });
      
      // Step 2: Register as oracle
      await contracts.oracleRegistry.methods
        .registerOracle(stakeWei)
        .send({ from: account });
      
      alert('Successfully registered as oracle!');
      loadUserData();
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Failed to register: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="become-oracle">
      <h2>Become an Oracle</h2>
      
      {isOracle ? (
        <div className="already-oracle">
          <p>✅ You are already an active oracle!</p>
          <button onClick={() => window.location.href = '/oracle-dashboard'}>
            Go to Oracle Dashboard
          </button>
        </div>
      ) : (
        <div className="registration-form">
          <p>Your RLE Balance: <b>{parseFloat(rleBalance).toLocaleString()}</b></p>
          
          <div className="form-group">
            <label>Stake Amount (RLE)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min="10000"
              placeholder="Minimum 10,000 RLE"
            />
            <small>Minimum: 10,000 RLE</small>
          </div>
          
          <button
            onClick={handleRegister}
            disabled={loading || parseFloat(stakeAmount) < 10000}
          >
            {loading ? 'Processing...' : 'Register as Oracle'}
          </button>
          
          <div className="info-box">
            <h4>What does an oracle do?</h4>
            <ul>
              <li>Submit commodity price reports hourly</li>
              <li>Earn rewards for accurate reporting</li>
              <li>Help secure the DotFlat protocol</li>
              <li>Voting power proportional to stake</li>
            </ul>
            
            <h4>Requirements</h4>
            <ul>
              <li>Minimum 10,000 RLE staked</li>
              <li>Run oracle node software 24/7</li>
              <li>Access to commodity price APIs</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Oracle Node Setup

### Node Software (Python)

**Location**: `oracle-node/main.py`

```python
import asyncio
import json
from web3 import Web3
from eth_account import Account
import requests
import time

# Configuration
RPC_URL = "https://mainnet.infura.io/v3/YOUR_KEY"
ORACLE_REGISTRY_ADDRESS = "0x..."
ORACLE_PRICE_FEED_ADDRESS = "0x..."
PRIVATE_KEY = "0x..."  # Oracle's private key

# ABIs
PRICE_FEED_ABI = json.load(open('abis/OraclePriceFeed.json'))

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = Account.from_key(PRIVATE_KEY)

price_feed = w3.eth.contract(
    address=ORACLE_PRICE_FEED_ADDRESS,
    abi=PRICE_FEED_ABI
)

# Price sources
def fetch_gold_price():
    """Fetch gold price from multiple sources"""
    sources = []
    
    # Source 1: Metals-API.com
    try:
        r = requests.get('https://metals-api.com/api/latest?access_key=YOUR_KEY&base=USD&symbols=XAU')
        data = r.json()
        price = 1 / data['rates']['XAU']  # XAU/USD
        sources.append(price)
    except:
        pass
    
    # Source 2: Gold-API.com
    try:
        r = requests.get('https://www.gold-api.com/api/XAU/USD')
        data = r.json()
        price = data['price']
        sources.append(price)
    except:
        pass
    
    # Source 3: Bullion Vault
    # ... add more sources ...
    
    if not sources:
        raise Exception("No price sources available")
    
    # Return median of all sources
    sources.sort()
    return sources[len(sources) // 2]

def report_price(commodity_id, price):
    """Submit price report to blockchain"""
    try:
        # Convert price to 8 decimals
        price_scaled = int(price * 1e8)
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        
        tx = price_feed.functions.reportPrice(
            commodity_id,
            price_scaled
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 200000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        print(f"✅ Reported {commodity_id}: ${price} (tx: {tx_hash.hex()})")
        
        return tx_hash
    
    except Exception as e:
        print(f"❌ Failed to report price: {e}")
        return None

async def main_loop():
    """Main oracle loop"""
    GOLD_ID = w3.keccak(text='XAU/USD')
    
    while True:
        try:
            # Fetch price
            price = fetch_gold_price()
            print(f"📊 Gold price: ${price:.2f}")
            
            # Report to blockchain
            report_price(GOLD_ID, price)
            
            # Wait 1 hour before next report
            await asyncio.sleep(3600)
            
        except Exception as e:
            print(f"❌ Error in main loop: {e}")
            await asyncio.sleep(60)  # Retry in 1 minute

if __name__ == '__main__':
    print("🚀 Starting DotFlat Oracle Node")
    asyncio.run(main_loop())
```

---

## Migration Strategy

### Phase 1: Parallel Operation (Week 1-2)

```
Chainlink (Primary) ──┐
                      ├──> DotFlat
Oracle (Testing) ─────┘
```

- Deploy oracle contracts
- Run 3 team-operated oracle nodes
- Monitor oracle vs Chainlink prices
- **No production use yet**

### Phase 2: Hybrid (Week 3-4)

```
Oracle (Primary) ─────┐
                      ├──> DotFlat
Chainlink (Fallback) ─┘
```

- Switch CDP/Auction to use oracle with Chainlink fallback
- Monitor for any issues
- Increase oracle count to 5

### Phase 3: Full Migration (Week 5+)

```
Oracle (Only) ────────> DotFlat
```

- Remove Chainlink dependency (keep as emergency backup)
- Open oracle registration to public
- 10+ independent oracles

### Rollback Plan

If critical issues:

```solidity
// Emergency function in CDP
function switchToChainlink() external onlyOwner {
    useChainlink = true;
    emit EmergencyFallback("Switched to Chainlink");
}
```

---

## Testing Checklist

- [ ] Oracle registration works
- [ ] Price reporting works
- [ ] Weighted median calculates correctly
- [ ] Slashing triggers on outliers
- [ ] CDP uses oracle prices correctly
- [ ] Auction uses oracle prices correctly
- [ ] Frontend displays oracle data
- [ ] Fallback to Chainlink works
- [ ] Circuit breaker triggers on extreme deviation
- [ ] Governance can update parameters

---

**Next**: See `ORACLE-DEPLOYMENT.md` for deployment instructions.
