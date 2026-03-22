# Quick Start Guide - DotFlat Frontend

## Три режима разработки

### 🏠 Development LOCAL - Для работы с локальным блокчейном

**Когда использовать:**
- Разработка и тестирование смарт-контрактов
- Нужен полный контроль над блокчейном
- Работа без интернета

**Запуск:**
```bash
# 1. Запустить локальную Ethereum ноду
ganache-cli -p 8545  # или: npx hardhat node

# 2. Запустить frontend
docker compose --profile dev-local up -d

# 3. Открыть в браузере
open http://localhost:3007
```

**RPC:** `http://localhost:8545` (ваша локальная нода)

---

### 🌐 Development - Для работы с реальной сетью

**Когда использовать:**
- Ежедневная разработка frontend
- Тестирование с реальными данными Mainnet
- Не нужно поднимать локальный блокчейн

**Запуск:**
```bash
# Один раз (образ уже собран с зависимостями)
docker compose --profile dev up -d

# Открыть в браузере
open http://localhost:3008
```

**RPC:** `/api/rpc` → `ethereum.publicnode.com` (через proxy)

**Hot Reload:**
- Редактируйте файлы в `src/`
- Изменения применяются **моментально**
- Контейнер не перезапускается
- React Fast Refresh сохраняет state

---

### 🚀 Production - Для тестирования production build

**Когда использовать:**
- Перед деплоем в production
- Тестирование оптимизированного bundle
- Проверка nginx конфигурации

**Запуск:**
```bash
docker compose --profile prod up --build -d

# Открыть в браузере
open http://localhost:8008
```

**RPC:** `/api/rpc` → `ethereum.publicnode.com` (nginx proxy)

**Особенности:**
- Полная пересборка (~45 сек)
- Минифицированный JS/CSS
- Оптимизированный bundle
- Production nginx конфигурация

---

## Сравнение режимов

| Параметр | dev-local | dev | prod |
|----------|-----------|-----|------|
| **Порт** | 3007 | 3008 | 8008 |
| **RPC** | localhost:8545 | /api/rpc (proxy) | /api/rpc (nginx) |
| **Hot Reload** | ✅ | ✅ | ❌ |
| **Время запуска** | ~3 сек | ~3 сек | ~45 сек |
| **Bundle** | Development | Development | Production |
| **Сервер** | React dev | React dev | Nginx |
| **Blockchain** | Локальный | Mainnet | Mainnet |

---

## Workflow для ежедневной разработки

### Вариант 1: Работа с локальным блокчейном

```bash
# Терминал 1: Запустить локальную ноду
ganache-cli -p 8545

# Терминал 2: Запустить frontend
docker compose --profile dev-local up -d

# Смотреть логи (опционально)
docker compose --profile dev-local logs -f

# Редактировать код → hot reload автоматически
```

### Вариант 2: Работа с реальной сетью (рекомендуется)

```bash
# Запустить frontend (один раз)
docker compose --profile dev up -d

# Смотреть логи (опционально)
docker compose --profile dev logs -f

# Редактировать код → hot reload автоматически
```

### Перед коммитом: протестировать production build

```bash
# Остановить dev
docker compose --profile dev down

# Запустить prod
docker compose --profile prod up --build -d

# Проверить что всё работает
open http://localhost:8008

# Остановить prod
docker compose --profile prod down
```

---

## Полезные команды

### Просмотр логов

```bash
# Development LOCAL
docker compose --profile dev-local logs -f

# Development
docker compose --profile dev logs -f

# Production
docker compose --profile prod logs -f
```

### Остановка

```bash
# Остановить конкретный профиль
docker compose --profile dev down
docker compose --profile dev-local down
docker compose --profile prod down

# Остановить всё
docker compose down
```

### Перезапуск (для применения изменений в docker-compose.yml)

```bash
docker compose --profile dev restart
```

### Проверка статуса

```bash
docker compose ps
```

### Очистка

```bash
# Удалить контейнеры и volumes
docker compose --profile dev down -v

# Очистить Docker кеш
docker system prune -f
```

---

## FAQ

**Q: Почему dev-local и dev разделены?**
A: Разные цели:
- `dev-local` - для разработки смарт-контрактов с полным контролем
- `dev` - для frontend разработки с реальными данными

**Q: Как часто нужна пересборка контейнера?**
A: 
- `dev` / `dev-local`: **НИКОГДА** (hot reload)
- `prod`: **Только при изменении зависимостей** или `Dockerfile`/`nginx.conf`

**Q: Какой режим использовать для ежедневной разработки?**
A: `dev` (порт 3008) - быстрый старт, hot reload, реальные данные

**Q: Как подключиться к локальному Hardhat/Ganache?**
A: Используйте `dev-local` профиль - он автоматически подключается к `localhost:8545`

**Q: Можно ли запустить несколько профилей одновременно?**
A: Да! Например `dev` + `prod` для сравнения или `dev-local` + `workers` для полного стека.

---

## Troubleshooting

### Hot reload не работает

1. Проверьте логи: `docker compose --profile dev logs -f`
2. Убедитесь что volume mapping настроен: `docker inspect dotflat-dev | grep Mounts`
3. Перезапустите: `docker compose --profile dev restart`

### Не могу подключиться к localhost:8545

Для `dev-local` профиля:
1. Убедитесь что локальная нода запущена: `curl http://localhost:8545`
2. Проверьте extra_hosts в docker-compose.yml
3. Попробуйте другой порт если 8545 занят

### RPC proxy не работает

```bash
# Проверить proxy
curl -X POST http://localhost:3008/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Должен вернуть JSON с номером блока.
