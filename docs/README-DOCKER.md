# Docker Setup for DotFlat Frontend

Этот документ описывает запуск приложения через Docker Compose.

## Требования

- Docker Engine 20.10+
- Docker Compose v2.0+
- Минимум 2GB свободной RAM

## Режимы запуска

### 1. Development LOCAL режим (локальный RPC на порту 8545)

Для разработки с локальным блокчейном (Ganache, Hardhat, Anvil).

**Запуск:**
```bash
docker compose --profile dev-local up -d
```

**Доступ:**
- URL: http://localhost:3007
- RPC: `http://localhost:8545` (локальная нода)
- Hot reload: включён
- Source maps: полные

**Особенности:**
- Volume mapping для кода - изменения применяются моментально
- Подключается к локальной Ethereum ноде на хосте через `host.docker.internal:8545`
- `node_modules` изолирован в контейнере
- React dev server с Fast Refresh
- Environment: `REACT_APP_RPC_URL=http://host.docker.internal:8545`

**Предварительные требования:**
1. Запустите локальную Ethereum ноду на порту 8545:
   ```bash
   # Ganache
   ganache-cli -p 8545
   
   # Или Hardhat
   npx hardhat node
   
   # Или Anvil (Foundry)
   anvil --port 8545
   ```

**Остановка:**
```bash
docker compose --profile dev-local down
```

**Логи:**
```bash
docker compose --profile dev-local logs -f
```

### 2. Development режим (production-like RPC через proxy)

Для разработки с тем же RPC что и в production (через nginx proxy).

**Запуск:**
```bash
docker compose --profile dev up -d
```

**Доступ:**
- URL: http://localhost:3008
- RPC: `/api/rpc` → `ethereum.publicnode.com`
- Hot reload: включён
- Source maps: полные

**Особенности:**
- Volume mapping для кода - изменения применяются моментально
- RPC запросы проксируются через `setupProxy.js`
- Работает с реальным Ethereum Mainnet
- Нет CORS проблем благодаря локальному proxy
- Environment: `REACT_APP_RPC_URL=/api/rpc`

**Остановка:**
```bash
docker compose --profile dev down
```

**Логи:**
```bash
docker compose --profile dev logs -f
```

### 3. Production режим (nginx)

Собирает оптимизированный production build и раздаёт через Nginx.

**Запуск:**
```bash
docker compose --profile prod up -d
```

**Доступ:**
- URL: http://localhost:8008
- Сервер: Nginx Alpine
- Build: оптимизированный

**Особенности:**
- Multi-stage Docker build
- Минифицированный JS/CSS
- Статические ассеты с кешированием
- Малый размер образа (~30MB)
- Production-ready конфигурация Nginx

**Остановка:**
```bash
docker compose --profile prod down
```

**Пересборка:**
```bash
docker compose --profile prod up --build -d
```

## Полезные команды

### Очистка

Удалить все контейнеры, образы и volumes:
```bash
docker compose --profile dev down -v
docker compose --profile prod down -v
docker system prune -af
```

### Логи

Development:
```bash
docker compose --profile dev logs -f app-dev
```

Production:
```bash
docker compose --profile prod logs -f app-prod
```

### Shell доступ

Development:
```bash
docker compose --profile dev exec app-dev sh
```

Production:
```bash
docker compose --profile prod exec app-prod sh
```

### Установка зависимостей

Development (внутри контейнера):
```bash
docker compose --profile dev exec app-dev npm install <package-name>
```

### Запуск тестов

```bash
docker compose --profile dev exec app-dev npm test
```

### Сборка production локально

```bash
docker compose --profile dev exec app-dev npm run build
```

## Переменные окружения

Создайте `.env` файл на основе `.env.example`:

```bash
cp .env.example .env
```

Для переопределения RPC endpoint или других параметров - отредактируйте `src/utils/config.js`.

## Порты

| Режим | Порт хоста | Порт контейнера | RPC Endpoint | Назначение |
|-------|------------|-----------------|--------------|------------|
| dev-local | 3007   | 3000            | localhost:8545 | Локальный blockchain |
| dev       | 3008   | 3000            | /api/rpc (proxy) | Production-like testing |
| prod      | 8008   | 80              | /api/rpc (nginx) | Production build |

Изменить порты можно в `docker-compose.yml` в секции `ports`.

## Troubleshooting

### Hot reload не работает

В `docker-compose.yml` уже настроены переменные для polling:
- `CHOKIDAR_USEPOLLING=true`
- `WATCHPACK_POLLING=true`

Если всё ещё не работает, попробуйте:
```bash
docker compose --profile dev down
docker compose --profile dev up --build
```

### Ошибка EACCES при установке пакетов

```bash
docker compose --profile dev exec -u root app-dev chown -R node:node /app
```

### node_modules не синхронизируются

В development режиме `node_modules` изолирован в контейнере через anonymous volume. Это нормально и предотвращает конфликты с хостовой системой.

### Production образ слишком большой

Используется multi-stage build, финальный образ основан на `nginx:alpine` (~30MB). Если нужно уменьшить:
1. Удалите неиспользуемые зависимости из `package.json`
2. Проверьте `.dockerignore` - должны быть исключены `node_modules`, `build`, `.git`

### Ошибки Web3 подключения

Проверьте:
1. RPC endpoint в `src/utils/config.js` (строка 2877)
2. Доступность RPC из контейнера (проверьте firewall)
3. Для локального Ganache используйте `host.docker.internal:8545` вместо `localhost:8545`

## Работа с локальным блокчейном (Ganache)

Если нужно подключить локальный Ethereum node:

1. Запустите Ganache на хосте
2. В `docker-compose.yml` добавьте:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```
3. В `src/utils/config.js` измените:
```javascript
config.rpc = "http://host.docker.internal:8545";
```

## CI/CD интеграция

Production образ совместим с текущим GitLab CI/CD pipeline (`.gitlab-ci.yml`).

Для локального тестирования CI/CD сборки:
```bash
docker build -t dotflat-test .
docker run -p 8008:80 dotflat-test
```

## Мониторинг ресурсов

```bash
docker stats dotflat-dev   # для dev
docker stats dotflat-prod  # для prod
```

## Сеть

Оба режима используют общую сеть `dotflat-network`. При необходимости подключения других сервисов (backend API, блокчейн ноды) добавьте их в `docker-compose.yml`.

## Best Practices

1. **Development**: используйте `--profile dev` для быстрой итерации
2. **Testing**: проверяйте production build перед деплоем через `--profile prod`
3. **Dependencies**: устанавливайте новые пакеты внутри dev контейнера
4. **Cleanup**: регулярно очищайте неиспользуемые образы через `docker system prune`
