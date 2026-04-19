# Changelog

Все заметные изменения проекта документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### 2026-04-19 — Отказоустойчивость при падении Block Watcher и `/api/rpc`

Задача: приложение должно оставаться работоспособным, даже если
недоступен `watcher` pod и/или nginx `/api/rpc` прокси. Информация о
цене ETH, состоянии DFC/CDP и прочих контрактах должна подтягиваться
напрямую из публичных RPC — без зависимости от нашей инфраструктуры.

#### Added

- **`src/utils/workerCircuitBreaker.js`** — circuit breaker для Block
  Watcher API. После `FAILURE_THRESHOLD` (3) подряд ошибок цепь
  открывается на 30 с: запросы к воркеру не делаются, вызывающий код
  сразу идёт в fallback. Главное «лекарство» — `fetchWorkerWithTimeout`
  с жёстким таймаутом 3 с через `AbortController` (без него зависший
  fetch блокировал промисы на десятки секунд).
- **`cachedContractCall` / `cachedEthBalance`** в
  `src/utils/cachedContractCall.js` — единая обёртка над вызовами
  контрактов: сначала воркер (кэш Redis), при любой ошибке/таймауте —
  прямой вызов в публичный RPC. Добавлен `withPublicRpc` c перебором
  `ethereum-rpc.publicnode.com` → `eth.llamarpc.com`. Кэш инстансов
  `Web3` — `directWeb3Cache`, чтобы не пересоздавать на каждый вызов.
- **Etherscan API fallback для `getPastEventsCached`** в
  `src/utils/cacheApi.js` — если воркер и прямой `eth_getLogs` не
  отвечают, события тянутся через Etherscan API. Это медленно и ест
  лимит, но гарантирует доступность историй транзакций.
- **`config.publicRpc`** в `src/utils/config.js` — публичный RPC
  (`https://ethereum-rpc.publicnode.com` по умолчанию, переопределяется
  через `REACT_APP_PUBLIC_RPC_URL`). Используется как primary когда нет
  MetaMask, вместо зависящего от nginx `/api/rpc`.

#### Changed

- **`src/contexts/Web3Context.js`** — приоритет инициализации `web3`:
  MetaMask mainnet → публичный RPC напрямую → `/api/rpc` (legacy).
  Publicnode отдаёт CORS и работает прямо из браузера, не требуя
  nginx-прокси.
- **`src/utils/pool-liquidity-direct.js`** — прямые `fetch('/api/rpc',
  ...)` заменены на `rpcCall()` с цепочкой `/api/rpc` → `publicnode` →
  `llamarpc`. Добавлена проверка `content-type`, чтобы HTML-503 от
  nginx не проваливался в `response.json()` с `SyntaxError: Unexpected
  token '<'`. Таймаут на каждый endpoint — 5 с.
- **Массовая миграция 23 компонентов и страниц с прямого
  `fetch(BLOCK_WATCHER_API/...)` на `cachedContractCall` /
  `cachedEthBalance`**:
  - Страницы данных: `DFC`, `CDP`, `DAO`, `Pool`, `Auction`,
    `Transfers`, `Basket`, `Commodity`, `DebtPosition`,
    `DepositContract`, `AuctionContract`, `ExchangeRateContract`,
    `RuleToken`, `Deposit`, `Product`, `CommoditiesPage`.
  - Формы транзакций: `WithDrawDeposit`, `UpdateCDP`,
    `WithdrawEtherCDP`, `MakeBidTSCBuyout`, `OpenDeposit`,
    `PayInterestCDP`, `CloseCDP`, `Borrow`.
- **`src/pages/BlockWatcherPage.js`** (админка мониторинга воркера) —
  прямые `fetch` к `/health`, `/api/contracts`, `/api/events`,
  `/api/transactions` обёрнуты в `fetchWorkerWithTimeout`. Здесь
  fallback по смыслу не нужен (страница следит именно за воркером), но
  таймаут защищает от зависшего UI.
- **`src/utils/cacheApi.js`** — `getContractTransactions` и
  `getContractEvents` используют `fetchWorkerWithTimeout` и circuit
  breaker, чтобы «дохлый» воркер не блокировал страницы.

#### Fixed

