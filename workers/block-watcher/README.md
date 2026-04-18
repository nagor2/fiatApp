# Block Watcher Service

## Назначение

Фоновый сервис для мониторинга Ethereum блокчейна и автоматической инвалидации кэша при изменении состояния отслеживаемых контрактов.

## Архитектура

```
Ethereum Node (WebSocket)
    ↓
Block Watcher
    ↓ (новый блок)
    ├→ Проверка транзакций с отслеживаемых адресов
    ├→ Инвалидация Redis cache
    └→ Broadcast health status & block info (WebSocket/SSE)
         ↓
    Frontend клиенты
```

## Как работает

### 1. WebSocket Subscription (НЕ polling)

Воркер подписывается на новые блоки через WebSocket:

```javascript
web3.eth.subscribe('newBlockHeaders', (error, blockHeader) => {
  // Получаем уведомление о каждом новом блоке
  // Это push модель - RPC сам присылает уведомления
});
```

**Преимущества:**
- Один WebSocket connection на весь сервис
- Мгновенное уведомление о новом блоке (без задержки polling)
- Минимальное потребление RPC ресурсов
- Отсутствие дублирующих запросов от клиентов

### 2. Фильтрация транзакций

При получении нового блока:
1. Проверяем есть ли транзакции с/на отслеживаемые адреса
2. Если да → инвалидируем соответствующий кэш в Redis
3. Если нет → ничего не делаем

```javascript
// Отслеживаемые адреса (из конфига)
const WATCHED_ADDRESSES = [
  '0x...', // Contract 1
  '0x...', // Contract 2
  // ...
];

async function processBlock(blockHeader) {
  const block = await web3.eth.getBlock(blockHeader.number, true);
  
  for (const tx of block.transactions) {
    // Проверяем относится ли транзакция к нашим контрактам
    if (WATCHED_ADDRESSES.includes(tx.to) || 
        WATCHED_ADDRESSES.includes(tx.from)) {
      
      // Инвалидируем кэш для этого контракта
      await invalidateCache(tx.to);
      
      // Логируем для мониторинга
      lastRelevantBlock = blockHeader.number;
    }
  }
}
```

### 3. Инвалидация кэша

```javascript
async function invalidateCache(contractAddress) {
  // Удаляем все ключи связанные с этим контрактом
  const keys = await redis.keys(`cache:contract:${contractAddress}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 4. Health Status Broadcasting

Воркер транслирует во frontend через WebSocket или SSE:

```javascript
// Health status
{
  status: 'healthy',
  lastNetworkBlock: 19234567,
  lastNetworkBlockTime: '2026-03-22T12:34:56Z',
  lastRelevantBlock: 19234560,
  lastRelevantBlockTime: '2026-03-22T12:33:45Z',
  watchedAddresses: 12,
  cacheInvalidations: 45,
  uptime: 3600000
}
```

## REST API

### GET /health
Health status воркера с метриками индексации.

### GET /api/contracts
Список всех отслеживаемых контрактов.

### GET /api/transactions/:address?limit=100
Кэшированные транзакции контракта.

### GET /api/events/:address?event=Transfer&limit=100
Кэшированные события контракта.

### POST /api/renewCache/:contractName
Очистка и пересинхронизация кэша для конкретного контракта.

**Пример:**
```bash
curl -X POST http://localhost:3002/api/renewCache/flatCoin
```

**Ответ:**
```json
{
  "success": true,
  "contract": "flatCoin",
  "address": "0x1f709cfa0c409e158c68edcd32453809c9eb69ee",
  "transactionsAdded": 33,
  "eventsAdded": 150
}
```

Подробнее: см. [DUAL-CACHE.md](./DUAL-CACHE.md)

## Конфигурация

### Переменные окружения

