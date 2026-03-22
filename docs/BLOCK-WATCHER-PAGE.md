# Block Watcher Monitoring Page

## Описание

Специальная страница для мониторинга состояния `block-watcher` сервиса и просмотра кэшированных данных.

**URL:** `/block-watcher`

## Функциональность

### 1. Health Status Dashboard

Отображает актуальное состояние block-watcher:

- **Status** - текущий статус (healthy/degraded/error)
- **Uptime** - время работы с момента запуска
- **Watched Contracts** - количество отслеживаемых контрактов
- **Transactions Indexed** - количество проиндексированных транзакций
- **Events Indexed** - количество проиндексированных событий
- **Last Network Block** - последний блок в сети
- **Last Network Block Time** - время последнего блока
- **Last Relevant Block** - последний блок с релевантными транзакциями
- **Last Relevant Block Time** - время релевантного блока
- **Last Processed Block** - последний обработанный блок
- **Historical Sync Progress** - прогресс исторической синхронизации (если идет)

### 2. Contract Selector

Dropdown список всех отслеживаемых контрактов:
- Загружается из endpoint `/api/contracts`
- Показывает имя и адрес контракта
- При выборе загружает данные для этого контракта

### 3. Events Table

Таблица с проиндексированными событиями выбранного контракта:

| Колонка | Описание |
|---------|----------|
| Event | Название события (цветом) |
| Block | Номер блока |
| Timestamp | Время события |
| Transaction | Ссылка на Etherscan |
| Return Values | Параметры события (развернуть) |

**Особенности:**
- Последние 50 событий по умолчанию
- Детали событий раскрываются по клику
- Прямые ссылки на Etherscan для каждой транзакции
- JSON форматирование returnValues

### 4. Transactions Table

Таблица с raw транзакциями выбранного контракта:

| Колонка | Описание |
|---------|----------|
| Hash | Хэш транзакции (ссылка на Etherscan) |
| Block | Номер блока |
| From | Адрес отправителя (сокращенно) |
| To | Адрес получателя (сокращенно) |
| Value | Переданный ETH |
| Gas Used | Использованный газ |
| Status | Success/Failed |

**Особенности:**
- Последние 50 транзакций по умолчанию
- Цветовая индикация статуса (зеленый/красный)
- Прямые ссылки на Etherscan

### 5. Tabs Navigation

Переключение между двумя вкладками:
- **Events** - декодированные события
- **Transactions** - raw транзакции

Счетчик записей в каждой вкладке.

## Навигация на страницу

Клик на любой Worker в панели "Workers" открывает страницу Block Watcher:

```javascript
<Worker 
  title="Block Watcher"
  name="Monitors blockchain"
  icon="/img/robot.png"
  healthUrl="http://localhost:3002/health"
  onClick={() => navigate('/block-watcher')}
/>
```

Доступна на всех страницах приложения.

## Автообновление

- Health status обновляется каждые 5 секунд
- Данные контрактов обновляются при переключении контракта
- Данные вкладок обновляются при переключении

## UI/UX

### Цветовая схема

- **Status indicators:**
  - Зеленый (#4caf50) - healthy
  - Оранжевый (#ff9800) - degraded
  - Красный (#f44336) - error
  - Серый (#9e9e9e) - unknown

- **Tabs:**
  - Events tab - зеленый (#4caf50)
  - Transactions tab - синий (#2196f3)

- **Tables:**
  - Темная тема (#1a1a1a, #222, #2a2a2a)
  - Чередующиеся строки для читаемости

### Responsive

- Таблицы с горизонтальным скроллом
- Grid layout для health metrics
- Адаптивная ширина колонок

## Панели на странице

Страница включает все стандартные боковые панели (Balances, Credits, Deposits, Auctions, Pools, Workers, Contracts, Commodities) для удобной навигации.

## Development

### Запуск

```bash
# Запустить block-watcher
docker compose --profile dev up

# Открыть страницу
http://localhost:3000/block-watcher
```

### Debug

```bash
# Проверить health
curl http://localhost:3002/health

# Проверить список контрактов
curl http://localhost:3002/api/contracts

# Проверить события
curl "http://localhost:3002/api/events/0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122?limit=10"

# Проверить транзакции
curl "http://localhost:3002/api/transactions/0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122?limit=10"
```

## Troubleshooting

### Проблема: "Loading worker status..." не пропадает

**Причина:** block-watcher не запущен или недоступен на `http://localhost:3002/health`

**Решение:**
```bash
docker compose --profile dev up
```

### Проблема: Список контрактов пустой

**Причина:** block-watcher еще не загрузил контракты

**Решение:** Подождать несколько секунд, пока block-watcher инициализируется.

### Проблема: "No events indexed yet"

**Причина:** 
1. Block-watcher еще синхронизирует исторические данные
2. В выбранном контракте нет событий
3. События не добавлены в `events-config.json`

**Решение:** Проверить `historicalSyncProgress` в health status.

### Проблема: Transactions показывают "0", но Events есть

**Причина:** Etherscan API требует `ETHERSCAN_API_KEY`

**Решение:** Добавить ключ в `.env`:
```bash
ETHERSCAN_API_KEY=your_key_here
```

## Файлы

- `src/pages/BlockWatcherPage.js` - React компонент страницы
- `workers/block-watcher/src/health-server.js` - API endpoints
- `workers/block-watcher/DUAL-CACHE.md` - Архитектура кэширования