- **`SyntaxError: Unexpected token '<'` при падении `/api/rpc` (503)**
  — когда nginx отвечал HTML-страницей 503, `web3.js` пытался
  распарсить её как JSON-RPC ответ. Теперь `rpcCall()` проверяет
  `content-type`, а основной `web3` без MetaMask сразу идёт в
  publicnode, минуя сломанный прокси.
- **«Loading DFC data…» и «Loading CDP data…» без завершения** при
  недоступном воркере — причина в `fetch` без таймаута к
  `BLOCK_WATCHER_API`. После миграции на `cachedContractCall` с
  circuit breaker'ом промисы разрешаются максимум через 3 с, и UI
  заполняется данными из публичного RPC.
- **Цена ETH из контракта не показывалась на главной** — `oracle
  .getPrice('eth').call()` падал через `/api/rpc`. Теперь основной
  `web3` в проде без MetaMask указывает прямо на publicnode, и
  on-chain цена подтягивается независимо от состояния кластера.

### 2026-04-19 — Оптимизация фронтенд-бандла и включение gzip

#### Added

- **Code splitting на уровне роутов** (`src/App.js`): все страницы
  переведены на `React.lazy()` + `<Suspense>` с единым fallback'ом,
  чтобы в `main.js` оставался только каркас приложения.
- **Code splitting для тяжёлых компонентов** (`src/components/MyPanel.js`):
  дочерние компоненты (`Commodity`, `Transaction`, `Auction`, `Basket`,
  `Transfers`, `RuleToken`, `DFC`, `Borrow`, `ExchangeRateContract` и др.)
  загружаются лениво через `React.lazy()`, рендер обёрнут в `<Suspense>`.
- **Webpack prefetch** для часто используемых страниц и компонентов
  (Balances, Credits, Deposits, Auctions, Pools, Contracts, Commodities,
  Basket, DFC, ExchangeRateContract) — браузер догружает их в фоне после
  idle, переходы по ним ощущаются мгновенными.
- **Prefetch для WalletConnect** (`src/contexts/Web3Context.js`):
  `walletconnect` утилита помечена `webpackPrefetch: true` для фонового
  подкачивания тяжёлой цепочки `@web3modal/ethers`.
- **gzip-сжатие статики в nginx** (`nginx.conf`): включён `gzip on` с
  `gzip_comp_level 6`, `gzip_min_length 1024`, `gzip_proxied any`,
  `gzip_vary on` и списком MIME-типов (JS, CSS, JSON, SVG, шрифты).

#### Changed

- **Динамические импорты Uniswap-утилит** (`src/components/DFC.js`,
  `src/components/WalletTest.js`): `getPoolLiquidityDirect`,
  `getDfcPriceInEth`, `getPoolSwaps` грузятся `import()` внутри
  обработчиков/эффектов вместо top-level import. Благодаря этому
  `ethers`, `@uniswap/sdk-core`, `@uniswap/v4-sdk` выносятся в отдельные
  chunks и не попадают в стартовый `main.js`.
- **Инлайн `dfcTokenInfo` в `WalletTest.js`**: данные токена берутся
  напрямую из `UNISWAP_CONFIG`, чтобы не тянуть `uniswap-quoter` при
  первичной загрузке компонента.

#### Performance

| Метрика                       | До      | После    |
| ----------------------------- | ------- | -------- |
| `main.js` (gzipped)           | ~1 MB   | ~240 kB  |
| `main.js` (uncompressed)      | ~3.37 MB| ~797 kB  |
| Количество JS-chunks          | 4       | 54       |
| Загрузка ethers/uniswap/recharts | в `main` | lazy + prefetch |

Эффективное сокращение стартового JS-пейлоада — **~4×**. Тяжёлые
библиотеки (ethers, uniswap SDK, recharts, walletconnect) теперь
подгружаются по требованию и/или префетчатся в фоне.

#### Fixed

- **Blank page после деплоя с `main.js` в состоянии `(pending)`**:
  причина — отсутствие gzip в nginx, из-за чего раздавался сырой 797 kB
  `main.js`, что в связке с большим количеством prefetch-линков
  насыщало соединение. Включение gzip в `nginx.conf` решило проблему.

