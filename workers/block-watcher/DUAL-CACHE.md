# Dual Cache Architecture

## Концепция: Два параллельных кэша

Block Watcher поддерживает **два независимых кэша** в Redis:

### 1. Transaction Cache (Etherscan API)
- **Источник:** Etherscan API
- **Данные:** Raw транзакции в том виде, как возвращает Etherscan
- **Преимущество:** Быстрая загрузка истории без RPC запросов

### 2. Events Cache (RPC getPastEvents)
- **Источник:** RPC Provider через contract.getPastEvents()
- **Данные:** Декодированные события контрактов
- **Преимущество:** Готовые события, не нужно парсить транзакции

## Redis Structure

### Transaction Cache

```
tx:{hash}                    → полная транзакция (JSON)
txs:{address}:list           → sorted set хэшей (score = blockNumber)
```

**Пример:**
```json
{
  "hash": "0xabc123...",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000",
  "input": "0x...",
  "blockNumber": 24710000,
  "blockTimestamp": 1774154400
}
```

### Events Cache

```
event:{address}:{eventName}:{txHash}:{logIndex}  → декодированное событие (JSON)
events:{address}:{eventName}:list                → sorted set ключей (score = blockNumber)
events:{address}:all:list                        → sorted set всех событий
```

**Пример:**
```json
{
  "event": "PositionOpened",
  "returnValues": {
    "owner": "0x...",
    "posID": "123"
  },
  "blockNumber": 24710000,
  "transactionHash": "0xabc123...",
  "logIndex": 0,
  "contractAddress": "0x...",
  "contractKey": "cdp"
}
```

## API Endpoints

### 1. Транзакции (Raw)

```bash
GET /api/transactions/{address}?limit=100

# Пример:
curl http://localhost:3002/api/transactions/0xbcf58de37791efe60fe87a6d420fe8f7aea99ef8?limit=50
```

**Ответ:**
```json
{
  "address": "0xbcf58de37791efe60fe87a6d420fe8f7aea99ef8",
  "count": 19,
  "transactions": [...]
}
```

### 2. События (Декодированные)

```bash
GET /api/events/{address}?event=PositionOpened&limit=100

# Все события:
GET /api/events/{address}?limit=100

# Конкретный тип:
GET /api/events/{address}?event=Transfer&limit=50
```

**Ответ:**
```json
{
  "address": "0xbcf58de37791efe60fe87a6d420fe8f7aea99ef8",
  "eventName": "PositionOpened",
  "count": 15,
  "events": [...]
}
```

### 3. Список отслеживаемых контрактов

```bash
GET /api/contracts

# Пример:
curl http://localhost:3002/api/contracts
```

**Ответ:**
```json
{
  "contracts": [
    {
      "address": "0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122",
      "name": "DFC DAO",
      "type": "dao"
    }
  ]
}
```

### 4. Пересинхронизация контракта

```bash
POST /api/renewCache/:contractName

# По имени:
curl -X POST http://localhost:3002/api/renewCache/flatCoin

# По адресу:
curl -X POST http://localhost:3002/api/renewCache/0x1f709cfa0c409e158c68edcd32453809c9eb69ee
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

**Что делает:**
1. Удаляет все транзакции и события контракта из Redis
2. Заново загружает транзакции через Etherscan API (весь диапазон от START_BLOCK)
3. Заново загружает события через RPC (если указаны в конфигурации)
4. Возвращает статистику по добавленным данным

**Использование:**
- Обновление данных после изменения конфигурации
- Очистка поврежденного кэша
- Пересинхронизация после исправления багов индексации

## Когда использовать какой кэш?

### Transaction Cache → когда нужны:
- Полная история транзакций контракта
- Анализ gas использования
- Отображение TX в UI
- Input data для анализа вызовов методов

### Events Cache → когда нужны:
- Конкретные события (Transfer, PositionOpened и т.д.)
- Быстрый доступ к декодированным данным
- Фильтрация по типу события
- Не нужно парсить receipt вручную

## Пример использования

### Загрузка CDP позиций пользователя

**Вариант 1: Через Events Cache (проще)**
```javascript
const response = await fetch(`http://localhost:3002/api/events/${cdpAddress}?event=PositionOpened&limit=1000`);
const { events } = await response.json();

const userPositions = events.filter(e => 
  e.returnValues.owner.toLowerCase() === account.toLowerCase()
);
```

**Вариант 2: Через Transaction Cache (полная информация)**
```javascript
const response = await fetch(`http://localhost:3002/api/transactions/${cdpAddress}?limit=1000`);
const { transactions } = await response.json();

// Парсим события вручную
for (const tx of transactions) {
  const receipt = await web3.eth.getTransactionReceipt(tx.hash);
  // ... decode logs ...
}
```

## Historical Sync

При запуске Block Watcher:

1. **Phase 1:** Загрузка транзакций через Etherscan API
   - Для каждого контракта: `GET /v2/api?module=account&action=txlist`
   - Сохраняет в Transaction Cache

2. **Phase 2:** Загрузка событий через RPC getPastEvents
   - Для каждого контракта и каждого типа события
   - Chunked загрузка (max 49,999 блоков)
   - Сохраняет в Events Cache

3. **Real-time:** Мониторинг новых блоков
   - При новой транзакции:
     - Добавляет в Transaction Cache
     - Декодирует события и добавляет в Events Cache
     - Инвалидирует backend кэш

## Конфигурация событий

Файл `config/events-config.json`:
```json
{
  "contractEvents": {
    "dao": ["NewVoting", "VotingFailed"],
    "cdp": ["PositionOpened", "PositionClosed"],
    "auction": ["newAuction", "newBid"],
    ...
  }
}
```

## Performance

| Операция | Transaction Cache | Events Cache |
|----------|-------------------|--------------|
| **Initial Load** | ~5 сек (Etherscan) | ~30 сек (RPC chunked) |
| **Storage** | Raw TX (~500 bytes) | Event (~200 bytes) |
| **Frontend parse** | Требуется | Не требуется |
| **Flexibility** | Любые события | Только configured |

## Когда какой кэш обновляется?

- **Transaction Cache:** При каждой транзакции контракта
- **Events Cache:** При каждой транзакции контракта (если есть ABI)
- **Backend Cache:** Инвалидируется при любой транзакции

## TTL (Time To Live)

- **Транзакции:** 90 дней
- **События:** 90 дней
- **Backend кэш:** 60 секунд (или до инвалидации)
