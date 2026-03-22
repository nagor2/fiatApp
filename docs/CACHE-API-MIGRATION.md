# Frontend Migration: From RPC to Cache API

## Обзор

Фронтенд полностью мигрирован с прямых RPC вызовов (`getPastEvents`, `getPastEventsChunked`) на использование кэшированных данных из `block-watcher`.

## Было → Стало

### Старая архитектура (RPC)

```javascript
import { getPastEventsChunked } from '../utils/eventHelpers';

// Прямой RPC запрос, медленный, с лимитами
const events = await getPastEventsChunked(
  contract,
  'Transfer',
  { fromBlock: 21677704 },
  web3
);
```

**Проблемы:**
- Медленная загрузка (сканирование всех блоков)
- RPC лимиты (max 50,000 блоков за запрос)
- Высокая нагрузка на RPC провайдера
- Невозможность работы без активного RPC подключения

### Новая архитектура (Cache API)

```javascript
import { getPastEventsCached } from '../utils/cacheApi';

// Мгновенная загрузка из Redis cache
const events = await getPastEventsCached(
  contract,
  'Transfer',
  { fromBlock: 21677704 },
  web3
);
```

**Преимущества:**
- Мгновенная загрузка (данные из Redis)
- Нет RPC лимитов
- Автоматическая инвалидация при новых транзакциях
- Работает даже без активного кошелька

## Мигрированные файлы

### 1. Утилиты
- `src/utils/utils.js` - `getTransfers()` теперь использует `getPastEventsCached`

### 2. Компоненты
- `src/components/MyPanel.js` - `getAuctions()`, `getLoans()`, `getDeposits()`
- `src/components/Transfers.js` - Transfer события для всех контрактов
- `src/components/DAO.js` - NewVoting события
- `src/components/Pool.js` - события пулов
- `src/components/Auction.js` - события аукционов

### 3. Контексты
- `src/contexts/Web3Context.js` - Oracle `priceUpdated` события

### 4. Документация
- `src/demo/INTEGRATION-WITH-CONTRACTS.md` - обновлены примеры
- `src/demo/USAGE-EXAMPLES.md` - обновлены примеры

## Cache API Reference

### Основные функции

#### `getPastEventsCached(contract, eventName, options, web3)`

Прямая замена `getPastEventsChunked` - drop-in replacement для быстрой миграции.

**Параметры:**
- `contract` - Web3 contract instance (используется только для получения адреса)
- `eventName` - название события
- `options` - объект с параметрами:
  - `filter` - фильтры событий `{param: value}`
  - `fromBlock` - начальный блок (опционально)
  - `toBlock` - конечный блок (опционально)
- `web3` - Web3 instance (не используется, для совместимости)

**Возвращает:** `Promise<Array>` - массив событий в формате Web3

#### `getContractEvents(contractAddress, eventName, limit)`

Прямой доступ к cache без Web3 contract instance.

**Параметры:**
- `contractAddress` - адрес контракта (string)
- `eventName` - название события или `null` для всех событий
- `limit` - максимальное количество событий (default: 100)

**Возвращает:** `Promise<Array>` - массив событий

#### `getContractTransactions(contractAddress, limit)`

Получить raw транзакции контракта.

**Параметры:**
- `contractAddress` - адрес контракта (string)
- `limit` - максимальное количество транзакций (default: 100)

**Возвращает:** `Promise<Array>` - массив транзакций

#### `filterEvents(events, filter)`

Фильтрация событий на клиенте.

**Параметры:**
- `events` - массив событий
- `filter` - объект фильтров `{param: value}`

**Возвращает:** `Array` - отфильтрованные события

## Примеры использования

### Пример 1: Загрузка Transfer событий

```javascript
import { getPastEventsCached } from '../utils/cacheApi';

const events = await getPastEventsCached(
  contracts.flatCoin,
  'Transfer',
  {
    filter: { from: userAccount },
    fromBlock: 21677704
  },
  web3
);

console.log(`Found ${events.length} transfers from ${userAccount}`);
```

### Пример 2: Прямой доступ к cache

```javascript
import { getContractEvents } from '../utils/cacheApi';

// Получить последние 50 новых аукционов
const auctions = await getContractEvents(
  '0xAuctionAddress',
  'newAuction',
  50
);

auctions.forEach(auction => {
  console.log('Auction ID:', auction.returnValues.id);
  console.log('Block:', auction.blockNumber);
});
```

### Пример 3: Загрузка raw транзакций

