# Chainlink Grant Application — DotFlat Commodity Oracle

**Грант:** Chainlink Community Grants Program  
**Сайт:** https://chain.link/community/grants  
**Размер:** $10,000 – $100,000 (реалистично $25,000–$50,000)  
**Статус:** Черновик  
**Приоритет:** 🔴 Первый — наибольшее совпадение с интересами фонда  

---

## Почему Chainlink — первый приоритет

DotFlat **уже нуждается** в commodity price feeds (Gold, Oil, Lumber) для работы
протокола. Это не "мы хотим получить деньги на стейблкоин" — это прямое
техническое пересечение с миссией Chainlink: надёжные on-chain данные реального
мира. Chainlink покрывает золото (PAXG/XAU) приемлемо, но **нет** надёжных
on-chain feeds для корзины: lumber, energy, agricultural commodities. DotFlat
закрывает этот пробел и публикует решение как public good.

---

## 1. Project Overview

**Project Name:** DotFlat Commodity Oracle Aggregator  
**Website:** https://dotflat.io / https://beta.app.dotflat.io  
**GitHub:** https://github.com/nagor2/cryptoFiat (contracts) · https://github.com/nagor2/fiatApp (frontend)  
**Contact:** nagor@academ.org  

**One-line pitch:**
> "We are building a commodity price feed aggregator for DeFi — on-chain access to
> gold, oil, lumber and agricultural indices — deployed on Ethereum mainnet as part
> of the DotFlat collateral-backed stablecoin protocol, and open-sourced for the
> entire Chainlink ecosystem."

---

## 2. Problem Statement

### Что сейчас есть в Chainlink

Chainlink Data Feeds покрывают:
- Crypto/USD пары (ETH, BTC, LINK и др.) — хорошо
- Precious metals: XAU/USD, XAG/USD — есть, но ограниченно
- Fiat/Fiat курсы — есть

### Чего не хватает

Для commodity-backed stablecoin нужна **корзина реальных товаров**:

| Commodity | Chainlink Feed | Статус |
|---|---|---|
| Gold (XAU/USD) | Есть | ✅ |
| Oil (WTI/USD) | Нет / нестабильный | ❌ |
| Lumber | Нет | ❌ |
| Wheat / Grain Index | Нет | ❌ |
| Energy Index | Нет | ❌ |

**Последствие для рынка:** ни один DeFi протокол не может создать надёжный
commodity-diversified стейблкоин без этих данных. Весь $1B+ сегмент commodity-
backed stablecoins (сейчас 0.7% рынка стейблкоинов) ограничен одним золотом.

### Кто уже сталкивается с этой проблемой

- DotFlat (DFC) — commodity-backed CDP stablecoin, уже deployed на Ethereum mainnet
- Любой протокол который хочет использовать реальные активы как collateral
- ReFi проекты (carbon credits, natural resources)
- Synthetic asset протоколы

---

## 3. Solution

### Что мы строим

**DotFlat Commodity Oracle Aggregator** — модульная система агрегации цен на
реальные товары для on-chain использования:

```
┌─────────────────────────────────────────────────┐
│         Commodity Price Aggregator               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Sources:                                       │
│  ├─ Chainlink (XAU/USD) ──────────────────┐    │
│  ├─ Commodity APIs (CME, FRED, World Bank) │    │
│  └─ DEX pools (where available) ──────────┤    │
│                                            ▼    │
│                               Aggregator Contract│
│                               (TWAP + outlier   │
│                                removal)         │
│                                    │            │
│                                    ▼            │
│                           On-Chain Price Feed   │
│                           (Chainlink-compatible │
│                            AggregatorV3         │
│                            interface)           │
└─────────────────────────────────────────────────┘
```

### Технические характеристики

- **Interface:** совместим с `AggregatorV3Interface` — любой протокол,
  использующий Chainlink, подключается без изменений
- **Update mechanism:** push-based via keeper + pull-based fallback
- **Manipulation protection:** TWAP + outlier filter (≥3 sources required)
- **Oracle bounds:** цена не может измениться более чем на X% за один блок
  (защита от flash loan атак)
- **License:** MIT — полностью открытый исходный код

### Что это даёт Chainlink экосистеме

1. Новые data feeds которых не было — расширение coverage
2. Reference implementation для commodity feeds
3. Боевое тестирование в production на mainnet (DotFlat уже deployed)
4. Открытый код для форков и адаптаций другими протоколами

---

## 4. DotFlat Protocol — Context

### Что уже deployed на Ethereum Mainnet

