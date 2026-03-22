# Migration: Events → Transactions

## Что изменилось

### Старая архитектура (getPastEvents)
```
Frontend → RPC → getPastEvents(fromBlock, toBlock)
  ↓
Сканирует ВСЕ блоки в диапазоне
  ↓
Возвращает события
```
**Проблема:** Сканирование всех блоков неэффективно, события только в транзакциях.

### Новая архитектура (Transaction-Based)
```
Block Watcher → Etherscan API → все транзакции контракта
  ↓
Сохраняет в Redis (raw)
  ↓
Frontend → Redis API → транзакции контракта
  ↓
Парсит нужные события локально
```
**Преимущество:** Загружаем только транзакции контракта, не все блоки.

## Изменения в Block Watcher

### 1. Загрузка контрактов из DAO

```javascript
// Динамическая загрузка адресов
const ruleAddress = await dao.methods.addresses('rule').call();
const cdpAddress = await dao.methods.addresses('cdp').call();
// ... и т.д.
```

### 2. Загрузка транзакций через Etherscan API

```javascript
// GET https://api.etherscan.io/v2/api
// ?module=account&action=txlist
// &address={contract_address}
// &startblock={START_BLOCK}
// &endblock={current_block}

// Возвращает все транзакции контракта
```

### 3. Сохранение в Redis

```
tx:{hash}              → полная информация о транзакции
txs:{address}:list     → sorted set хэшей (score = blockNumber)
```

### 4. API для получения транзакций

```
GET /api/transactions/{address}?limit=100
→ Возвращает последние N транзакций
```

## Отслеживаемые контракты

### Динамические (из DAO):
- rule
- flatCoin
- cdp  
- oracle
- deposit
- basket
- auction

### Статические:
- DAO: `0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122`
- DFC/ETH Pool: `0x718626E8c94DFdB24e7BD6d5F6da22035BCF47F7`

## Frontend интеграция

### Следующий шаг: миграция frontend

Заменить все вызовы:

```javascript
// Старый код:
const events = await contract.getPastEvents('PositionOpened', {fromBlock, toBlock});

// Новый код:
const response = await fetch(`/api/workers/transactions/${contractAddress}?limit=1000`);
const { transactions } = await response.json();

// Парсим события локально (если нужны конкретные события):
const events = transactions
  .filter(tx => tx.input.startsWith('0x...'))  // фильтр по method signature
  .map(tx => parseEventFromTx(tx));
```

## Файлы для миграции

1. `src/components/MyPanel.js`:
   - `getAuctions()` - PositionOpened события
   - `getLoans()` - PositionOpened события  
   - `getDeposits()` - DepositOpened события

2. `src/components/Transfers.js`:
   - Transfer события (from/to фильтры)

3. `src/components/DAO.js`:
   - NewVoting события

4. `src/contexts/Web3Context.js`:
   - priceUpdated события Oracle

5. `src/utils/utils.js`:
   - `getTransfers()` - Transfer события

## Пересборка

```bash
# Пересобрать workers контейнер
docker compose --profile workers up --build app-workers
```

## API Endpoints

### Health Status
```
GET http://localhost:3002/health
```

### Список контрактов
```
GET http://localhost:3002/api/contracts
```

### Транзакции контракта
```
GET http://localhost:3002/api/transactions/{address}?limit=100
```

## Преимущества

1. ✅ Нет ограничения в 50,000 блоков
2. ✅ Быстрая загрузка (только транзакции, не все блоки)
3. ✅ Кэширование в Redis (не нужны повторные RPC запросы)
4. ✅ Real-time обновления через block subscription
5. ✅ Centralized data source (все транзакции в одном месте)
