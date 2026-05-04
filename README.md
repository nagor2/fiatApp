# 🌐 dotFlat — DeFi Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![Ethereum](https://img.shields.io/badge/Ethereum-Mainnet-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)

Full-stack frontend for the [dotFlat collateralized stablecoin protocol](https://github.com/nagor2/cryptoFiat).  
Users manage CDP positions, deposits, auctions, and liquidity pools — all backed by a Redis-cached contract layer and a real-time block-watcher service.

[![dApp](https://img.shields.io/badge/dApp-beta.app.dotflat.io-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://beta.app.dotflat.io)

---

## 🏗️ Architecture

```
                    Browser
                       │
              ┌────────┴────────┐
              │   Nginx / React  │  :8008 (prod) · :3000 (dev)
              └────────┬────────┘
                       │
         ┌─────────────┼──────────────┐
         │             │              │
    /api/contracts  /api/worker   /api/rpc
         │             │              │
         ▼             ▼              ▼
  ┌────────────┐ ┌───────────┐  Ethereum RPC
  │  Backend   │ │  Block    │  (publicnode /
  │  Express   │ │  Watcher  │   Infura / etc)
  │  :3001     │ │  :3002    │
  └─────┬──────┘ └─────┬─────┘
        │               │ WebSocket
        └───────┬────────┘
                ▼
          ┌──────────┐
          │  Redis   │  60s TTL · auto-invalidated on tx
          │  :6379   │
          └──────────┘
```

## 🧩 Services

| Service | Port | Description |
|---|---|---|
| **Frontend** | 8008 / 3000 | React 19 SPA served by Nginx in prod, CRA dev server locally |
| **Backend** | 3001 | Express API — aggregates contract reads, serves cached responses |
| **Block Watcher** | 3002 / 3003 | Monitors new blocks via WebSocket, invalidates Redis on tx |
| **Redis** | 6379 | Shared cache — TTL 60s, write-through invalidation by watcher |

## 🔑 Key Design Decisions

- 📡 **WebSocket block monitoring** — 1 subscription replaces N×polling; 50× RPC load reduction
- 💾 **Three-layer cache** — component state → Redis (60s TTL, auto-invalidated) → Ethereum RPC
- 🔒 **Circuit breaker** — `workerCircuitBreaker.js` degrades gracefully when the watcher is unavailable
- 🌐 **Nginx RPC proxy** — `/api/rpc` solves browser CORS and enables future server-side caching
- ⚡ **Lazy-loaded pages** — React Suspense + code splitting for fast initial load
- 🔄 **DAO-gated contract calls** — only authorized addresses can mutate; all reads go through cache

## 🛠️ Tech Stack

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux-764ABC?style=flat-square&logo=redux&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Web3.js](https://img.shields.io/badge/Web3.js-F16822?style=flat-square&logo=web3dotjs&logoColor=white)
![ethers.js](https://img.shields.io/badge/ethers.js-v6-2535a0?style=flat-square)
![Uniswap](https://img.shields.io/badge/Uniswap_V4_SDK-FF007A?style=flat-square&logo=uniswap&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22b5bf?style=flat-square)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=flat-square&logo=nginx&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/K3s-326CE5?style=flat-square&logo=kubernetes&logoColor=white)
![GitLab CI](https://img.shields.io/badge/GitLab_CI-FC6D26?style=flat-square&logo=gitlab&logoColor=white)

## 🚀 Getting Started

### Docker Compose (recommended)

```bash
# Development — hot reload, production-like RPC proxy
docker compose --profile dev up -d
# → http://localhost:3008

# Development LOCAL — hot reload against a local Ganache/Hardhat node (:8545)
docker compose --profile dev-local up -d
# → http://localhost:3007

# Production — optimized build + full stack (frontend, backend, watcher, redis)
docker compose --profile prod up -d
# → http://localhost:8008

# Workers only — block-watcher + redis, no frontend
docker compose --profile workers up
# health: http://localhost:3002/health
```

### Native

```bash
npm install
npm start          # dev server → http://localhost:3000
npm run build      # production build → /build
npm test           # jest test runner
```

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Purpose |
|---|---|---|
| `REACT_APP_ETHERSCAN_API_KEY` | — | ETH price fetch via Etherscan |
| `REACT_APP_WALLETCONNECT_PROJECT_ID` | — | WalletConnect modal |
| `REACT_APP_RPC_URL` | `/api/rpc` | RPC endpoint (proxied or direct URL) |
| `REACT_APP_WORKERS_HEALTH_URL` | `/api/worker/health` | Block watcher health endpoint |
| `RPC_WS_URL` | `wss://ethereum.publicnode.com` | Block watcher WebSocket RPC |
| `RPC_HTTP_URL` | `https://ethereum.publicnode.com` | Block watcher HTTP RPC |
| `START_BLOCK` | `21677704` | Block watcher indexing start |
| `ETHERSCAN_API_KEY` | — | ABI fetching for watched contracts |
| `CACHE_TTL` | `60` | Redis TTL in seconds |
| `LOG_LEVEL` | `info` | Backend / watcher log level |

## 🌐 Smart Contracts (Ethereum Mainnet)

| Contract | Address |
|---|---|
| INTDAO (governance) | [0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122](https://etherscan.io/address/0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122) |
| CDP | [0xbCf58DE37791eFe60fE87a6d420FE8F7AEA99ef8](https://etherscan.io/address/0xbCf58DE37791eFe60fE87a6d420FE8F7AEA99ef8) |
| flatCoin (DFC, ERC-20) | [0x1F709Cfa0C409E158C68EdcD32453809c9Eb69EE](https://etherscan.io/address/0x1F709Cfa0C409E158C68EdcD32453809c9Eb69EE) |
| Deposit | [0x44881F5ac2938AAaF4260d7DBE18997318788f9f](https://etherscan.io/address/0x44881F5ac2938AAaF4260d7DBE18997318788f9f) |
| Auction | [0xBdFb52d4C9fBdE41805abBb206465aca3b3499D6](https://etherscan.io/address/0xBdFb52d4C9fBdE41805abBb206465aca3b3499D6) |
| Rule Token (RLE) | [0x3Dfa45997ddB7980Eb4D73CBfCf0E024F05b08a3](https://etherscan.io/address/0x3Dfa45997ddB7980Eb4D73CBfCf0E024F05b08a3) |
| Exchange Rate | [0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B](https://etherscan.io/address/0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B) |

Full contract config: `src/utils/config.js`

## 🚢 Deployment

CI/CD via GitLab pipeline (`.gitlab-ci.yml`):
- **Build** — Kaniko (containerless) → GitLab Container Registry
- **develop** branch → auto-deploy to `beta.app.dotflat.io`
- **master** branch → auto-deploy to `app.dotflat.io`
- Orchestration: Kubernetes (K3s), rolling updates via `kubectl set image`

See [k8s/README.md](k8s/README.md) for cluster setup notes (Redis namespace, FQDN config).

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md).

## 📚 Documentation

- [Quick Start](docs/QUICK-START.md) — choosing the right dev mode
- [Docker Setup](docs/README-DOCKER.md) — Compose profiles explained
- [Workers](docs/WORKERS.md) — block-watcher architecture deep dive
- [Block Watcher Page](docs/BLOCK-WATCHER-PAGE.md) — cache inspection UI
- [RPC Proxy](docs/RPC-PROXY.md) — CORS solution and proxy config
- [Caching](docs/CACHING.md) — three-layer cache strategy
- [Routing](docs/ROUTING.md) — client-side routing and deep linking
- [Event Fetching](docs/EVENT-FETCHING.md) — block range limit workarounds
- [Uniswap Integration](docs/UNISWAP-INTEGRATION.md) — swap/pool logic
- [Oracle](docs/ORACLE-PRICE-FEED.md) — commodities price feed system