```bash
# RPC endpoint (WebSocket)
RPC_WS_URL=wss://ethereum-rpc.publicnode.com

# Альтернативно HTTP для fallback
RPC_HTTP_URL=https://ethereum-rpc.publicnode.com

# Redis
REDIS_URL=redis://redis:6379

# Отслеживаемые адреса (через запятую или JSON файл)
WATCHED_ADDRESSES=0x123...,0x456...

# Health status broadcast
HEALTH_BROADCAST_PORT=3002
HEALTH_BROADCAST_INTERVAL=5000  # каждые 5 секунд
```

### Список отслеживаемых адресов

Хранится в `config/watched-addresses.json`:

```json
{
  "contracts": [
    {
      "address": "0x...",
      "name": "MainPool",
      "type": "pool",
      "description": "Основной пул ликвидности"
    },
    {
      "address": "0x...",
      "name": "AuctionContract",
      "type": "auction",
      "description": "Контракт аукциона"
    }
  ]
}
```

## Метрики

Воркер собирает и экспортирует:
- Количество обработанных блоков
- Количество релевантных транзакций
- Количество инвалидаций кэша
- Задержка между блоком в сети и его обработкой
- Статус WebSocket соединения

## Преимущества подхода

### vs Polling от клиентов
- **Было**: 100 клиентов × запрос каждые 10 сек = 10 RPS на RPC
- **Стало**: 1 WebSocket subscription = ~0.2 RPS (только при изменениях)
- **Выигрыш**: 50x снижение нагрузки на RPC

### vs Polling от воркера
- **Polling воркер**: запрос каждые 5 сек = постоянная нагрузка
- **WebSocket воркер**: push уведомления = нагрузка только при новых блоках
- **Выигрыш**: Ещё 10x снижение + мгновенная реакция

## Зависимости

- Redis (для shared cache)
- Web3.js или ethers.js с WebSocket provider
- WebSocket server для broadcast (ws или socket.io)

## Развертывание

```bash
# Запуск всего стека
docker compose up

# Только воркеры
docker compose up app-workers

# Логи воркера
docker compose logs -f app-workers
```

## Управление кэшем и Checkpoint

### Автоматическое возобновление
Воркер сохраняет checkpoint (`watcher:checkpoint`) в Redis после обработки каждого блока. При перезапуске продолжает с последнего checkpoint:

```bash
docker compose restart app-workers
# Продолжит с lastProcessedBlock
```

### Полная пересинхронизация
Для очистки всех данных и повторной индексации с START_BLOCK используйте флаг `CLEAR_CACHE`:

```bash
CLEAR_CACHE=true docker compose up -d app-workers
```

**Действия при CLEAR_CACHE=true:**
1. Выполняет `FLUSHDB` на Redis
2. Удаляет checkpoint
3. Начинает синхронизацию с START_BLOCK
4. Переиндексирует транзакции с декодированием методов
5. Переиндексирует события с timestamp

**Когда использовать:**
- Изменился `START_BLOCK` в docker-compose.yml
- Обновились ABI контрактов (новые методы/события)
- Обнаружены ошибки в кэшированных данных
- Изменился список отслеживаемых контрактов

### Обновление ABI контрактов

Для загрузки актуальных ABI из Etherscan:

```bash
docker exec dotflat-workers node scripts/fetch-abis.js
# Загрузит ABI всех динамических контрактов и сохранит в config/
```

После обновления ABI **обязательно** выполните пересинхронизацию:

```bash
CLEAR_CACHE=true docker compose up -d app-workers
```

## Мониторинг

Frontend может подключиться к WebSocket воркера:

```javascript
const ws = new WebSocket('ws://localhost:3002/health');
ws.onmessage = (event) => {
  const health = JSON.parse(event.data);
  // Показываем status bar с последним блоком
  updateStatusBar(health);
};
```

## Управление кэшем и Checkpoint

### Автоматическое возобновление
Воркер сохраняет checkpoint (`watcher:checkpoint`) в Redis после обработки каждого блока. При перезапуске продолжает с последнего checkpoint:

