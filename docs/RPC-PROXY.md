# RPC Proxy Configuration

## Проблема

Прямое обращение к внешнему Ethereum RPC провайдеру (`https://eth.rpc.rivet.cloud`) из браузера блокируется CORS политикой:
- Браузер делает preflight запрос (OPTIONS)
- RPC сервер не возвращает заголовок `Access-Control-Allow-Origin`
- Браузер блокирует доступ к ответу

## Решение

Настроен прокси на уровне сервера, чтобы запросы шли через наш бэкенд:

```
Frontend (браузер) → Наш сервер (/api/rpc) → eth.rpc.rivet.cloud
```

## Реализация

### Production режим (nginx)

В `nginx.conf` добавлен location `/api/rpc`:
- Проксирует запросы к `https://eth.rpc.rivet.cloud/...`
- Добавляет CORS заголовки
- Обрабатывает preflight запросы

### Development режим (npm start)

В `src/setupProxy.js` настроен http-proxy-middleware:
- Автоматически подхватывается `react-scripts`
- Проксирует `/api/rpc` к rivet.cloud
- Работает на `localhost:3000`

### Конфигурация в коде

`src/utils/config.js`:
```javascript
config.rpc = process.env.REACT_APP_RPC_URL || "/api/rpc";
```

- По умолчанию использует относительный URL `/api/rpc` (прокси)
- Можно переопределить через `.env` для прямого подключения (если RPC поддерживает CORS)

## Использование

### Production
```bash
docker compose --profile prod up
```
URL: `http://localhost:8008` → запросы идут через nginx → rivet.cloud

### Development
```bash
docker compose --profile dev up
```
URL: `http://localhost:3000` → запросы идут через setupProxy.js → rivet.cloud

### Локальная нода

Создать `.env`:
```bash
REACT_APP_RPC_URL=http://localhost:8545
```

Тогда запросы пойдут напрямую к локальной ноде (CORS не требуется для localhost).

## Преимущества

1. **Нет CORS проблем** - запросы идут с того же origin
2. **Безопасность** - RPC ключ не светится в браузере
3. **Гибкость** - легко переключаться между провайдерами
4. **Кэширование** - можно добавить кэш на уровне nginx
5. **Мониторинг** - все RPC запросы логируются nginx
