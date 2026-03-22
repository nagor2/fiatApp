# Workers Quick Start

## Первый запуск

1. **Скопируйте конфиг**
```bash
cd workers/block-watcher
cp .env.example .env
```

2. **Добавьте ваши контракты**

Отредактируйте `config/watched-addresses.json`:
```json
{
  "contracts": [
    {
      "address": "0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122",
      "name": "DAO",
      "type": "dao",
      "cachePrefix": "contract:dao"
    }
  ]
}
```

3. **Запустите**
```bash
cd ../..  # вернуться в корень проекта
docker compose --profile workers up
```

4. **Проверьте**
```bash
# Health status
curl http://localhost:3002/health

# Логи
docker compose logs -f app-workers
```

## Интеграция с frontend

### JavaScript подключение к health status

```javascript
const ws = new WebSocket('ws://localhost:3003');

ws.onmessage = (event) => {
  const health = JSON.parse(event.data);
  console.log('Network block:', health.lastNetworkBlock);
  console.log('Last relevant:', health.lastRelevantBlock);
};
```

### React компонент

```jsx
import { useEffect, useState } from 'react';

function NetworkStatus() {
  const [health, setHealth] = useState(null);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3003');
    
    ws.onmessage = (event) => {
      setHealth(JSON.parse(event.data));
    };
    
    return () => ws.close();
  }, []);
  
  if (!health) return <div>Connecting...</div>;
  
  return (
    <div className="network-status">
      <div>Status: {health.status}</div>
      <div>Block: {health.lastNetworkBlock}</div>
      <div>Time: {new Date(health.lastNetworkBlockTime).toLocaleString()}</div>
      {health.lastRelevantBlock && (
        <div>Last update: block {health.lastRelevantBlock}</div>
      )}
    </div>
  );
}
```

## Что происходит под капотом

### При запуске:
1. Воркер подключается к Redis
2. Подключается к Ethereum через WebSocket
3. Подписывается на новые блоки (`newBlockHeaders`)
4. Запускает health broadcast server

### При новом блоке:
1. Получает уведомление через WebSocket (push)
2. Запрашивает детали блока с транзакциями
3. Фильтрует транзакции по watched addresses
4. Если найдена релевантная транзакция:
   - Инвалидирует Redis кэш для этого контракта
   - Обновляет `lastRelevantBlock`
   - Логирует событие
5. Обновляет `lastNetworkBlock`
6. Рассылает health status всем подключенным клиентам

### Эффективность:

**Без воркера:**
- 100 клиентов делают polling каждые 10 сек
- = 600 RPC запросов в минуту

**С воркером:**
- 1 WebSocket subscription (push)
- ~5 RPC запросов в минуту (только fetch block details)
- **120x экономия RPC ресурсов**

## Добавление своих воркеров

Структура:
```
workers/
  ├── block-watcher/     # Существующий
  ├── event-indexer/     # Новый воркер
  │   ├── src/
  │   ├── Dockerfile
  │   └── package.json
  └── QUICKSTART.md
```

Добавьте в `docker-compose.yml`:
```yaml
app-event-indexer:
  build:
    context: workers/event-indexer
  depends_on: [redis]
  environment:
    - REDIS_URL=redis://redis:6379
  profiles: [workers, prod]
```
