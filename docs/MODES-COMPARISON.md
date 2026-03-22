# Режимы запуска DotFlat Frontend - Сравнение

## Быстрая справка

```bash
# Локальный блокчейн
docker compose --profile dev-local up -d   # → http://localhost:3007

# Ежедневная разработка (рекомендуется)
docker compose --profile dev up -d         # → http://localhost:3008

# Тестирование production build
docker compose --profile prod up -d        # → http://localhost:8008
```

## Детальное сравнение

### dev-local (Порт 3007)

**Назначение:** Разработка с локальным блокчейном

| Параметр | Значение |
|----------|----------|
| **URL** | http://localhost:3007 |
| **RPC** | `http://localhost:8545` |
| **RPC Location** | Локальная нода на хосте |
| **Hot Reload** | ✅ Да (~3 сек) |
| **Время запуска** | ~3 сек (образ уже собран) |
| **Контейнер** | `dotflat-dev-local` |
| **Dockerfile** | `Dockerfile.dev` |
| **Build Cache** | Используется |
| **node_modules** | В контейнере (volume) |
| **Source Maps** | Полные |
| **Minification** | Нет |
| **Bundle Size** | ~220KB gzipped |

**Когда использовать:**
- ✅ Разработка смарт-контрактов
- ✅ Тестирование с чистым состоянием
- ✅ Работа оффлайн
- ✅ Полный контроль над блокчейном
- ✅ Быстрые транзакции

**Требования:**
- Запущенный Ganache/Hardhat/Anvil на порту 8545

**Команды:**
```bash
# Запуск
docker compose --profile dev-local up -d

# Логи с hot reload
docker compose --profile dev-local logs -f

# Остановка
docker compose --profile dev-local down
```

---

### dev (Порт 3008) - Рекомендуется для ежедневной разработки

**Назначение:** Быстрая разработка с production-like окружением

| Параметр | Значение |
|----------|----------|
| **URL** | http://localhost:3008 |
| **RPC** | `/api/rpc` |
| **RPC Backend** | `ethereum.publicnode.com` |
| **RPC Proxy** | setupProxy.js (webpack dev server) |
| **Hot Reload** | ✅ Да (~3 сек) |
| **Время запуска** | ~3 сек (образ уже собран) |
| **Контейнер** | `dotflat-dev` |
| **Dockerfile** | `Dockerfile.dev` |
| **Build Cache** | Используется |
| **node_modules** | В контейнере (volume) |
| **Source Maps** | Полные |
| **Minification** | Нет |
| **Bundle Size** | ~220KB gzipped |

**Когда использовать:**
- ✅ Ежедневная frontend разработка
- ✅ Тестирование с реальными данными Mainnet
- ✅ Не нужно поднимать локальный блокчейн
- ✅ Быстрые итерации
- ✅ Работа с реальными контрактами

**Преимущества:**
- Не нужен локальный блокчейн
- Реальные данные из Ethereum Mainnet
- Такой же RPC endpoint как в production
- Моментальный hot reload

**Команды:**
```bash
# Запуск (один раз)
docker compose --profile dev up -d

# Редактировать код → автоматически применяется!

# Логи
docker compose --profile dev logs -f

# Остановка
docker compose --profile dev down
```

---

### prod (Порт 8008)

**Назначение:** Тестирование production build перед деплоем

| Параметр | Значение |
|----------|----------|
| **URL** | http://localhost:8008 |
| **RPC** | `/api/rpc` |
| **RPC Backend** | `ethereum.publicnode.com` |
| **RPC Proxy** | nginx (reverse proxy) |
| **Hot Reload** | ❌ Нет (требуется пересборка) |
| **Время запуска** | ~45 сек (полная сборка) |
| **Контейнер** | `dotflat-prod` |
| **Dockerfile** | `Dockerfile` (multi-stage) |
| **Web Server** | Nginx Alpine |
| **Build Cache** | Используется |
| **node_modules** | Только в builder stage |
| **Source Maps** | Минимальные |
| **Minification** | Да |
| **Bundle Size** | ~218KB gzipped (оптимизирован) |
| **Image Size** | 72MB (19MB compressed) |

