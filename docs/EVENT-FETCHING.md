# Event Fetching - Решение проблемы "exceed maximum block range"

## Проблема

RPC провайдер Rivet ограничивает максимальный диапазон блоков в одном запросе до **50,000 блоков**.

### Ошибка:
```
Returned error: exceed maximum block range: 50000
```

### Причина:
```javascript
// fromBlock в config.js
export const fromBlock = 21677704;

// Запрос событий до текущего блока
contract.getPastEvents('Transfer', {
  fromBlock: fromBlock,  // 21677704
  toBlock: 'latest'      // например, 21750000
});

// Диапазон: 21750000 - 21677704 = 72,296 блоков > 50,000 ❌
```

## Решение

Создана утилита `src/utils/eventHelpers.js` которая автоматически разбивает большие запросы на чанки по 49,999 блоков.

### Использование

```javascript
import {getPastEventsChunked} from "../utils/eventHelpers";

// Вместо:
const events = await contract.getPastEvents('Transfer', {
  fromBlock: fromBlock,
  toBlock: 'latest'
});

// Используем:
const events = await getPastEventsChunked(
  contract,
  'Transfer',
  {fromBlock: fromBlock, toBlock: 'latest'},
  web3  // нужен для получения текущего номера блока
);
```

## Как работает

### Автоматическое разбиение на чанки

```javascript
// fromBlock: 21677704
// toBlock: 21750000 (latest)
// totalRange: 72,296 блоков

// Разбивается на чанки:
// Chunk 1: 21677704 - 21727703 (49,999 блоков)
// Chunk 2: 21727704 - 21750000 (22,296 блоков)

// Результаты объединяются в один массив
```

### Логирование

В консоли будут видны запросы:
```
Fetching Transfer events: blocks 21677704 - 21727703
Fetching Transfer events: blocks 21727704 - 21750000
```

## Дополнительные утилиты

### getRecentEvents - последние N событий

Эффективно получает недавние события, запрашивая блоки в обратном порядке:

```javascript
import {getRecentEvents} from "../utils/eventHelpers";

// Получить последние 100 Transfer событий
const events = await getRecentEvents(
  contract,
  'Transfer',
  100,           // limit
  { from: walletAddress },  // filter
  web3
);
```

### getPastEventsPaginated - постраничная загрузка

Для больших списков с пагинацией:

```javascript
import {getPastEventsPaginated} from "../utils/eventHelpers";

const {events, hasMore, total} = await getPastEventsPaginated(
  contract,
  'Transfer',
  0,    // page (0-based)
  50,   // pageSize
  {fromBlock: fromBlock},
  web3
);
```

### getBlockNumberDaysAgo - расчет блока по дате

Получить номер блока N дней назад:

```javascript
import {getBlockNumberDaysAgo} from "../utils/eventHelpers";

// События за последние 7 дней
const fromBlock = await getBlockNumberDaysAgo(web3, 7);
const events = await getPastEventsChunked(
  contract,
  'Transfer',
  {fromBlock, toBlock: 'latest'},
  web3
);
```

## Измененные файлы

Обновлены все компоненты, которые использовали `getPastEvents`:

- ✅ `src/components/Transfers.js` - Transfer события (from/to wallet)
- ✅ `src/components/Pool.js` - NewVoting события
- ✅ `src/components/DAO.js` - NewVoting события
- ✅ `src/components/MyPanel.js` - newAuction, PositionOpened, DepositOpened
- ✅ `src/components/Auction.js` - newBid события
- ✅ `src/components/RuleToken.js` - использует getTransfers/getHolders
- ✅ `src/components/DFC.js` - использует getTransfers/getHolders
- ✅ `src/utils/utils.js` - функции getTransfers и getHolders

## Производительность

### Преимущества chunked подхода:

1. **Никогда не превышает лимит провайдера**
2. **Прогресс в консоли** - видно сколько чанков загружается
3. **Отказоустойчивость** - можно добавить retry для отдельных чанков
4. **Параллелизация** - можно загружать чанки параллельно (future improvement)

### Пример загрузки:

```
Диапазон: 100,000 блоков
Разбивка: 3 чанка (49999 + 49999 + 2 блока)
Время: ~3-5 секунд (вместо ошибки)
```

## Ограничения

- Большие диапазоны всё равно требуют времени
- Рекомендуется использовать `getRecentEvents` когда нужны только последние события
- Для аналитики лучше использовать event indexer (отдельный сервис)

## Дальнейшие улучшения

1. **Параллельные чанки** - загружать несколько чанков одновременно
2. **Кэширование результатов** - сохранять события в localStorage/IndexedDB
3. **Event indexer** - отдельный сервис для индексации событий (часть workers)
4. **Оптимизация fromBlock** - хранить последний обработанный блок для каждого пользователя