| Contract | Address |
|---|---|
| INTDAO (governance) | 0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122 |
| CDP | 0xbCf58DE37791eFe60fE87a6d420FE8F7AEA99ef8 |
| flatCoin / DFC (ERC-20) | 0x1F709Cfa0C409E158C68EdcD32453809c9Eb69EE |
| Deposit | 0x44881F5ac2938AAaF4260d7DBE18997318788f9f |
| Auction | 0xBdFb52d4C9fBdE41805abBb206465aca3b3499D6 |
| Rule Token / RLE | 0x3Dfa45997ddB7980Eb4D73CBfCf0E024F05b08a3 |
| Exchange Rate | 0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B |

### Уникальное ценностное предложение DFC

**DFC — первый basket-of-commodities CDP стейблкоин:**

- **Commodity basket backing** (Gold + Lumber + Oil) — не просто USD peg
- **MEV Protection** через Commit-Reveal механизм в аукционах
- **Real yield** — 100% protocol fees → RLE holders (не инфляционная эмиссия)
- **Fully decentralized** с первого дня (DAO governance через INTDAO)
- **Fully collateralized** — не алгоритмический

### Конкурентный ландшафт (почему DFC уникален)

| Протокол | Backing | CDP | Commodities | MEV Protection |
|---|---|---|---|---|
| DAI (MakerDAO) | ETH + USDC | ✅ | ❌ | ❌ |
| LUSD (Liquity) | ETH only | ✅ | ❌ | ❌ |
| PAXG / XAUT | Gold only | ❌ | Частично | ❌ |
| **DFC (DotFlat)** | **Commodity basket** | **✅** | **✅** | **✅** |

Commodity-backed категория = **0.7% рынка ($1B из $130–150B)** — severely underserved.

---

## 5. Technical Stack

```
Smart Contracts: Solidity 0.8.19, Hardhat, OpenZeppelin v4.9
Oracle: Custom AggregatorV3-compatible contract
Tests: ethers.js v6, Mocha, Chai, TypeChain
Frontend: React 19, Redux, ethers.js v6, Uniswap V4 SDK
Backend: Node.js, Express, Redis cache (60s TTL, auto-invalidated)
Infrastructure: Docker Compose, Nginx, Kubernetes (K3s), GitLab CI/CD
Block Monitoring: Custom block-watcher (WebSocket RPC → Redis invalidation)
```

---

## 6. Grant Budget Request

**Запрашиваемая сумма: $30,000 – $50,000**

| Статья | Сумма | Описание |
|---|---|---|
| Oracle contract development | $15,000 | Разработка AggregatorV3-совместимых контрактов для Oil, Lumber, Grain |
| Data source integration | $8,000 | Интеграция CME, FRED, World Bank API + off-chain aggregator node |
| Security review | $10,000 | Code4rena audit oracle контрактов |
| Documentation & open-source | $5,000 | Technical docs, npm package, deployment guides |
| Testing & deployment | $5,000 | Mainnet deployment, monitoring setup |
| **Итого** | **$43,000** | |

---

## 7. Timeline

| Неделя | Milestone |
|---|---|
| 1–2 | Финализация спецификации commodity feeds, выбор источников данных |
| 3–6 | Разработка oracle aggregator контрактов |
| 7–8 | Интеграция с DotFlat CDP, тестирование на testnet |
| 9–10 | Code4rena security review |
| 11–12 | Исправление issues, публикация кода (MIT), mainnet deployment |
| 13 | Документация, npm/GitHub release, отчёт Chainlink |

---

## 8. Team

**Dmitry Nagornykh** — sole developer (solo)
- GitHub: https://github.com/nagor2
- 5+ лет production TypeScript/Node.js опыта
- Smart contracts: Solidity 0.8.x, Hardhat, OpenZeppelin — production mainnet deployment
- DotFlat deployed и работает на Ethereum mainnet
- Академический background в ML и математике (NSU)

---

## 9. Success Metrics

По завершении гранта:
- [ ] ≥3 новых commodity price feeds, совместимых с Chainlink AggregatorV3
- [ ] Код опубликован на GitHub (MIT license)
- [ ] npm пакет для удобного переиспользования
- [ ] Deployment на Ethereum mainnet
- [ ] Security audit report опубликован публично
- [ ] Documentation + integration guide

---

## 10. Why Chainlink Should Fund This

1. **Расширяет coverage** — новые feeds которых нет в экосистеме
2. **Production-proven** — DotFlat уже на mainnet, не sandbox проект
3. **Open source** — весь код MIT, любой протокол берёт и использует
4. **Enables new market segment** — commodity-backed stablecoins = новая категория
5. **Solo developer с track record** — нет раздутой команды, каждый доллар в код

---

## Приложения

- Смарт-контракты: https://github.com/nagor2/cryptoFiat
- Frontend: https://github.com/nagor2/fiatApp
- Работающее приложение: https://beta.app.dotflat.io
- Oracle архитектура: `docs/ORACLE-ARCHITECTURE.md`
- Oracle README: `docs/ORACLE-README.md`

---

*Создан: 2026-05-11*  
*Статус: Черновик для ревью*