**Когда использовать:**
- ✅ Перед push в develop/master
- ✅ Тестирование production build
- ✅ Проверка nginx конфигурации
- ✅ Измерение реального bundle size
- ✅ Тестирование performance

**Команды:**
```bash
# Сборка и запуск
docker compose --profile prod up --build -d

# Пересборка после изменений
docker compose --profile prod up --build -d

# Логи nginx
docker compose --profile prod logs -f

# Остановка
docker compose --profile prod down
```

---

## Выбор режима

### Вы разрабатываете смарт-контракты?
→ `dev-local` (порт 3007)

### Вы разрабатываете frontend с реальными данными?
→ `dev` (порт 3008) ⭐ **Рекомендуется**

### Вы тестируете перед деплоем?
→ `prod` (порт 8008)

---

## Workflow примеры

### Frontend разработка (типичный день)

```bash
# Утро: запустить один раз
docker compose --profile dev up -d

# Весь день: редактировать код
# → изменения применяются автоматически через hot reload

# Вечер: остановить
docker compose --profile dev down
```

### Разработка смарт-контрактов

```bash
# Терминал 1: локальная нода
npx hardhat node

# Терминал 2: frontend
docker compose --profile dev-local up -d

# Деплой контрактов, тестирование через UI
# → hot reload работает

# Готово
docker compose --profile dev-local down
```

### Pre-commit проверка

```bash
# Перед коммитом: протестировать production build
docker compose --profile dev down
docker compose --profile prod up --build -d

# Проверить http://localhost:8008

# Всё работает → коммитить
docker compose --profile prod down
```

---

## Hot Reload Performance

| Действие | dev-local | dev | prod |
|----------|-----------|-----|------|
| **Первый запуск** | ~3 сек | ~3 сек | ~45 сек |
| **Изменение .js файла** | ~2-3 сек | ~2-3 сек | ~45 сек (rebuild) |
| **Изменение .css файла** | ~1 сек | ~1 сек | ~45 сек (rebuild) |
| **Перезапуск контейнера** | ~3 сек | ~3 сек | ~45 сек |
| **npm install новой зависимости** | ~30 сек | ~30 сек | ~45 сек (в rebuild) |

**Вывод:** dev и dev-local идентичны по скорости, в 15x быстрее prod для итераций.

---

## Порты Summary

| Режим | Frontend | RPC Target | Workers | Redis |
|-------|----------|------------|---------|-------|
| dev-local | 3007 | localhost:8545 | - | - |
| dev | 3008 | /api/rpc (proxy) | - | - |
| prod | 8008 | /api/rpc (nginx) | 3002-3003 | 6379 |
| workers | - | - | 3002-3003 | 6379 |

---

## Environment Variables

### dev-local

```bash
REACT_APP_RPC_URL=http://host.docker.internal:8545
NODE_ENV=development
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

### dev

```bash
REACT_APP_RPC_URL=/api/rpc
NODE_ENV=development
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

### prod

```bash
# RPC настроен в nginx.conf
# Переопределяется в production deployment через переменные окружения
```

---

## Troubleshooting

### dev-local: Cannot connect to localhost:8545

**Проблема:** `ECONNREFUSED localhost:8545`

**Решение:**
1. Проверьте что локальная нода запущена:
   ```bash
   curl -X POST http://localhost:8545 \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```
2. Если нода на другом порту, измените в docker-compose.yml:
   ```yaml
   environment:
     - REACT_APP_RPC_URL=http://host.docker.internal:YOUR_PORT
   ```

### dev: RPC proxy не работает

**Проблема:** `setupProxy.js` ошибка

**Решение:**
1. Проверьте что `http-proxy-middleware` установлен
2. Перезапустите контейнер: `docker compose --profile dev restart`
3. Проверьте логи: `docker compose --profile dev logs -f`

### Hot reload не обнаруживает изменения

**Проблема:** Файлы меняются, но webpack не перекомпилирует

**Решение:**
1. Убедитесь что polling включён (уже настроено в docker-compose.yml)
2. Проверьте volume mapping: `docker inspect dotflat-dev | grep Mounts`
3. Перезапустите: `docker compose --profile dev restart`