```javascript
import { getContractTransactions } from '../utils/cacheApi';

// Получить последние 100 транзакций контракта
const txs = await getContractTransactions('0xContractAddress', 100);

txs.forEach(tx => {
  console.log('From:', tx.from);
  console.log('Value:', tx.value);
  console.log('Gas Used:', tx.gasUsed);
});
```

### Пример 4: Фильтрация на клиенте

```javascript
import { getContractEvents, filterEvents } from '../utils/cacheApi';

// Загружаем все Transfer события
const allTransfers = await getContractEvents(
  contractAddress,
  'Transfer',
  10000
);

// Фильтруем только от конкретного адреса
const fromUser = filterEvents(allTransfers, { from: userAccount });

// Фильтруем только в конкретный адрес
const toUser = filterEvents(allTransfers, { to: userAccount });
```

## Конфигурация

### Worker URL

По умолчанию `cacheApi.js` использует URL из переменной окружения:

```bash
REACT_APP_WORKERS_HEALTH_URL=http://localhost:3002/health
```

API endpoints вычисляются автоматически:
- `/health` → `/api/transactions/{address}`
- `/health` → `/api/events/{address}`

### Limits

По умолчанию `limit=100` для API запросов. Для больших наборов данных:

```javascript
const events = await getContractEvents(contractAddress, 'Transfer', 10000);
```

## Тестирование

### Проверка доступности API

```bash
# Проверить health
curl http://localhost:3002/health

# Получить транзакции
curl http://localhost:3002/api/transactions/0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122?limit=10

# Получить события
curl http://localhost:3002/api/events/0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122?event=NewVoting&limit=10
```

### Сравнение производительности

```javascript
// Старый способ (RPC)
console.time('RPC');
const rpcEvents = await contract.getPastEvents('Transfer', { fromBlock: 21677704 });
console.timeEnd('RPC'); // ~5-30 секунд

// Новый способ (Cache)
console.time('Cache');
const cachedEvents = await getPastEventsCached(contract, 'Transfer', { fromBlock: 21677704 }, web3);
console.timeEnd('Cache'); // ~50-200ms
```

## Обратная совместимость

`getPastEventsCached` является drop-in replacement для `getPastEventsChunked`:

```javascript
// Старый код продолжает работать без изменений логики
const events = await getPastEventsCached(
  contract,
  'Transfer',
  { filter: { from: account }, fromBlock: 21677704 },
  web3
);

// Структура events такая же, как раньше:
events[0].returnValues.from
events[0].blockNumber
events[0].transactionHash
```

## Миграция custom кода

Если у тебя есть custom код, использующий прямые RPC вызовы:

### Шаг 1: Заменить импорт

```diff
- import { getPastEventsChunked } from '../utils/eventHelpers';
+ import { getPastEventsCached } from '../utils/cacheApi';
```

### Шаг 2: Заменить вызовы

```diff
- const events = await getPastEventsChunked(
+ const events = await getPastEventsCached(
    contract,
    'EventName',
    { filter: {...} },
    web3
  );
```

### Шаг 3: Удалить workarounds для RPC лимитов

```diff
- // Получаем текущий блок и вычисляем fromBlock
- const currentBlock = await web3.eth.getBlockNumber();
- const fromBlock = Math.max(0, currentBlock - 49999);
-
  const events = await getPastEventsCached(
    contract,
    'EventName',
-   { fromBlock: fromBlock.toString() },
+   { fromBlock: 0 }, // Можем загружать с любого блока
    web3
  );
```

## Troubleshooting

### Проблема: "Failed to fetch events from cache"

**Причина:** block-watcher не запущен или недоступен.

**Решение:**
```bash
docker compose --profile dev up
```

### Проблема: События не обновляются

**Причина:** block-watcher еще синхронизирует исторические данные.

**Решение:**
```bash
# Проверь статус синхронизации
curl http://localhost:3002/health

# Дождись пока historicalSyncProgress === null (синхронизация завершена)
```

### Проблема: Пустой массив событий

**Причина:** Событие не добавлено в `events-config.json`.

**Решение:** Добавь событие в `workers/block-watcher/config/events-config.json`:
```json
{
  "contractEvents": {
    "contractName": ["EventName", "AnotherEvent"]
  }
}
```

## См. также

- `workers/block-watcher/DUAL-CACHE.md` - Архитектура кэширования
- `workers/block-watcher/TX-BASED-MIGRATION.md` - История миграции
- `src/utils/cacheApi.js` - Исходный код API
