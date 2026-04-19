# Changelog

Все заметные изменения проекта документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### 2026-04-19 — Воркер: HTTP polling, backup-индекс событий, restore lastRelevantBlock

#### Fixed

- **Воркер (`workers/block-watcher/src/index.js`)** — главная причина «кэш
  не подхватывает новые блоки»: публичный WebSocket у `publicnode.com`
  регулярно рвался с `PendingRequestsOnReconnectingError`, из-за чего:
  - события свежих транзакций не попадали в Redis (`receipt.logs` декодились
    молча с падением, уровень лога `debug` → в никуда);
  - catch-up после каждого реконнекта падал на `Cannot read properties of
    null (reading 'number')` — `getBlock(blockNum)` возвращал null во время
    реконнекта и полностью останавливал цикл подгонки.
- По умолчанию воркер подключается через **HTTP polling каждые 5 секунд**
  (стабильно, никаких реконнектов). WebSocket можно принудительно включить
  через `USE_WS=1`, иначе используется HTTP даже при наличии `RPC_WS_URL`.
- Polling-цикл теперь идёт с чекпойнтом `lastPolledBlock`: при лаге между
  `getBlockNumber` и `getBlock` один и тот же блок не обрабатывается дважды,
  а при `null` из `getBlock` мы не двигаем чекпойнт и повторим на следующей
  итерации.
- Null-safe catch-up на WS-reconnect: `getBlock(blockNum)` теперь проверяется
  на `null`, что защищает от обрыва цикла подгонки.
- **`indexBlockEventsForContract()`** — после индексации watched-tx
  дополнительно дёргается `getPastEvents(eventName, { fromBlock: bn,
  toBlock: bn })` для backup-индекса. Это отдельный `eth_getLogs` запрос,
  устойчивый к сбоям декодинга `receipt.logs`; `indexEvent` идемпотентен
  по `eventKey`, так что дублирования не возникает.
- Ошибки `_decodeEventABI` в `processReceiptEvents` подняты с `debug` до
  `warn` — раньше они уходили в `/dev/null`, из-за чего пропущенные события
  было невозможно диагностировать.
- **`lastRelevantBlock` / `lastRelevantBlockTime` восстанавливаются при
  старте** из последней (по score) транзакции в `txs:{address}:list`.
  Раньше после рестарта воркера эти поля показывали прочерк на
  `/block-watcher` до первой новой watched-tx.

### 2026-04-19 — CDP: позиции индексируются с 0 (фикс агрегированного fee)

#### Fixed

- **`src/components/CDP.js`** — цикл агрегации fee по всем позициям шёл
  `for (let i = 1; i <= numPositions; i++)`, тогда как `posID` выдаётся
  пост-инкрементом в `openCDP` и стартует с 0. При `numPositions = 1`
  цикл попадал на пустую позицию (`owner = 0x0`, `coinsMinted = 0`) и
  клал в `feeAccruedSum` и `feeRecordedSum` нули. В результате
  `overall fee earned` = только исторические переводы в аукцион,
  `outstanding` всегда 0. Теперь `for (let i = 0; i < numPositions; i++)`.

#### Changed

- **`src/components/CDP.js`** — `overall fee recorded` переименован в
  `of which recorded on-chain` и перемещён под `overall fee earned`, чтобы
  было ясно: это **часть** outstanding (уже кристаллизованная в
  `interestAmountRecorded`), а не отдельное слагаемое. Складывать recorded
  и accumulated interest — это double counting той же закристаллизованной
  части долга.

### 2026-04-19 — Deposit: авторефреш accumulated interest каждые 15с

#### Changed

- **`src/components/Deposit.js`** — `overallInterest(id)` теперь вызывается
  с `noCache: true` (метод time-dependent, растёт каждый блок от
  `block.timestamp`). Добавлен тихий таймер `setInterval(15s)` с
  `silent: true` для периодического обновления без мерцания `loading`-стейта;
  таймер чистится в `componentWillUnmount`. Все числа форматируются через
  `formatNumber` (coinsDeposited — 2 знака, accumulated interest — 8,
  чтобы видно было приращение на каждом блоке при ~8% годовых).

