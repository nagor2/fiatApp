# DotFlat Frontend - Шпаргалка

## 🚀 Быстрый старт

```bash
# Выберите режим:

# Локальный блокчейн (Ganache на 8545)
docker compose --profile dev-local up -d   # → http://localhost:3007

# Ежедневная разработка (рекомендуется)
docker compose --profile dev up -d         # → http://localhost:3008

# Production тестирование
docker compose --profile prod up -d        # → http://localhost:8008
```

## 🎯 Какой режим выбрать?

| Задача | Режим | Порт |
|--------|-------|------|
| Разработка смарт-контрактов | `dev-local` | 3007 |
| **Ежедневная frontend разработка** | **`dev`** | **3008** |
| Тестирование перед коммитом | `prod` | 8008 |

## ⚡ Hot Reload

**dev-local** и **dev** режимы поддерживают hot reload:

1. Запустите контейнер **один раз**
2. Редактируйте код в `src/`
3. Изменения применяются **автоматически** (2-3 сек)
4. Контейнер **НЕ перезапускается**

## 📝 Основные команды

```bash
# Запуск
docker compose --profile dev up -d

# Логи (следить за изменениями)
docker compose --profile dev logs -f

# Остановка
docker compose --profile dev down

# Перезапуск (при изменении docker-compose.yml)
docker compose --profile dev restart

# Статус
docker compose ps
```

## 🔧 RPC Endpoints

| Режим | RPC Path | Backend | Тип |
|-------|----------|---------|-----|
| dev-local | Прямой | localhost:8545 | Локальная нода |
| dev | /api/rpc | ethereum.publicnode.com | Proxy (webpack) |
| prod | /api/rpc | ethereum.publicnode.com | Proxy (nginx) |

## 📦 Установка новых зависимостей

```bash
# Вариант 1: внутри контейнера (рекомендуется)
docker compose --profile dev exec app-dev npm install package-name

# Вариант 2: на хосте
npm install package-name
docker compose --profile dev restart
```

## 🐛 Troubleshooting

### Hot reload не работает

```bash
# Перезапуск
docker compose --profile dev restart

# Проверка логов
docker compose --profile dev logs -f | grep -i compil
```

### RPC не подключается

```bash
# Проверка proxy
curl -X POST http://localhost:3008/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Должен вернуть: {"jsonrpc":"2.0","result":"0x...","id":1}
```

### dev-local: не могу подключиться к localhost:8545

```bash
# Проверка что локальная нода работает
curl http://localhost:8545

# Если нода на другом порту
# → отредактируйте docker-compose.yml:
#   REACT_APP_RPC_URL=http://host.docker.internal:YOUR_PORT
```

### Port already in use

```bash
# Проверить какой процесс занимает порт
sudo lsof -i :3008

# Или изменить порт в docker-compose.yml
ports:
  - "3009:3000"  # использовать 3009 вместо 3008
```

## 🧹 Очистка

```bash
# Остановить и удалить контейнеры
docker compose down

# Удалить volumes
docker compose down -v

# Полная очистка Docker
docker system prune -af
docker volume prune -f
```

## 📊 Мониторинг

```bash
# Ресурсы контейнера
docker stats dotflat-dev

# Размер образов
docker images | grep dotflat

# Активные контейнеры
docker compose ps
```

## 🔗 Полезные ссылки

- [Quick Start Guide](docs/QUICK-START.md)
- [Docker Setup](docs/README-DOCKER.md)
- [Modes Comparison](docs/MODES-COMPARISON.md)
- [RPC Proxy Setup](docs/RPC-PROXY.md)

## 💡 Tips & Tricks

### Работа с несколькими режимами одновременно

```bash
# Запустить dev + prod одновременно для сравнения
docker compose --profile dev --profile prod up -d

# Dev на 3008, Prod на 8008
```

### Быстрая смена между режимами

```bash
# От dev к dev-local
docker compose --profile dev down
docker compose --profile dev-local up -d

# От dev-local к prod
docker compose --profile dev-local down
docker compose --profile prod up -d
```

### Просмотр изменений в реальном времени

```bash
# Терминал 1: логи с фильтром
docker compose --profile dev logs -f | grep -E "Compiling|Compiled"

# Терминал 2: редактировать код
```

### Проверка что hot reload сработал

```bash
# После изменения файла
docker compose --profile dev logs --tail 20 | grep Compiling
```

Если видите "Compiling..." → hot reload работает!
