# RPC & Worker Proxy Configuration

## Проблема

Прямое обращение к внешним сервисам из браузера на `https://beta.app.dotflat.io`
упирается в две вещи:

1. **CORS для внешнего RPC.** Многие публичные Ethereum RPC не выставляют
   `Access-Control-Allow-Origin`, поэтому preflight падает и браузер не даёт
   прочитать ответ.
2. **Private Network Access для воркеров.** Если фронтенд пытается стучаться в
   `http://localhost:3002/health`, Chrome блокирует такой запрос как доступ
   публичного origin к loopback-пространству клиента.

## Решение

Всё, что фронтенд делает «налево», проходит через nginx того же origin:

```
Browser (beta.app.dotflat.io)
 ├─ /api/rpc/*       → ethereum-rpc.publicnode.com   (RPC)
 ├─ /api/contracts/* → backend.app-dotflat.svc:3001  (кэш контрактов)
 └─ /api/worker/*    → watcher.app-dotflat.svc:3002  (block-watcher health/events/tx)
```

Так нет ни CORS, ни обращений к клиентскому localhost.

## Реализация

### Production (nginx.conf)

`nginx.conf` содержит три `location`:

- `/api/rpc` → `https://ethereum-rpc.publicnode.com` (с rewrite префикса и CORS
  заголовками на случай обращения со стороннего origin).
- `/api/contracts` → `backend.app-dotflat.svc.cluster.local:3001`.
- `/api/worker/` → `watcher.app-dotflat.svc.cluster.local:3002` (rewrite
  обрезает `/api/worker/` из пути, на upstream уходит исходный путь воркера).

Все upstream'ы резолвятся kube-dns в рантайме, чтобы контейнер не падал при
старте, если целевой Service временно недоступен.

### Development (src/setupProxy.js)

Для `npm start` / hot-reload (`react-scripts`) используется
`http-proxy-middleware`, который проксирует `/api/rpc` в тот же публичный RPC.

### Код фронтенда

`src/utils/config.js`:

```javascript
// RPC
config.rpc = process.env.REACT_APP_RPC_URL || "/api/rpc";

// Worker health/API
config.workersHealthUrl = process.env.REACT_APP_WORKERS_HEALTH_URL
                      || "/api/worker/health";
```

Относительные пути автоматически «абсолютизируются» через
`window.location.origin`, чтобы Web3.js получил полный URL.

## Переопределение в dev

`.env`:

```bash
# Локальный RPC
REACT_APP_RPC_URL=http://localhost:8545

# Локальный воркер
REACT_APP_WORKERS_HEALTH_URL=http://localhost:3002/health
```

Если фронтенд раздаётся с `http://localhost`, браузер пустит такие запросы
напрямую (CORS/PNA для loopback-origin к loopback-upstream не действуют).

## Преимущества

1. **Нет CORS проблем** — запросы идут с того же origin.
2. **Нет loopback-проблем** — фронт не ходит в localhost клиента.
3. **RPC ключи / внутренние адреса не светятся в браузере.**
4. **Гибкость** — легко переключать RPC/воркер через переменные.
5. **Мониторинг** — все запросы логируются nginx.