### 2026-04-19 — Откат noCache для user-specific чтений (чиним воркер, не обходим)

#### Changed

- Откачены все `noCache: true`, добавленные ранее для user-specific данных
  (`flatCoin.allowance`, `flatCoin.balanceOf`, `rule.balanceOf`,
  `rule.allowance`, `dao.pooled`, `deposit.deposits(id)`, списки событий
  `DepositOpened` в `MyPanel`). Причина: обход кэша воркера маскировал
  настоящую проблему — WS-подписка теряла события и вообще не обновляла
  Redis. После фикса воркера (см. выше) он инвалидирует кэш по событиям
  надёжно, и обходить его на каждом чтении не нужно. Остаётся `noCache` только
  для реально time-dependent методов (`cdp.totalCurrentFee`, `cdp.positions`
  с учётом начисленного интереса, `deposit.overallInterest`) — они
  пересчитываются каждый блок от `block.timestamp`, их кешировать
  бессмысленно.
- Затронутые файлы: `src/components/Product.js`, `src/components/MyPanel.js`,
  `src/components/DepositContract.js`, `src/components/DAO.js`,
  `src/components/CDP.js` (только allowance пользователя),
  `src/components/DebtPosition.js` (кроме time-dependent),
  `src/components/OpenDeposit.js`, `src/utils/cacheApi.js`.

### 2026-04-19 — DebtPosition авторефреш + noCache для balanceOf пользователя

#### Changed

- **`src/components/DebtPosition.js`** — `positions(id)`, `totalCurrentFee(id)`
  и `getMaxFlatCoinsToMintForPos(id)` теперь вызываются с `noCache: true`.
  `accumulated interest` пересчитывается каждый блок от `block.timestamp`,
  а воркер мог отдавать застывшее значение из Redis. Дополнительно компонент
  раз в 15 секунд тихо (`silent: true`, без флага `loading`) перезапрашивает
  данные позиции, чтобы цифра шла в реальном времени без ручного обновления
  страницы. Таймер чистится в `componentWillUnmount`.
- **`src/components/Product.js`** — `balanceOf(account)` для DFC и RLE в
  левой панели Balances теперь дёргается с `noCache: true`. Кэш воркера
  инвалидируется по событиям, но между событием и фактической инвалидацией
  бывает лаг 10–30 сек, что приводит к залипшему балансу пользователя
  после его собственных транзакций. Для own-account balance это было
  особенно заметно — теперь баланс читается напрямую из RPC при каждом
  ремаунте/смене аккаунта.

### 2026-04-19 — DebtPosition formatting + разбивка fee + renewWorkerCache

#### Added

- **`renewWorkerCache(contractKeyOrName)`** в `src/utils/cachedContractCall.js` —
  best-effort хелпер: после успешной write-tx дёргает `POST /api/renewCache/{key}`
  на воркере, чтобы сразу очистить все кэши этого контракта (events, txs,
  индивидуальные вызовы методов, зависимости, ETH-баланс). Без него фронт
  после reload всё равно получает кэш, пока воркер не обработает блок с
  транзакцией (~10–30 сек задержки).
- **`renewContractCache` в воркере (`workers/block-watcher/src/index.js`)** —
  теперь чистит не только события/транзакции, но и:
  - `contract:v2:{contractKey}:*` — все кэши индивидуальных вызовов методов;
  - `contract:v2:{depKey}:*` — зависимые контракты из `cacheDependencies`;
  - `eth:balance:{contractAddress}` — ETH-баланс самого контракта.
- **OpenDeposit / WithDrawDeposit** вызывают `renewWorkerCache('deposit')`
  на событии `confirmation` до `window.location.reload()` — свежий депозит
  появляется сразу, без «не отображается после открытия».

#### Changed

