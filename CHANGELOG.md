# Changelog

Все заметные изменения проекта документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

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

