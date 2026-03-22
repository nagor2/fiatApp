# DotFlat Frontend

DotFlat is a collateralized stablecoin with permanent purchasing power. This is the frontend React application for interacting with the DotFlat ecosystem on Ethereum blockchain.

## Tech Stack

- **React** 19.0.1 - Modern UI framework
- **React Router** 6.28.0 - Client-side routing and navigation
- **Redux** 9.2.0 - State management
- **Web3** 4.16.0 - Blockchain integration
- **Node.js** 20 - Runtime environment
- **Nginx** - Production web server
- **Redis** 7 - Cache storage
- **Workers** - Background services (block-watcher, etc)

## Architecture

```
┌─────────────────┐
│  Frontend       │  React app (nginx in prod)
│  :3000 / :8008  │  UI + Web3 integration
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐
│  Workers        │←────→│  Redis       │
│  Block Watcher  │      │  Cache       │
│  :3002 :3003    │      │  :6379       │
└────────┬────────┘      └──────────────┘
         │
         ↓
    Ethereum RPC
    (WebSocket)
```

## Quick Start

### Using Docker (Recommended)

For local development and testing, we provide Docker Compose setup with multiple profiles:

**Development LOCAL mode (with local blockchain):**
```bash
# Требуется запущенный Ganache/Hardhat на порту 8545
docker compose --profile dev-local up -d
```
- URL: http://localhost:3007
- RPC: `http://localhost:8545` (локальная нода)
- Hot reload: включён

**Development mode (production-like RPC with hot reload):**
```bash
docker compose --profile dev up -d
```
- URL: http://localhost:3008
- RPC: `/api/rpc` → public RPC (через proxy)
- Hot reload: включён

**Production mode (full stack: frontend + redis + workers):**
```bash
docker compose --profile prod up -d
```
- URL: http://localhost:8008
- RPC: `/api/rpc` → public RPC (nginx proxy)
- Optimized build

**Workers only (for testing background services):**
```bash
docker compose --profile workers up
```
Health status: http://localhost:3002/health

📚 **Quick Start Guide**: [docs/QUICK-START.md](docs/QUICK-START.md) - выбор режима разработки  
📚 **Full Docker documentation**: [docs/README-DOCKER.md](docs/README-DOCKER.md)  
📚 **Workers documentation**: [docs/WORKERS.md](docs/WORKERS.md)  
📚 **RPC Proxy setup**: [docs/RPC-PROXY.md](docs/RPC-PROXY.md)  
📚 **Routing documentation**: [docs/ROUTING.md](docs/ROUTING.md)

## Navigation & Routing

The application uses **React Router** for client-side navigation with the following routes:

### Available Pages

**Public Routes** (no wallet connection required):
- `/` - Home page with overview of all sections
- `/auctions` - Active and past auctions
- `/auction/:auctionId` - Specific auction (e.g., `/auction/1`)
- `/pools` - Liquidity pools (Uniswap integration)
- `/pool/:token1/:token2` - Specific pool (e.g., `/pool/DFC/ETH`)
- `/contracts` - Smart contract addresses and info
- `/contracts/:contractName` - Specific contract (e.g., `/contracts/DFC`)
- `/commodities` - Commodity basket items
- `/commodity/:commodityName` - Specific commodity (e.g., `/commodity/Gold`)
- `/charts-demo` - Charts demonstration page
- `/block-watcher` - Block Watcher monitoring and cache inspection

**Protected Routes** (require wallet connection):
- `/balances` - Your token balances (ETH, DFC, RLE)
- `/credits` or `/cdp` - Your credit positions (CDP management)
- `/debtPositions/:id` - Specific debt position (e.g., `/debtPositions/123`)
- `/deposits` - Your active deposits
- `/deposit/:depositId` - Specific deposit (e.g., `/deposit/456`)

**Features:**
- Browser back/forward navigation works correctly
- URLs reflect current page and selected items
- Deep linking supported (shareable URLs to specific items)
- 404 page for invalid routes
- Web3 state persists across route changes
- Navigate via existing panel system and EventEmitter
- Dynamic routes for individual entities (contracts, commodities, auctions, deposits, pools, debt positions)

For detailed routing architecture, see [docs/ROUTING.md](docs/ROUTING.md)

### Native Development

Install dependencies:
```bash
npm install
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

---

## DotFlat Ecosystem

DotFlat is a fully collateralized and decentralized stablecoin pegged to a commodities index. The system includes:

- **DFC (DotFlat Coin)** - Stablecoin token
- **RLE (Rule Token)** - Governance and profit token
- **CDP** - Collateral Debt Positions
- **DAO** - Decentralized governance
- **Auction System** - Liquidation and buyback mechanism
- **Deposit Contract** - Interest earning deposits
- **Oracle** - Price feed system

### Smart Contracts

The application interacts with deployed smart contracts on Ethereum:
- DAO Address: `0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122`
- See `src/utils/config.js` for full contract configuration

## Features

- 📊 **Interactive Charts** - Recharts integration with 12+ chart types
  - Access demo: http://localhost:3000/charts-demo (dev) or http://localhost:8008/charts-demo (prod)
  - See `src/demo/` for examples
- 🔄 **Real-time Updates** - WebSocket integration with block-watcher
- 💾 **Smart Caching** - Redis cache for contract data optimization
- 🔗 **RPC Proxy** - CORS-free blockchain communication

## Documentation

- [Docker Setup Guide](docs/README-DOCKER.md) - Local development with Docker
- [Workers Service](docs/WORKERS.md) - Background services and block watcher
- [Block Watcher Page](docs/BLOCK-WATCHER-PAGE.md) - Monitoring page for cache inspection
- [Cache API Migration](docs/CACHE-API-MIGRATION.md) - Frontend migration guide
- [RPC Proxy](docs/RPC-PROXY.md) - CORS solution and RPC optimization
- [Event Fetching](docs/EVENT-FETCHING.md) - Solutions for block range limits
- [Charts Demo](src/demo/README.md) - Interactive chart examples
- [GitLab CI/CD](.gitlab-ci.yml) - Deployment pipeline configuration

## Deployment

### Environments

- **Development**: Auto-deployed from `develop` branch
- **Production**: Auto-deployed from `master` branch

Deployment pipeline uses:
- Kaniko for containerless Docker builds
- Kubernetes (K3s) for orchestration
- GitLab Container Registry

## Contributing

When making changes:
1. Test locally using Docker: `docker compose --profile dev up`
2. Verify production build: `docker compose --profile prod up --build`
3. Ensure all tests pass: `npm test`
4. Follow the existing code style

## License

This project is private and proprietary.
