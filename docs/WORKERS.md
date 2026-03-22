# Workers Service

## Архитектура

```
┌─────────────────────────┐
│   Frontend (nginx)      │
│   http://localhost:8008 │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐      ┌──────────────────┐
│   Workers (Node.js)     │←────→│  Redis (cache)   │
│   - Block Watcher       │      │  port: 6379      │
│   - Cache Invalidator   │      └──────────────────┘
│   Health: :3002         │
│   WS: :3003             │
└───────────┬─────────────┘
            │
            ↓
    Ethereum RPC (WebSocket)
    wss://eth.rpc.rivet.cloud
```

## Сервисы

### Block Watcher

**Функция:** Мониторинг блокчейна и автоматическая инвалидация кэша

**Как работает:**
1. Подключается к Ethereum через WebSocket (push модель)
2. Получает уведомления о каждом новом блоке
3. Фильтрует транзакции по отслеживаемым адресам
4. При обнаружении релевантной транзакции → инвалидирует кэш
5. Транслирует health status во frontend

**WebSocket vs Polling:**

```
Polling (неэффективно):
- 100 клиентов × запрос каждые 10 сек = 10 RPS
- Задержка до 10 секунд
- Постоянная нагрузка на RPC

WebSocket (эффективно):
- 1 subscription для всех клиентов
- Мгновенное уведомление
- ~0.2 RPS (только при новых блоках)
- 50x снижение нагрузки
```

## Запуск

### Production режим (полный стек)

```bash
# Запуск frontend + redis + workers
docker compose --profile prod up -d

# Проверка логов
docker compose logs -f app-workers

# Проверка health status
curl http://localhost:3002/health
```

### Только workers (для разработки/отладки)

```bash
# Запуск redis + workers
docker compose --profile workers up -d

# Пересборка воркера после изменений
docker compose --profile workers up -d --build app-workers
```

### Development режим frontend + workers

```bash
# Терминал 1: Frontend dev server
docker compose --profile dev up

# Терминал 2: Workers
docker compose --profile workers up
```

## Конфигурация

### Отслеживаемые адреса

Редактируйте `workers/block-watcher/config/watched-addresses.json`:

```json
{
  "contracts": [
    {
      "address": "0x123...",
      "name": "MainPool",
      "type": "pool",
      "description": "Основной пул ликвидности",
      "cachePrefix": "contract:mainpool"
    },
    {
      "address": "0x456...",
      "name": "AuctionContract",
      "type": "auction",
      "description": "Контракт аукциона",
      "cachePrefix": "contract:auction"
    }
  ],
  "settings": {
    "blockConfirmations": 1,
    "reconnectDelay": 5000,
    "healthBroadcastInterval": 5000
  }
}
```

### Переменные окружения

В `workers/block-watcher/.env`:

```bash
# WebSocket для real-time (рекомендуется)
RPC_WS_URL=wss://eth.rpc.rivet.cloud/YOUR_KEY

# HTTP fallback
RPC_HTTP_URL=https://eth.rpc.rivet.cloud/YOUR_KEY

# Redis
REDIS_URL=redis://redis:6379

# Ports
HEALTH_BROADCAST_PORT=3002

# Logging
LOG_LEVEL=info
```

## Health Status API

### HTTP Endpoint (для healthcheck)

```bash
GET http://localhost:3002/health
```

Ответ:
```json
{
  "status": "healthy",
  "lastNetworkBlock": 19234567,
  "lastNetworkBlockTime": "2026-03-22T12:34:56Z",
  "lastRelevantBlock": 19234560,
  "lastRelevantBlockTime": "2026-03-22T12:33:45Z",
  "watchedAddressesCount": 12,
  "cacheInvalidations": 45,
  "uptime": 3600000,
  "timestamp": "2026-03-22T12:34:56Z"
}
```

**Поля:**
- `status`: `healthy` | `degraded` | `error` | `initializing`
- `lastNetworkBlock`: последний блок в сети
- `lastNetworkBlockTime`: время последнего блока
- `lastRelevantBlock`: последний блок с релевантными транзакциями
- `lastRelevantBlockTime`: время последнего релевантного блока
- `uptime`: время работы воркера (ms)

### WebSocket Stream (для real-time UI)

```javascript
const ws = new WebSocket('ws://localhost:3003');

ws.onmessage = (event) => {
  const health = JSON.parse(event.data);
  
  // Обновляем UI
  updateNetworkStatus({
    blockNumber: health.lastNetworkBlock,
    blockTime: health.lastNetworkBlockTime,
    workerStatus: health.status
  });
};
```

**Обновления**: каждые 5 секунд (настраивается)

## Мониторинг

### Проверка работы

```bash
# Статус всех контейнеров
docker compose ps

# Логи воркера
docker compose logs -f app-workers

# Логи Redis
docker compose logs -f redis

# Health status
curl http://localhost:3002/health | jq

# Redis stats
docker compose exec redis redis-cli INFO stats
```

### Ключевые метрики

1. **lastNetworkBlock** - должен расти (новые блоки)
2. **lastRelevantBlock** - обновляется при транзакциях в отслеживаемые контракты
3. **cacheInvalidations** - счетчик инвалидаций кэша
4. **status: healthy** - воркер работает корректно

### Troubleshooting

```bash
# Воркер не подключается к Redis
docker compose exec redis redis-cli PING
# Должен вернуть PONG

# Воркер не получает блоки
docker compose logs app-workers | grep "New block"
# Должны быть логи каждые ~12 секунд (Ethereum block time)

# Проверка WebSocket подключения
docker compose logs app-workers | grep "WebSocket"

# Очистка всего кэша (для теста)
docker compose exec redis redis-cli FLUSHALL
```

## Расширение

### Добавление новых воркеров

1. Создать папку `workers/new-worker/`
2. Добавить в `docker-compose.yml` новый сервис
3. Использовать общий Redis для координации

### Добавление контрактов для отслеживания

1. Отредактировать `workers/block-watcher/config/watched-addresses.json`
2. Перезапустить воркер: `docker compose restart app-workers`
3. Проверить логи: `docker compose logs -f app-workers`

## Производительность

### Потребление ресурсов

- **CPU**: ~5% (простой) → ~20% (при новом блоке)
- **RAM**: ~50-100 MB
- **Network**: 
  - WebSocket: ~1 KB/s постоянно
  - При новом блоке: ~50-100 KB (fetch транзакций)

### RPC запросы

- **WebSocket subscription**: 1 connection, push notifications
- **Fetch block details**: только при новом блоке (~1 req / 12 sec)
- **Итого**: ~0.08 RPS vs 10+ RPS от клиентов (100x экономия)

## Безопасность

- RPC API ключ находится только в workers (не в браузере)
- Redis доступен только internal network
- Health endpoint публичный (только read операции)
- WebSocket broadcast без аутентификации (только статус, no secrets)
