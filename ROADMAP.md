# Roadmap

## 🔧 Extract block-watcher as a standalone service

The `workers/block-watcher` service solves a generic problem: subscribe to Ethereum blocks via WebSocket, detect transactions affecting watched contract addresses, and invalidate a Redis cache in real-time. This reduces RPC load by ~50× compared to polling.

Currently it is coupled to this project's contract addresses and Redis key format. The plan is to extract it into a separate repository as a configurable Docker image:

- Contract addresses and watched methods defined via external config (JSON file or env vars)
- Generic Redis invalidation strategy (key prefix configurable)
- Health REST + WebSocket endpoints kept as-is
- Published to Docker Hub — users pull the image, pass a config, done

**Why it's worth it:** any DeFi frontend hitting RPC rate limits faces this exact problem. A ready-made solution with a clear Docker interface has real reuse value.

### Existing alternatives

No open-source project currently does all three steps (watch blocks → filter contracts → invalidate Redis) end-to-end. The closest tools:

| Project | Lang | Stars | Gap |
|---|---|---|---|
| [Eventeum](https://github.com/eventeum/eventeum) | Java | 507 | Webhook/Kafka output only — no Redis; effectively dormant since 2020 |
| [HydroProtocol/ethereum-watcher](https://github.com/HydroProtocol/ethereum-watcher) | Go | 197 | Plugin skeleton — Redis call would need to be added manually |
| [Neufund/smart-contract-watch](https://github.com/Neufund/smart-contract-watch) | JS | 328 | Outputs to terminal/Graylog only — no cache layer |
| [Ponder](https://github.com/ponder-sh/ponder) | TS | 1081 | Full indexer with Postgres — overkill for cache invalidation |

Every existing tool stops before the Redis step and leaves it to the consumer. The block-watcher here closes that loop natively — Redis cache invalidation is the primary output, not an afterthought.

**Positioning:** *lightweight, zero-config cache invalidator for DeFi frontends — not an indexer, not a full pipeline, just WebSocket → contract filter → Redis.*
