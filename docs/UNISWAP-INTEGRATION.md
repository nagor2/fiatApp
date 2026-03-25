# Uniswap & WalletConnect Integration

## Overview

This document describes the integration of Uniswap V4 DFC quotes and WalletConnect wallet connection in the app-dotflat project.

## Architecture

### 1. RPC Provider with Fallback (`src/utils/rpc-provider.js`)

Provides automatic fallback between multiple RPC providers:
- PublicNode (primary)
- LlamaRPC (fallback)
- Rivet (fallback)

Usage:
```javascript
import { withFallback, getRpcProvider } from '../utils/rpc-provider';

const result = await withFallback(async (provider) => {
  // Your code using provider
  return await contract.someMethod();
});
```

### 2. Uniswap Configuration (`src/utils/uniswap-config.js`)

Centralized configuration for:
- Token addresses (ETH, WETH, USDC, DFC)
- Token metadata (decimals, symbols, names)
- Uniswap V3 contract addresses
- Uniswap V4 contract addresses
- Pool IDs and settings

### 3. Uniswap Quoter (`src/utils/uniswap-quoter.js`)

Provides functions to fetch prices from Uniswap:

#### Get DFC Price in ETH (from Uniswap V4)
```javascript
import { getDfcPriceInEth } from '../utils/uniswap-quoter';

const result = await getDfcPriceInEth();
// Returns: { priceInETH: 0.00012345, source: 'uniswap-v4-quoter', gasEstimate: '123456' }
```

#### Get ETH Price in USD (from Uniswap V3)
```javascript
import { getEthPriceInUsd } from '../utils/uniswap-quoter';

const result = await getEthPriceInUsd();
// Returns: { priceInUSD: 2543.21, source: 'uniswap-v3-usdc-weth', tick: 12345 }
```

#### Get Pool Liquidity Info
```javascript
import { getPoolLiquidityInfo } from '../utils/uniswap-quoter';

const info = await getPoolLiquidityInfo();
// Returns: { liquidity, sqrtPriceX96, tick, fee, source, blockNumber }
```

### 4. WalletConnect Integration (`src/utils/walletconnect.js`)

Provides WalletConnect v2 integration via Web3Modal (Reown AppKit):

```javascript
import { 
  initWalletConnect,
  connectWithWalletConnect,
  disconnectWalletConnect,
  isWalletConnectConnected,
  subscribeToWalletConnectEvents 
} from '../utils/walletconnect';

// Initialize (done automatically on app load)
initWalletConnect();

// Connect wallet
const { address, provider, signer } = await connectWithWalletConnect();

// Disconnect
await disconnectWalletConnect();

// Subscribe to events
subscribeToWalletConnectEvents(
  (accounts) => console.log('Account changed:', accounts),
  (chainId) => console.log('Chain changed:', chainId),
  () => console.log('Disconnected')
);
```

### 5. Global State Management (`src/contexts/Web3Context.js`)

The Web3Context now stores multiple ETH price sources:

- `ethPrice` - Price from Oracle contract (string, e.g., "2543.21")
- `ethPriceEtherscan` - Price from Etherscan API (number or null)
- `ethPriceUniswap` - Price from Uniswap V3 USDC/WETH pool (number or null)
- `ethPriceLastUpdate` - Last update timestamp from Oracle contract

Prices are fetched automatically:
- On app initialization
- Every 60 seconds thereafter

Usage in components:
```javascript
import { useWeb3 } from '../contexts/Web3Context';

function MyComponent() {
  const { ethPrice, ethPriceEtherscan, ethPriceUniswap } = useWeb3();
  
  // Use prices...
  const dfcPriceUSD = dfcPriceInETH * ethPriceUniswap;
}
```

### 6. Test Page (`/test/wallet`)

A dedicated test page at `http://localhost:3008/test/wallet` provides:
- DFC token information display
- WalletConnect connection UI
- DFC price fetching from Uniswap V4
- DFC price in USD calculation (DFC in ETH × ETH in USD)
- Pool liquidity information
- Display of all three ETH price sources