- **DebtPosition (`src/components/DebtPosition.js`)** — все численные поля
  (coinsMinted, ethereum locked, maxCoinsToMint, recorded fee, accumulated
  interest) форматируются через `formatNumber` с разделителями тысяч и
  фиксированными 2–4 знаками.
- **CDP (`src/components/CDP.js`)** — `overall fee earned` теперь
  сопровождается явной разбивкой: `paid to auction: X + outstanding: Y`,
  чтобы не возникало иллюзии, что накопленный fee не учтён. Под
  `overall fee recorded` — пояснение, что это часть outstanding, уже
  кристаллизованная в `interestAmountRecorded`. `positions(i)` в агрегате
  теперь читается с `noCache: true` — раньше залипал старый снимок от
  момента `openCDP`, если событие `PositionUpdated` не инвалидировало кэш.

### 2026-04-19 — CDP: overall fee earned включает переводы в auction

#### Changed

- **CDP (`src/components/CDP.js`)** — `overall fee earned` теперь считается как
  сумма исторических переводов DFC с CDP → auction контракт (реализованная
  часть, уже отправленная в аукцион) плюс текущий начисленный fee по активным
  позициям (`totalCurrentFee`). Раньше учитывали только начисленный, что давало
  заниженную (часто нулевую) картину для контракта, который большую часть
  комиссий уже давно отдал в аукцион. Transfer-события тянутся через
  `getPastEventsCached` с фильтром `{ from: cdpAddress, to: auctionAddress }`;
  результат дополнительно верифицируется на клиенте (не все воркеры/RPC честно
  применяют filter по indexed-параметрам).

### 2026-04-19 — Фикс CDP fees (worker теряет именованные ключи структур)

#### Fixed

- **Воркер (`workers/block-watcher/src/health-server.js`, `src/index.js`)** —
  `callContractMethod` сериализовал Web3 `Result` через голый
  `JSON.stringify`, который видел array-like и ВЫБРАСЫВАЛ именованные ключи.
  В итоге на клиенте `position.interestAmountRecorded`, `coinsMinted` и др.
  превращались в `undefined` → `overall fee recorded` всегда был `0`. Добавлен
  хелпер `toSerializable`, который разворачивает такие структуры в plain-object
  с сохранением и числовых, и именованных ключей. Cache prefix поднят до
  `contract:v2:` — автоматическая инвалидация старых «битых» записей.
- **CDP (`src/components/CDP.js`)** — чтение `positions(i)` теперь устойчиво:
  сначала пытаемся взять `position.interestAmountRecorded`, при `undefined`
  — индексом `[2]` (на случай старого воркера или прямого RPC fallback'а,
  где формат отличается). Добавлен отладочный лог позиций в консоль.

#### Added

- **noCache в cachedContractCall** — `cachedContractCall(..., { noCache: true })`
  пробрасывает `?noCache=1` воркеру; воркер в этом режиме обходит Redis и на
  чтение, и на запись. Применено для time-dependent методов:
  `cdp.totalCurrentFee(i)` и `deposit.overallInterest(i)` — их значение
  зависит от `block.timestamp` и растёт каждый блок, кеш с TTL=0 (как было)
  замораживал бы их навсегда.

#### Changed

- **CDP (`src/components/CDP.js`)** — `total coins minted`, `overall fee earned`,
  `overall fee recorded` теперь отображаются с 2 знаками после запятой
  (вместо 4).

### 2026-04-19 — Числовое форматирование + INTDAO параметры

#### Added

- **`formatNumber(value, decimals)`** в `src/utils/utils.js` — единый хелпер
  форматирования чисел через `Intl.NumberFormat('en-US')`. Запятые как
  разделители тысяч, точка как десятичная. `decimals = null` — авто до 4 знаков.
  Для невалидных значений возвращает `'N/A'` (удобный сентинел для «ещё не
  загрузилось»).
