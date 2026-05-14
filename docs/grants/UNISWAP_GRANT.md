# Uniswap Foundation Grant Application — DotFlat

**Грант:** Uniswap Foundation Grants Program  
**Сайт:** https://www.uniswapfoundation.org/grants  
**Размер:** $25,000 – $250,000 (реалистично $30,000–$75,000)  
**Статус:** Черновик  
**Приоритет:** 🔴 Первый

---

## Почему Uniswap Foundation — сильный fit

DotFlat уже интегрировал **Uniswap V4 SDK** и создаёт DFC/ETH liquidity pool.
DFC — первый **commodity-indexed** trading pair на Uniswap V4: не USD-pegged, а привязан
к корзине реальных товаров (Gold, Lumber и др.). Параллельно разработан **oracle с 34
commodity feeds на Ethereum mainnet** — инфраструктура, которая открывает новый класс
RWA пар для всей Uniswap экосистемы.

---

## 1. Project Overview

**Project Name:** DotFlat — Commodity-Indexed Stablecoin and Oracle Infrastructure on Uniswap V4  
**Website:** https://dotflat.io / https://beta.app.dotflat.io  
**GitHub:** https://github.com/nagor2/fiatApp · https://github.com/nagor2/cryptoFiat  
**Contact:** nagor@academ.org  

**One-line pitch:**
> "DotFlat brings the first commodity-indexed stablecoin trading pair to Uniswap V4,
> backed by an on-chain oracle with 34 real-world commodity feeds — enabling a new
> class of RWA liquidity that doesn't exist on Uniswap today."

---

## 2. The Opportunity: RWA Pairs on Uniswap V4

RWA perpetuals grew 346% YoY — RWAs now represent 44% of Hyperliquid's volume.
The same demand exists for spot and LP: traders want commodity exposure on-chain
without centralized counterparty risk.

Uniswap today is dominated by USD-pegged stablecoins (USDC, DAI, USDT). There are
no commodity-indexed pairs. DotFlat changes this:

- **DFC (flatCoin)** — CDP stablecoin backed by a basket of commodities (Gold, Lumber)
- **DFC/ETH pool on Uniswap V4** — first commodity-indexed trading pair on the exchange
- **Oracle with 34 commodity feeds** — infrastructure any Uniswap project can use to
  launch RWA pairs: Gold, Silver, Oil, Copper, Wheat, Corn, Soybeans, Lumber, and 26 more

---

## 3. What's Already Built (Production on Mainnet)

### Deployed Contracts (Ethereum Mainnet)