## Dependencies

New packages added to `package.json`:
- `@uniswap/sdk-core@^7.7.2` - Uniswap SDK core
- `@uniswap/v4-sdk@^1.21.4` - Uniswap V4 SDK
- `@web3modal/ethers@^4.2.3` - Web3Modal for WalletConnect
- `ethers@^6.15.0` - Ethereum library

## Configuration

### WalletConnect Project ID

Set in `.env` file:
```
REACT_APP_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get a free project ID at: https://cloud.walletconnect.com/

### RPC Endpoints

The integration uses public RPC endpoints with automatic fallback:
1. PublicNode: `https://ethereum-rpc.publicnode.com`
2. LlamaRPC: `https://eth.llamarpc.com`
3. Rivet: `https://eth.rpc.rivet.cloud/...`

## Testing

1. Start the dev container:
   ```bash
   docker compose --profile dev --profile workers up -d
   ```

2. Open the test page:
   ```
   http://localhost:3008/test/wallet
   ```

3. Test features:
   - View DFC token information
   - Connect wallet via WalletConnect
   - Fetch DFC price in ETH from Uniswap V4
   - View calculated DFC price in USD
   - Check pool liquidity information
   - Compare ETH prices from different sources

## Implementation Notes

### Uniswap V4 Pool Configuration

The DFC/ETH pool on Uniswap V4 uses:
- Pool ID: `0xCA0A1A9AB72C583A8CCD487E6D8C75BCC62F9792B4C8C5AEDD1707FE2B8BD3CF`
- currency0: Native ETH (`0x0000000000000000000000000000000000000000`)
- currency1: DFC (`0x1f709cfa0c409e158c68edcd32453809c9eb69ee`)
- Fee: 3000 (0.3%)
- Tick Spacing: 60
- Hooks: None

### Uniswap V3 Pool for ETH/USD

Uses the USDC/WETH pool (0.05% fee tier) for most accurate pricing:
- Pool Address: `0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640`
- Most liquid pool for ETH/USD conversion

## Price Calculation Flow

1. **ETH Price from Oracle**: Fetched once on app init from `oracle.getPrice('eth')`
2. **ETH Price from Etherscan**: Fetched every 60s from Etherscan API
3. **ETH Price from Uniswap**: Fetched every 60s from Uniswap V3 USDC/WETH pool
4. **DFC Price in ETH**: Fetched on-demand from Uniswap V4 DFC/ETH pool via Quoter
5. **DFC Price in USD**: Calculated as `DFC_in_ETH × ETH_in_USD (Uniswap)`

## Maintenance

### Updating Token Addresses

Edit `src/utils/uniswap-config.js`:
```javascript
export const UNISWAP_CONFIG = {
  TOKENS: {
    DFC: '0x...',  // Update here
    // ...
  },
  // ...
};
```

### Updating Pool IDs

If pools change, update in `src/utils/uniswap-config.js`:
```javascript
POOLS: {
  DFC_ETH_V4: '0x...',  // New pool ID
  // ...
}
```

## Troubleshooting

### "All RPC providers unavailable"
- Check internet connection
- Verify RPC endpoints are not rate-limited
- Check browser console for CORS errors

### "Module not found: ethers"
- Rebuild Docker container: `docker compose --profile dev build app-dev`
- Restart container: `docker compose restart app-dev`

### "WalletConnect Project ID not configured"
- Get free Project ID from https://cloud.walletconnect.com/
- Add to `.env`: `REACT_APP_WALLETCONNECT_PROJECT_ID=...`
- Restart dev server

## Future Improvements

- Add ETH price from additional sources (Chainlink, Compound, etc.)
- Implement price aggregation/averaging logic
- Add historical price tracking
- Cache Uniswap quotes to reduce RPC calls
- Add support for other DEX aggregators (1inch, Paraswap)