- **Карточка INTDAO (`src/components/DAO.js`)** — новая collapsable-секция
  **Contract parameters** (паттерн из `ExchangeRateContract.Price Updates History`):
  - **Governance params**: stabilizationFundPercent, collateralDiscount,
    interestRate, depositRate, minAuctionPriceMove, maxRuleEmissionPercent,
    auctionTurnDuration. Проценты показываются как `N%`, секунды — с
    человекочитаемой декомпозицией (`86400s (1d)`).
  - **Linked contracts**: rule, flatCoin, cdp, oracle, deposit, basket,
    auction — адреса как ссылки на explorer. Пустые / не заполненные —
    серым `N/A`.
  - Все значения читаются параллельно через `cachedContractCall('dao',
    'params'/'addresses', [name])`, каждая ошибка ловится индивидуально и
    не ломает остальные строки.

#### Changed

- **`src/components/DFC.js`** — все числовые показатели выводятся через
  `formatNumber` с запятыми. `stabilization fund` и `stabilization fund demand`
  округлены до центов (`7,285.49`, `-55.46`) вместо длинных хвостов типа
  `240.95629528158297`. `overall collateral` показывается как `$7,285.49`.
  Состояние `supply`/`stubFund`/`indicative` теперь числовые, форматирование
  только в render.
- **`src/components/CDP.js`** — `stubFund`, `exceed`, `tscSupply`, `wethBalance`,
  `collateral`, `feeEarned`, `feePayed`, `RuleBalanceOfCDP`, `userAllowence`,
  `positionsCount` теперь форматируются с тысячными разделителями.
- **`src/components/RuleToken.js`** — `total supply`, `burned`, `marketCap`,
  `pool volume`, price in DFC/USD форматируются через `formatNumber`, вместо
  собственных `.toFixed()` в setState.

### 2026-04-19 — Страница RLE: burned / price / marketCap / TVL

#### Added

- **`src/utils/uniswap-config.js`** — добавлен poolId V4 пула DFC/RLE
  (`POOLS.DFC_RLE_V4 = 0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044`).
- **`src/utils/uniswap-quoter.js`** — helper `getV4PoolStateById(poolId)` и
  публичная функция `getRleDfcPoolInfo(rleAddress)`. Считывают `slot0` и
  `liquidity` из Uniswap V4 StateView по bytes32 poolId (не требуется знать
  PoolKey). Возвращают цену 1 RLE в DFC и упрощённый состав пула
  (`amountRle`, `amountDfc`). Направление валют вычисляется из
  лексикографического сравнения адресов DFC и RLE (canonical V4 ordering).
- **`src/components/RuleToken.js`** — расширен карточный view:
  - **total burned** — сумма `Transfer` событий с `to = 0x0` за всю историю
    (именно так RLE утилизируется при buy-back auction).
  - **price in stableCoins (from pool)** — цена RLE в DFC из V4 пула,
    дополнительно отображается в USD (через DFC/ETH × ETH/USD).
  - **marketCap** = `totalSupply_RLE * price_RLE_в_DFC * price_DFC_в_USD`.
  - **pool volume (TVL)** — обе стороны пула в долларах по текущей цене.
  - Сброс `NOT_LOADED`-сентинел и `N/A` в render'е: больше не показываем
    «0» как факт, если котировка пула/цена ETH ещё не подъехали.

#### Changed

- **`src/components/MyPanel.js`** — `RuleToken` теперь получает `web3` и
  `ethPriceUniswap`, необходимые для оценки marketCap.

#### Fixed

- **`src/utils/cacheApi.js`** — `getPastEventsCached` теперь *не доверяет*
  пустому ответу Block Watcher'а и всё равно страхуется через Etherscan.
  Причина: при рестарте/прогреве воркера кеш Redis для контракта может
  быть пустым — и старый код честно возвращал 0 событий, из-за чего на
  страницах DFC/RLE периодически «мигало» `N of transactions: 0` и
  `N of holders: 0`. Если worker вернул непустой массив — доверяем ему
  без дополнительных запросов (быстрый путь сохранён). Если упал и
  Etherscan — возвращаем `workerEvents` (обычно пустой) вместо взрыва.

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

