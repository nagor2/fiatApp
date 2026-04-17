# DotFlat Backend API

Backend сервер с Redis кэшированием для оптимизации запросов к Ethereum контрактам.

## Архитектура

```
Frontend → nginx → Backend API → [Redis Cache] → Ethereum RPC
                        ↓
                  Block Watcher
                 (инвалидация кэша)
```

## Функции

### 1. Кэширование contract calls
- Все общие данные контрактов кэшируются в Redis
- TTL по умолчанию: 60 секунд
- Автоматическая инвалидация через block-watcher

### 2. Оптимизация RPC запросов
- **Без кэша**: каждый клиент → RPC (100 req/min)
- **С кэшом**: первый запрос → RPC, остальные → Redis (5 req/min)
- **Экономия**: 95% RPC запросов

### 3. Агрегация данных
- Один endpoint возвращает все данные для страницы
- Вместо 9 отдельных RPC calls → 1 HTTP call к API

## API Endpoints

### Health Check

```bash
GET /health
```

Ответ:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2026-03-22T12:34:56Z",
  "cache": "enabled"
}
```

### CDP Contract State

```bash
GET /api/contracts/cdp/state
```

Ответ:
```json
{
  "success": true,
  "data": {
    "stubFund": "12345.67",
    "stubFundExceed": "234.56",
    "totalSupply": "98765.4321",
    "ruleBalance": "456.78",
    "allowanceToAuction": "1000.00",
    "ethBalance": "123.45",
    "numPositions": 42,
    "collateralDiscount": "25%",
    "interestRate": "5%",
    "address": "0x..."
  },
  "cached": true,
  "timestamp": "2026-03-22T12:34:56Z"
}
```

### DAO Contract State

```bash
GET /api/contracts/dao/state
```

### Basket Contract State

```bash
GET /api/contracts/basket/state
```

### Универсальный вызов

```bash
GET /api/contracts/:contract/:method?args=[...]
```

Примеры:
```bash
# Без аргументов
GET /api/contracts/flatCoin/totalSupply

# С аргументами
GET /api/contracts/flatCoin/balanceOf?args=["0x123..."]
```

### Инвалидация кэша

```bash
POST /api/contracts/:contract/invalidate
```

Пример:
```bash
curl -X POST http://localhost:3001/api/contracts/cdp/invalidate
```

## Конфигурация

### Переменные окружения

`.env` файл:

```bash
# Server
PORT=3001
NODE_ENV=production

# Ethereum RPC
RPC_URL=https://eth.rpc.rivet.cloud/YOUR_KEY

# Redis
REDIS_URL=redis://redis:6379

# Cache settings
CACHE_TTL=60           # секунды
CACHE_ENABLED=true

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:8008,http://localhost:3000
```

### Contract адреса и ABI

Отредактируйте `src/config/contracts.js` - добавьте адреса ваших контрактов.

**Извлечение ABI из frontend:**

```bash
cd backend/src/config/abi
# Скопируйте ABI из src/utils/config.js
# См. README.md в этой папке
```

## Запуск

### Development

```bash
cd backend
npm install
npm run dev
```

### Production (Docker)

```bash
# В корне проекта
docker compose --profile prod up -d

# Или только backend + redis
docker compose --profile backend up -d
```

### Проверка работы

```bash
# Health check
curl http://localhost:3001/health

# CDP state
curl http://localhost:3001/api/contracts/cdp/state | jq

# Логи
docker compose logs -f backend
```

## Кэширование

### Стратегия

1. **Первый запрос**: Backend → RPC → Redis → Response (медленно)
2. **Повторные запросы**: Backend → Redis → Response (быстро)
3. **После TTL**: автоматическое обновление
4. **При транзакции**: block-watcher инвалидирует кэш

### Cache Keys

Формат: `contract:{contractName}:{methodName}:{args}`

Примеры:
```
contract:flatCoin:totalSupply
contract:flatCoin:balanceOf:0x123...
contract:dao:params:interestRate
contract:cdp:numPositions
```

### Мониторинг кэша

```bash
# Подключиться к Redis
docker compose exec redis redis-cli

# Список всех ключей
KEYS contract:*

# Получить значение
GET contract:flatCoin:totalSupply

# Время жизни ключа
TTL contract:flatCoin:totalSupply

# Статистика
INFO stats
```

## Интеграция с Frontend

### Прямой вызов

```javascript
// Вместо:
const totalSupply = await contracts.flatCoin.methods.totalSupply().call();

// Используем:
const response = await fetch('http://localhost:3001/api/contracts/flatCoin/totalSupply');
const { data } = await response.json();
const totalSupply = data;
```

### Через nginx proxy

Добавьте в `nginx.conf`:

```nginx
location /api/ {
  proxy_pass http://backend:3001;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

Тогда frontend может обращаться к `/api/contracts/...` без CORS проблем.

## Производительность

### Метрики (пример)

**Без кэша:**
- CDP state: 9 RPC calls × 200ms = 1800ms
- 100 пользователей = 900 RPC calls/min

**С кэшом:**
- CDP state: 1 API call × 5ms = 5ms (из кэша)
- 100 пользователей = 1.67 RPC calls/min (при TTL 60s)
- **Ускорение: 360x**
- **Экономия RPC: 99.8%**

## Расширение

### Добавление нового контракта

1. Добавьте ABI в `src/config/abi/{name}.json`
2. Добавьте конфиг в `src/config/contracts.js`
3. Создайте метод в `contractService.js` (опционально)
4. Добавьте route в `routes/contracts.js` (опционально)

### Кастомные endpoints

Создайте специализированные endpoints для часто используемых комбинаций:

```javascript
// src/routes/contracts.js
router.get('/dashboard/stats', async (req, res) => {
  const [cdp, dao, basket] = await Promise.all([
    contractService.getCDPState(),
    contractService.getDAOState(),
    contractService.getBasketState(),
  ]);
  
  res.json({ cdp, dao, basket });
});
```

## Troubleshooting

### Backend не запускается

```bash
# Проверить логи
docker compose logs backend

# Проверить что Redis работает
docker compose exec redis redis-cli PING
```

### Кэш не работает

```bash
# Проверить подключение к Redis
docker compose logs backend | grep Redis

# Проверить есть ли ключи
docker compose exec redis redis-cli KEYS "contract:*"
```

### RPC errors

Проверьте что `RPC_URL` корректный в `.env` файле.

## Security

- RPC API ключ находится только на backend (не в браузере)
- CORS настроен только для разрешенных origins
- Redis доступен только internal network
- Нет персональных данных в кэше (только общие contract states)
