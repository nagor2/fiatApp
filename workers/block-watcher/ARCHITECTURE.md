# Block Watcher - Transaction-Based Architecture

## Проблема старой архитектуры

**Старый подход (getPastEvents):**
- Сканирует **все блоки** в диапазоне
- Проверяет каждый блок на наличие событий
- Неэффективно: большинство блоков не содержат нужных событий
- Ограничения RPC: max 50,000 блоков за запрос

**Проблема:** События генерируются только внутри транзакций, зачем сканировать блоки?

## Новая архитектура (Transaction-Based)

### Принцип

События генерируются только в **транзакциях**, значит:
1. Загружаем **список транзакций** по адресу контракта (Etherscan API)
2. Сохраняем транзакции в Redis в raw виде
3. Frontend читает транзакции из Redis и парсит нужные события

### Преимущества

✅ **Эффективность**: загружаем только транзакции контракта, не все блоки
✅ **Быстрота**: Etherscan API оптимизирован для таких запросов
✅ **Кэширование**: транзакции в Redis, не нужно повторно запрашивать RPC
✅ **Real-time**: подписка на новые блоки продолжает добавлять транзакции

## Архитектура

### 1. Загрузка контрактов

```
DAO (фиксированный адрес)
  ↓
dao.methods.addresses('rule')    → Rule контракт
dao.methods.addresses('cdp')     → CDP контракт
dao.methods.addresses('auction') → Auction контракт
... и т.д.
```

### 2. Загрузка истории транзакций

Для каждого контракта вызывается **Etherscan API**:

```
GET https://api.etherscan.io/v2/api
  ?chainid=1
  &module=account
  &action=txlist
  &address=<contract_address>
  &startblock=<START_BLOCK>
  &endblock=<current_block>
  &sort=asc
  &apikey=<API_KEY>
```

Возвращает массив **всех транзакций** контракта.

### 3. Сохранение в Redis

**Структура данных:**

```
tx:{hash}                    → полная информация о транзакции (JSON)
txs:{address}:list           → sorted set хэшей (score = blockNumber)
```

**Пример:**
```redis
tx:0xabc123... = {
  "hash": "0xabc123...",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000",
  "input": "0x...",
  "blockNumber": 24710000,
  "blockTimestamp": 1774154400,
  ...
}

txs:0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122:list = [
  (score: 24710000, value: "0xabc123..."),
  (score: 24710001, value: "0xdef456..."),
  ...
]
```

### 4. Real-time мониторинг

Подписка на `newBlockHeaders` через WebSocket:
1. Получаем новый блок
2. Проверяем все транзакции в блоке
3. Если `tx.to` совпадает с watched address → сохраняем в Redis
4. Инвалидируем backend кэш для этого контракта

### 5. Frontend читает из Redis через API

**API Endpoints:**

```
GET /api/transactions/{address}?limit=100
→ Возвращает последние N транзакций контракта

Пример ответа:
{
  "address": "0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122",
  "count": 100,
  "transactions": [
    {
      "hash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "blockNumber": 24710000,
      ...
    }
  ]
}
```

## Workflow

### Initial Sync (первый запуск)

```
1. Подключение к Redis, Web3, DAO
2. Загрузка списка контрактов (dao.methods.addresses)
3. Для каждого контракта:
   ├─ Etherscan API: получить все транзакции с START_BLOCK
   ├─ Сохранить в Redis
   └─ Rate limit: пауза 200ms между запросами
4. Сохранение checkpoint
5. Подписка на новые блоки
```

### Subsequent Runs (повторные запуски)

```
1. Проверка checkpoint
2. Если контракты не изменились → загрузка с checkpoint.lastProcessedBlock
3. Если контракты изменились → full rescan с START_BLOCK
4. Подписка на новые блоки
```

### Real-time Updates

```
newBlockHeaders subscription
  ↓
Новый блок → получаем block.transactions
  ↓
Фильтруем: tx.to in watchedAddresses?
  ↓
Да → сохраняем в Redis + инвалидируем backend кэш
```

## Конфигурация

### Environment Variables

```bash
# Etherscan API
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
ETHERSCAN_API_URL=https://api.etherscan.io/v2/api

# Стартовый блок (первая транзакция контрактов)
START_BLOCK=21677704

# WebSocket для real-time
RPC_WS_URL=wss://ethereum.publicnode.com

# Redis
REDIS_URL=redis://redis:6379
```

### watched-addresses.json

```json
{
  "dao": {
    "address": "0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122",
    "abiFile": "dao-abi.json"
  },
  "staticContracts": [
    {"address": "0x718626E8c94DFdB24e7BD6d5F6da22035BCF47F7", "name": "DFC/ETH Pool"}
  ],
  "dynamicContracts": ["rule", "flatCoin", "cdp", "oracle", "deposit", "basket", "auction"]
}
```

## Использование на Frontend

### Получение транзакций контракта

```javascript
// Через workers API
const response = await fetch(`http://localhost:3002/api/transactions/${contractAddress}?limit=100`);
const { transactions } = await response.json();

// Фильтруем нужные (например, только для текущего пользователя)
const userTransactions = transactions.filter(tx => 
  tx.from.toLowerCase() === account.toLowerCase()
);
```

### Парсинг событий из транзакций

```javascript
// Получаем receipt и декодируем события
for (const tx of transactions) {
  const receipt = await web3.eth.getTransactionReceipt(tx.hash);
  const events = receipt.logs
    .filter(log => log.address.toLowerCase() === contractAddress)
    .map(log => contract._decodeEventABI.call({ jsonInterface }, log));
}
```

## Сравнение производительности

| Метод | Запросов RPC | Скорость | Кэширование |
|-------|--------------|----------|-------------|
| **getPastEvents** | 1 запрос на ~50k блоков | Медленно (сканирует все блоки) | Нет |
| **Transaction-Based** | 0 (Etherscan API) | Быстро (только транзакции) | Да (Redis) |

## Rate Limits

**Etherscan API:**
- Free tier: 5 запросов/сек
- Решение: пауза 200ms между запросами

**RPC Provider:**
- Без ограничений на количество блоков (загружаем только конкретные транзакции)