| Contract | Address |
|---|---|
| CDP | [0xbCf58DE37791eFe60fE87a6d420FE8F7AEA99ef8](https://etherscan.io/address/0xbCf58DE37791eFe60fE87a6d420FE8F7AEA99ef8) |
| flatCoin DFC | [0x1F709Cfa0C409E158C68EdcD32453809c9Eb69EE](https://etherscan.io/address/0x1F709Cfa0C409E158C68EdcD32453809c9Eb69EE) |
| ExchangeRate (oracle, 34 feeds) | [0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B](https://etherscan.io/address/0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B) |
| INTDAO (governance) | [0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122](https://etherscan.io/address/0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122) |
| Auction (Commit-Reveal MEV protection) | [0xBdFb52d4C9fBdE41805abBb206465aca3b3499D6](https://etherscan.io/address/0xBdFb52d4C9fBdE41805abBb206465aca3b3499D6) |
| RLE token | [0x3Dfa45997ddB7980Eb4D73CBfCf0E024F05b08a3](https://etherscan.io/address/0x3Dfa45997ddB7980Eb4D73CBfCf0E024F05b08a3) |

### Frontend & Integration

- React 19, Redux, ethers.js v6, **Uniswap V4 SDK** (already integrated)
- DFC/ETH pool on Uniswap V4 — live
- Oracle node: real-time futures → on-chain, 34 instruments, running since 2025

---

## 4. Grant Deliverables

### Deliverable A: DFC/ETH V4 Pool — New Asset Class on Uniswap

**What it gives Uniswap:**
- First commodity-indexed trading pair — diversifies pair landscape beyond USD stablecoins
- New user segment: inflation hedgers, commodity traders, RWA-native users
- Real liquidity from a live protocol with working CDP mechanism

**Grant scope:**
1. Formal DFC/ETH V4 pool with concentrated liquidity + initial liquidity provision
2. **Custom V4 hook** — TWAP-based price protection for commodity pairs:
   - Prevents price manipulation during CDP liquidations
   - Handles non-crypto collateral volatility patterns
   - Reusable by any non-USD stablecoin on Uniswap V4
3. **Reference implementation** — documented guide: how to integrate a commodity-indexed
   asset with Uniswap V4 SDK (non-USD pegged stablecoins)

### Deliverable B: Oracle Infrastructure — 34 Commodity Feeds for Uniswap Ecosystem

**What it gives Uniswap:**
Any project building RWA pairs on Uniswap can use these feeds without building
their own oracle. 34 instruments: energy, metals, agriculture, livestock, soft
commodities — real-time futures data, on-chain since 2025.

**Grant scope:**
1. Open-source oracle node — standalone repo, Docker image, full documentation
2. Multi-source data layer (Tiingo, Alpha Vantage, Polygon.io) — outlier filtering
3. Permissionless architecture for independent operator onboarding
4. **The Graph subgraph** — DFC pool analytics + oracle feed monitoring

---

## 5. Grant Budget Request

**Запрашиваемая сумма: $40,000 – $65,000**

| Статья | Сумма | Описание |
|---|---|---|
| DFC/ETH V4 pool: initial liquidity | $15,000 | Concentrated liquidity для DFC/ETH пула на Uniswap V4 |
| V4 hook development | $12,000 | Commodity-pair hook (TWAP защита, non-crypto volatility handling) |
| Reference documentation | $8,000 | Technical guide: commodity-indexed asset on Uniswap V4 |
| Oracle: open-source release | $8,000 | Standalone repo, Docker, docs, operator guide |
| Oracle: multi-source data layer | $7,000 | Tiingo/Alpha Vantage/Polygon.io adapters, outlier filtering |
| The Graph subgraph | $5,000 | DFC pool + oracle analytics |
| **Итого** | **$55,000** | |

---

## 6. Timeline

| Неделя | Milestone |
|---|---|
| 1–2 | DFC/ETH V4 pool запуск с initial liquidity |
| 3–5 | V4 hook разработка и тестирование |
| 6–7 | Oracle: open-source release, Docker, документация |
| 8–9 | Oracle: multi-source data adapters |
| 10–11 | The Graph subgraph для DFC пула + oracle feeds |
| 12 | Reference documentation: commodity-indexed asset on Uniswap V4 |
| 13 | Финальный отчёт, публикация всех репо |

---

## 7. Team

**Dmitry Nagornykh** — sole developer (nagor@academ.org · github.com/nagor2)
- Uniswap V4 SDK уже интегрирован в production (fiatApp)
- 34 commodity feeds oracle работает на mainnet с 2025 года
- Все смарт-контракты DotFlat задеплоены и верифицированы на Ethereum mainnet
- 5+ лет Node.js/TypeScript, React 19, ethers.js v6, Solidity
- Senior Lecturer, Novosibirsk State University

---

## 8. Success Metrics

По завершении гранта:
- [ ] DFC/ETH пул активен на Uniswap V4 (mainnet) с initial liquidity
- [ ] V4 hook задеплоен, задокументирован, открыт для форков
- [ ] Reference guide: "Commodity-indexed asset on Uniswap V4" опубликован
- [ ] Oracle open-source: GitHub repo, Docker Hub
- [ ] The Graph subgraph для DFC пула
- [ ] ≥3 других проекта используют oracle feeds (цель через 3 мес после релиза)

---

## 9. Why Uniswap Foundation Should Fund This

1. **Новый класс активов** — commodity-indexed пары, которых нет на Uniswap сегодня
2. **V4 reference implementation** — reusable hook и документация для non-USD stablecoins
3. **Oracle инфраструктура** — 34 commodity feeds открывают RWA пары для всей экосистемы
4. **Production-proven** — контракты на mainnet, Uniswap V4 SDK уже интегрирован
5. **Solo developer с track record** — высокий execution rate, минимум overhead

---

## Приложения

- Frontend (Uniswap V4 интеграция): https://github.com/nagor2/fiatApp
- Контракты: https://github.com/nagor2/cryptoFiat
- Приложение: https://beta.app.dotflat.io
- Oracle (ExchangeRate): https://etherscan.io/address/0x1DF609afDC67396a9f307de2BA3E3b667dEe8b5B

---

*Обновлён: 2026-05-11*  
*Статус: Готов к подаче*
