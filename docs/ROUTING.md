# React Router Navigation

## Overview

The DotFlat application now uses React Router for client-side navigation with proper URL management and browser history support.

## Route Structure

### Public Routes (No wallet required)
- `/` - Home page with all panels overview
- `/auctions` - Auctions page
- `/auction/:auctionId` - Specific auction details (e.g., `/auction/1`)
- `/pools` - Liquidity pools page
- `/pool/:token1/:token2` - Specific pool (e.g., `/pool/DFC/ETH`)
- `/contracts` - Smart contracts page
- `/contracts/:contractName` - Specific contract details (e.g., `/contracts/DFC`)
- `/commodities` - Commodities page
- `/commodity/:commodityName` - Specific commodity details (e.g., `/commodity/Gold`)
- `/charts-demo` - Charts demonstration page

### Protected Routes (Wallet required)
- `/balances` - Token balances page
- `/credits` or `/cdp` - Credit positions (CDP) page
- `/debtPositions/:id` - Specific debt position details (e.g., `/debtPositions/123`)
- `/deposits` - Deposits page
- `/deposit/:depositId` - Specific deposit details (e.g., `/deposit/456`)

### Error Handling
- `*` - 404 Not Found page for invalid routes

## Architecture

### Web3Context Provider
Global state management for Web3 connection:
- `web3` - Web3 instance
- `account` - Connected wallet address
- `contracts` - Initialized smart contracts
- `walletConnected` - Connection status
- `ethPrice` - Current ETH price
- `getAccount()` - Function to connect wallet

### Layout Component
Common layout with:
- Header with logo, wallet connection, and ETH price
- Click on logo to return to home page

### Page Components
Each route has a dedicated page component:
- `HomePage` - Main dashboard with all panels
- `BalancesPage` - Token balances management
- `CreditsPage` - CDP management
- `DepositsPage` - Deposits management
- `AuctionsPage` - Auctions view
- `PoolsPage` - Liquidity pools
- `ContractsPage` - Smart contracts info
- `CommoditiesPage` - Commodities view
- `NotFoundPage` - 404 error page

## Navigation

### URL-based Navigation
When users click on items in panels (contracts, commodities, auctions, deposits, pools), the URL automatically updates to reflect the selected item:

- Clicking on a contract → URL changes to `/contracts/:contractName`
- Clicking on a commodity → URL changes to `/commodity/:commodityName`
- Clicking on a debt position → URL changes to `/debtPositions/:id`
- Clicking on an auction → URL changes to `/auction/:auctionId`
- Clicking on a deposit → URL changes to `/deposit/:depositId`
- Clicking on a pool → URL changes to `/pool/:token1/:token2`

The page remains the same, but the URL updates to allow:
- Direct linking to specific items
- Browser back/forward navigation
- Bookmarking specific items
- Sharing URLs with others

### EventEmitter Integration
The existing EventEmitter system is preserved for:
- Opening detailed views within panels
- Triggering actions (Plus button)
- Inter-component communication
- Dual system: both URL updates AND EventEmitter events fire on item clicks

## Browser History

- Full support for browser back/forward buttons
- URL reflects current page
- Deep linking works (can share URLs to specific pages)
- Clean URLs without hash fragments

## State Persistence

Web3 connection state persists across routes:
- Wallet connection maintained
- Contracts remain initialized
- No re-initialization on route changes
- EventEmitter shared across all pages

## Development

Access the development server at: http://localhost:3008

## Usage Examples

```javascript
// Navigate programmatically
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/balances');

// Create links
import { Link } from 'react-router-dom';

<Link to="/deposits">Go to Deposits</Link>

// Access Web3 context
import { useWeb3 } from '../contexts/Web3Context';

const { web3, account, contracts } = useWeb3();
```

## Implementation Details

### Product Component Navigation
The `Product` component handles clicks and:
1. Emits `change-state` event via EventEmitter (preserves existing behavior)
2. Updates browser URL using `navigate()` based on section type
3. URL structure determined by section and item properties

### URL Construction Logic
- **Contracts**: Uses `title` property (e.g., DFC, CDP, RLE)
- **Commodities**: Uses `title` property (e.g., Gold, Silver)
- **Debt Positions**: Uses `id` property
- **Auctions**: Uses `id` property
- **Deposits**: Uses `id` property
- **Pools**: Parses `name` property (format: "TOKEN1/TOKEN2")

## Future Enhancements

Potential improvements:
- Query parameters for filtering
- Route guards for wallet-protected pages
- Loading states during route transitions
- URL parameter validation
