# Кэширование Contract Calls

## Архитектура

```
Frontend (MyPanel)
    ↓
cachedContractCall(contractKey, method, args)
    ↓
Block Watcher API (порт 3002)
    ↓
Redis Cache (TTL: 60 секунд)
    ↓ (при cache MISS)
Web3 RPC Call
```

## Автоматическая инвалидация

Block Watcher отслеживает новые транзакции и автоматически инвалидирует кэш:

```javascript
// Новая транзакция в CDP контракт
processBlockHeader(block) →
  indexTransaction(tx, cdpAddress) →
  invalidateBackendCache(cdpAddress) →
    DEL contract:cdp:*
```

Это значит что при любой новой транзакции в контракте, **весь кэш для этого контракта удаляется** и следующий вызов пойдет напрямую в RPC.

## Использование на Frontend

### Прямой RPC вызов (старый способ):

```javascript
const result = await contracts['cdp'].methods.positions(123).call();
```

### Кэшированный вызов (новый способ):

```javascript
import {cachedContractCall} from '../utils/cachedContractCall';

const result = await cachedContractCall('cdp', 'positions', [123], contracts['cdp']);
```

### Параметры:

1. **contractKey** - ключ контракта (cdp, oracle, basket, auction, deposit, rule, flatCoin, dao, pool)
2. **methodName** - имя метода контракта
3. **args** - массив аргументов (может быть пустым)
4. **fallbackContract** - Web3 contract instance для fallback если API недоступен

### Batch вызовы:

```javascript
import {batchCachedContractCalls} from '../utils/cachedContractCall';

const results = await batchCachedContractCalls([
  { contractKey: 'cdp', methodName: 'numPositions', args: [], fallbackContract: contracts['cdp'] },
  { contractKey: 'cdp', methodName: 'positions', args: [1], fallbackContract: contracts['cdp'] },
  { contractKey: 'basket', methodName: 'itemsCount', args: [], fallbackContract: contracts['basket'] },
]);
```

## Примеры

### Пример 1: Загрузка позиций CDP

**До (прямые RPC вызовы):**
```javascript
const events = await getPastEventsCached(contracts['cdp'], 'PositionOpened', {...});

for (let event of events) {
  const id = event.returnValues.posID;
  const position = await contracts['cdp'].methods.positions(id).call(); // RPC каждый раз
  // ...
}
```

**После (кэшированные вызовы):**
```javascript
const events = await getPastEventsCached(contracts['cdp'], 'PositionOpened', {...});

for (let event of events) {
  const id = event.returnValues.posID;
  const position = await cachedContractCall('cdp', 'positions', [id], contracts['cdp']); // Из кэша!
  // ...
}
```

### Пример 2: Загрузка commodities

**До:**
```javascript
const itemsCount = await contracts['basket'].methods.itemsCount().call();
for (let i = 1; i <= itemsCount; i++) {
  const item = await contracts['basket'].methods.items(i).call();
  const price = await contracts['basket'].methods.getPrice(item.symbol).call();
  // 3 RPC вызова на каждый commodity!
}
```

**После:**
```javascript
const itemsCount = await cachedContractCall('basket', 'itemsCount', [], contracts['basket']);
for (let i = 1; i <= itemsCount; i++) {
  const item = await cachedContractCall('basket', 'items', [i], contracts['basket']);
  const price = await cachedContractCall('basket', 'getPrice', [item.symbol], contracts['basket']);
  // Все из кэша после первого вызова!
}
```

## API Endpoints

### Вызов метода контракта

```bash
GET /api/call/{contractKey}/{method}?args=["arg1","arg2"]
```

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

## Мониторинг кэша

### Проверка ключей в Redis:

```bash
docker exec dotflat-redis redis-cli KEYS "contract:*"
```

### Проверка TTL:

```bash
docker exec dotflat-redis redis-cli TTL "contract:cdp:numPositions"
```

### Очистка кэша вручную:

```bash
docker exec dotflat-redis redis-cli DEL "contract:cdp:*"
```

## Производительность

**Без кэша:**
- Каждая загрузка страницы → 50-100 RPC вызовов
- Время загрузки: 3-5 секунд
- Rate limit риски

**С кэшом:**
- Первая загрузка → 50-100 RPC вызовов (заполнение кэша)
- Последующие загрузки → 0 RPC вызовов (все из кэша)
- Время загрузки: 0.2-0.5 секунды
- Автоматическая инвалидация при изменениях

**Экономия: ~95% RPC вызовов**

## Настройки

### Cache TTL (время жизни кэша):

В `workers/block-watcher/src/health-server.js`:
```javascript
this.cacheTTL = 60; // секунды
```

Можно сделать настраиваемым через переменную окружения:
```javascript
this.cacheTTL = parseInt(process.env.CACHE_TTL || '60', 10);
```

## Ограничения

1. **Только view методы**: Кэшируются только read-only вызовы (`.call()`). Транзакции (`.send()`) не кэшируются.
2. **Публичные данные**: Лучше всего подходит для публичных данных контрактов. Для user-specific данных (например, positions по owner) кэш будет менее эффективен.
3. **Инвалидация по контракту**: При любой транзакции удаляется **весь кэш контракта**, а не только измененные данные.

## Troubleshooting

### API не отвечает

```bash
# Проверка статуса воркера
curl http://localhost:3002/health

# Логи воркера
docker logs dotflat-workers --tail 50
```

### Кэш не инвалидируется

```bash
# Проверка что Block Watcher обрабатывает транзакции
docker logs dotflat-workers 2>&1 | grep "Invalidated.*backend cache"
```

### Fallback на прямые RPC вызовы

Хелпер `cachedContractCall` автоматически падает на прямой RPC если API недоступен:

```javascript
catch (error) {
  // Автоматический fallback
  return await fallbackContract.methods[methodName](...args).call();
}
```