```bash
docker compose restart app-workers
# Продолжит с lastProcessedBlock
```

### Полная пересинхронизация
Для очистки всех данных и повторной индексации с START_BLOCK используйте флаг `CLEAR_CACHE`:

```bash
CLEAR_CACHE=true docker compose up -d app-workers
```

**Действия при CLEAR_CACHE=true:**
1. Выполняет `FLUSHDB` на Redis
2. Удаляет checkpoint
3. Начинает синхронизацию с START_BLOCK
4. Переиндексирует транзакции с новыми ABI (декодирование методов)
5. Переиндексирует события с timestamp

**Когда использовать:**
- Изменился START_BLOCK в конфигурации
- Обновились ABI контрактов (новые методы/события)
- Обнаружены ошибки в кэшированных данных
- Изменился список отслеживаемых контрактов

### Обновление ABI контрактов

Для загрузки актуальных ABI из Etherscan:

```bash
docker exec dotflat-workers node scripts/fetch-abis.js
# Загрузит ABI всех динамических контрактов и сохранит в config/
```

После обновления ABI **обязательно** выполните `CLEAR_CACHE=true` для переиндексации.

## Кэширование Contract Calls

### API Endpoint

Block Watcher предоставляет endpoint для кэшированных вызовов методов контрактов:

```bash
GET /api/call/{contractKey}/{method}?args=["arg1","arg2"]
```

**Параметры:**
- `contractKey`: ключ контракта (cdp, oracle, basket, auction, deposit, rule, flatCoin, dao, pool)
- `method`: имя метода контракта
- `args`: JSON массив аргументов (опционально, URL-encoded)

**Пример:**
```bash
curl 'http://localhost:3002/api/call/cdp/positions?args=%5B1%5D'
```

**Ответ:**
```json
{
  "success": true,
  "contract": "cdp",
  "method": "positions",
  "args": [1],
  "result": {
    "coinsMinted": "0",
    "ethAmountLocked": "0",
    "owner": "0x..."
  },
  "cached": true,
  "timestamp": "2026-03-22T09:57:38.558Z"
}
```

### Схема кэширования

```
Frontend → /api/call/cdp/positions?args=[1]
    ↓
health-server.js
    ↓
Redis: contract:cdp:positions:1 (TTL: 60s)
    ↓ (MISS)
Web3 RPC → cdp.methods.positions(1).call()
```

### Автоматическая инвалидация

При новой транзакции в контракте:

```
Новый блок → processBlockHeader()
    ↓
Транзакция на CDP адрес → indexTransaction()
    ↓
invalidateBackendCache(cdpAddress)
    ↓
DEL contract:cdp:* (все ключи кэша для CDP)
```

**Результат:** следующий вызов любого метода CDP контракта пойдет напрямую в RPC, обновив кэш актуальными данными.

### Мониторинг кэша

```bash
# Все закэшированные вызовы
docker exec dotflat-redis redis-cli KEYS "contract:*"

# Кэш для конкретного контракта
docker exec dotflat-redis redis-cli KEYS "contract:cdp:*"

# TTL ключа
docker exec dotflat-redis redis-cli TTL "contract:cdp:numPositions"

# Ручная очистка
docker exec dotflat-redis redis-cli DEL "contract:cdp:*"
```

### Производительность

**Без кэша:**
- Страница /contracts/CDP → 50-100 RPC вызовов
- Время загрузки: 3-5 секунд

**С кэшом:**
- Первая загрузка → 50-100 RPC (заполнение кэша)
- Последующие → 0 RPC (все из кэша)
- Время загрузки: 0.2-0.5 секунды

**Экономия: ~95% RPC запросов**

## Резюме

**Отдельный контейнер - правильное решение потому что:**
1. Воркер - это long-running Node.js процесс
2. Frontend prod контейнер - это nginx (статика)
3. Разные lifecycle и требования к ресурсам
4. Легче масштабировать и поддерживать
5. Изоляция отказов