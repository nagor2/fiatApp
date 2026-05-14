# Block-Watcher: Product-Market Fit & Commercial Analysis

*Создан: 2026-05-11*

---

## TL;DR

Block-watcher — это **легковесный on-premise indexer + cache invalidator** для DeFi
фронтендов. Один Docker-контейнер даёт: автоматическую инвалидацию Redis при
транзакциях, REST API с историей событий и транзакций по контрактам, и monitoring
dashboard. Никаких GraphQL схем, никакого PostgreSQL, никакого вендор lock-in.

Целевая аудитория — enterprise DApps с высоким трафиком и большими счётами RPC-провайдеров.

---

## Главный инсайт: event-driven vs time-based caching

Это не просто "экономия на RPC". Это смена модели кэширования.

**Без block-watcher — компромисс между свежестью и стоимостью:**

```
TTL 60s → данные устаревают до минуты, пользователь видит старое
TTL 5s  → данные свежее → RPC bills взрываются
```

Разработчик вынужден выбирать: либо платить больше, либо показывать устаревшие данные.

**С block-watcher — компромисса не существует:**

```
TTL = год (или вообще без TTL)
Инвалидация происходит ТОЛЬКО когда контракт реально изменился
→ данные всегда актуальны
→ RPC вызов происходит ровно один раз при каждом изменении
→ ноль лишних запросов
```

Точная формулировка ценности:

> Block-watcher заменяет **time-based caching** на **event-driven caching**.
> Данные не "свежие с задержкой до N секунд" — они актуальны ровно с момента
> следующего блока после транзакции (~12 сек на Ethereum).
> При этом RPC вызов происходит ровно один раз на каждое реальное изменение состояния контракта.

**Экономия пересчитывается:**

| Сценарий | RPC calls/день | Стоимость |
|---|---|---|
| Polling TTL 30s, 10 контрактов | ~28,800 | ~$1,300/мес |
| Polling TTL 5s, 10 контрактов | ~172,800 | ~$7,800/мес |
| Block-watcher, 10 контрактов, 100 tx/день | ~100 | **~$0.15/мес** |

При малоактивных контрактах экономия ещё больше — кэш не инвалидируется вообще.

---

## Что на самом деле делает block-watcher

Важно: это не просто "инвалидатор кэша". Функциональность значительно шире:

- **Redis cache invalidation** — при транзакции на отслеживаемом контракте → DEL ключи
- **Event indexing** — декодирует и хранит события контрактов с параметрами
- **Transaction indexing** — хранит raw транзакции с газом, статусом, адресами
- **REST API** — `/api/events/:address`, `/api/transactions/:address`, `/api/contracts`
- **Health endpoint** — `/health` с uptime, блоками, прогрессом синхронизации
- **Historical sync** — синхронизирует историю с заданного блока при старте
- **Monitoring dashboard** — встроенная страница в DotFlat для просмотра состояния

Это делает block-watcher **легковесной альтернативой The Graph** для команд,
которым не нужен GraphQL и PostgreSQL, но нужен простой доступ к on-chain данным.

---

## Детальный анализ альтернатив

### Категория 1: Webhook / Notification сервисы
*"Мы уведомим тебя — дальше сам"*

| Инструмент | Цена | Что делает | Критический gap |
|---|---|---|---|
| **Alchemy Notify** | $49–$499/мес | Webhook при событии на контракте | Уведомление ≠ invalidation. После webhook ты всё равно делаешь `eth_call` и платишь CU |
| **QuickNode Streams** | $9–$299/мес + data | Стримит данные блока в webhook/S3/Kafka | Нет Redis-интеграции. Нужно самому строить cache layer поверх стрима |
| **Moralis Streams** | $0–$500/мес | Стримит on-chain события в webhook | Аналогично: webhook → ты пишешь invalidation логику сам |
| **Infura WebSocket** | По CU | WebSocket подписка на события | Только транспорт. Никакой cache логики |

**Вывод по категории:** Все они решают задачу *оповещения*, но не *cache invalidation*.
После получения webhook ты всё равно идёшь в RPC за актуальными данными.
Проблема стоимости RPC не решена.

---

### Категория 0: RPC Proxy кэши
*"Сделаем каждый RPC вызов дешевле"*

| Проект | Stars | Что делает | Gap |
|---|---|---|---|
| **eRPC** | 707 ⭐ (активный) | Fault-tolerant RPC proxy, кэширует ответы на уровне вызовов, re-org aware | Кэш time/finality-based. Не знает о твоих контрактах, не инвалидирует твой Redis |
| **llamanodes/web3-proxy** | 161 ⭐ | Load-balancing + caching RPC proxy на Rust | Аналогично: proxy-level, не application-level |
| **shalzz/ethereum-worker** | 37 ⭐ | Cloudflare Worker как CDN-кэш для Ethereum ноды | CDN-уровень, time-based TTL |
| **dawsbot/catch** | 6 ⭐ (заброшен) | Кэширует только иммутабельные функции контрактов | Только для данных которые никогда не меняются |

**Критический gap:** Все они кэшируют на уровне RPC вызовов — делают каждый вызов дешевле.
Но не устраняют сами вызовы. Не знают о твоих Redis ключах. Не делают event-driven invalidation.

**Важно: eRPC и block-watcher — не конкуренты, они на разных слоях:**

```
Frontend → Backend → Redis ← block-watcher следит здесь
                  ↓ (cache miss)
              eRPC proxy ← кэширует RPC ответы здесь
                  ↓ (proxy miss)
              Alchemy / Infura
```

eRPC делает каждый RPC вызов дешевле.
Block-watcher делает так, чтобы лишних RPC вызовов не было вообще.
Можно использовать оба одновременно.

---

### Категория 1б: Open Source event watchers
*Ближайшие аналоги — из ROADMAP.md*

| Проект | Язык | Stars | Gap |
|---|---|---|---|
| **Eventeum** | Java | 507 | Webhook/Kafka output — нет Redis; фактически заброшен с 2020 |
| **HydroProtocol/ethereum-watcher** | Go | 197 | Скелет плагинов — Redis нужно добавлять вручную |
| **Neufund/smart-contract-watch** | JS | 328 | Только terminal/Graylog — нет cache layer вообще |
| **Ponder** | TS | 1081 | Full indexer с PostgreSQL — тяжелее, меняет архитектуру |

Ни один не делает всё вместе: WebSocket → contract filter → Redis invalidation + event storage + REST API.

---

### Категория 2: Full Blockchain Indexers
*"Переиндексируй всё в PostgreSQL, запрашивай через GraphQL"*

| Инструмент | Цена | Что делает | Критический gap |
|---|---|---|---|
| **The Graph** | Бесплатно / $$/мес за dedicated | Subgraph: on-chain события → PostgreSQL → GraphQL API | Overkill. Нужно писать subgraph (1–2 недели), менять архитектуру запросов на GraphQL, нет Redis |
| **Ponder** | Self-hosted, бесплатно | TypeScript indexer → PostgreSQL → REST/GraphQL | Аналогично: полная переработка data layer. Нет Redis |
| **Envio** | Freemium | Быстрый TypeScript indexer | Те же требования: PostgreSQL, смена архитектуры |
| **Goldsky** | $500–$5,000/мес | Managed subgraphs + streaming pipelines | Enterprise-grade, но тяжёлый и дорогой |
| **Subquery** | Freemium | Multi-chain indexer | Полный indexer, не cache invalidation |

**Вывод по категории:** Indexer-ы — молоток там, где нужна отвёртка. Они меняют
архитектуру всего приложения. Требуют: миграция на GraphQL, написание схем данных,
поддержка отдельной инфраструктуры. Для задачи "инвалидируй Redis когда изменился
контракт" это в 10 раз больше работы, чем нужно.

---

### Категория 3: DIY
*"Напишу сам на ethers.js"*

```javascript
provider.on('block', async (blockNumber) => {
  const block = await provider.getBlock(blockNumber, true);
  const relevant = block.transactions.filter(tx =>
    CONTRACTS.includes(tx.to?.toLowerCase())
  );
  if (relevant.length > 0) {
    await redis.del('myapp:*');
  }
});
```

Это именно то, что делает block-watcher. Каждый senior разработчик пишет это
самостоятельно. **Проблема:** каждый делает это с нуля, без:
- Circuit breaker при недоступности RPC
- Graceful reconnect WebSocket
- Health endpoint для мониторинга
- Configurable key patterns (не просто `*`)
- Production-hardened error handling
- Docker-ready конфигурация

**Вывод:** DIY — главный конкурент. Но это значит, что рынок **уже понимает проблему**
и платит за решение временем разработчика ($150–300/час senior). Block-watcher
экономит 2–5 дней работы при первой интеграции и исключает maintenance burden.

---

## Product-Market Fit

### Кто страдает от этой проблемы прямо сейчас

**Enterprise DApps с высоким трафиком:**
- Uniswap frontend — сотни тысяч пользователей, десятки контрактов
- Aave dashboard — real-time позиции, liquidation thresholds
- Compound, Curve — постоянные state updates
- Любой DeFi aggregator (1inch, Paraswap)

**Реальная стоимость проблемы:**

| Сценарий | RPC calls/день | Стоимость (Alchemy Growth) |
|---|---|---|
| 10 контрактов, polling 30s | ~28,800 | ~$43/день = **$1,300/мес** |
| 20 контрактов, polling 15s | ~115,200 | ~$172/день = **$5,200/мес** |
| С block-watcher (TTL 60s) | ~50–100 | **~$0.15/мес** |

**Экономия для enterprise DApp: $1,000–$10,000/мес.**

### Почему покупают именно сейчас

1. **RPC провайдеры подняли цены** — Alchemy, Infura, QuickNode все перешли на
   compute unit модель. Раньше было "unlimited" на фиксированной цене.
2. **Рост on-chain активности** — больше блоков, больше контрактов, больше polling.
3. **DApps масштабируются** — то, что работало на 1,000 пользователей, ломается на 100,000.

### Готовность платить

Если block-watcher экономит $5,000/мес на RPC — компания заплатит $500–1,000/мес
за managed решение без раздумий. ROI очевиден и измеряется за первый месяц.

---

## Коммерческий потенциал

### Вариант A: Open Source (текущий план)
- Плюсы: adoption, community, EF грант ($15–25k)
- Минусы: нет revenue, нет defensibility

### Вариант B: Коммерческий SaaS — "Block-Watcher Cloud"

**Как это работает:**
- Клиент регистрируется, указывает адреса контрактов + свой Redis URL
- Мы держим WebSocket-подключения к Ethereum нодам
- При транзакции → инвалидируем Redis клиента через его connection string
- Клиент ничего не меняет в своём приложении

**Pricing (примерный):**

| План | Цена/мес | Контракты | Сети |
|---|---|---|---|
| Starter | $29 | до 5 | Ethereum mainnet |
| Growth | $99 | до 20 | Ethereum + L2 |
| Enterprise | $499+ | Unlimited | All networks + SLA |

**Unit economics:**
- Инфраструктура: 1 WebSocket node = ~$50/мес VPS, обслуживает 100+ клиентов
- Margin при $29 starter: ~80%+
- Target MRR через 12 мес: $10,000–50,000

### Вариант C: Open Core (рекомендация)

- **Core:** open source, MIT, Docker Hub, EF грант
- **Cloud:** managed SaaS с простой регистрацией
- **Enterprise:** on-prem support, SLA, white-label

Модель как у Redis Labs, PlanetScale, Supabase. Open source создаёт adoption и доверие,
cloud монетизирует convenience.

---

## Open Source → Cloud: как это работает на практике

### Что даёт open source публикация

1. **Discovery через GitHub** — разработчик гуглит "ethereum redis cache invalidation",
   находит репо, смотрит код 5 минут, делает `docker pull`. Закрытый код так не работает.
2. **Доверие** — код можно аудировать, видно что инструмент делает ровно то что нужно
3. **Попадание в экосистему** — awesome-ethereum листы, Ethereum dev дайджесты, форумы
4. **Социальное доказательство** — каждый star/fork виден следующему разработчику
5. **Grant eligibility** — EF требует MIT license

"Скопируют?" — да, но копируют код, не managed сервис. Redis открыт 15 лет, Redis Cloud
зарабатывает миллиарды. Nginx открытый, Cloudflare зарабатывает миллиарды.

### Что такое cloud waitlist

Простая форма: "Хочешь hosted версию без DevOps — оставь email". Не строишь ничего заранее.

Зачем:
- Проверяешь спрос до того как потратил время на SaaS инфраструктуру
- На день запуска уже есть список тёплых лидов
- Если за 2 месяца 0 signup — cloud не нужен

**Важно:** waitlist работает только если open source репо получает реальный трафик.
Без звёзд на GitHub — форма пустая. Порядок: сначала adoption, потом конвертация в cloud.

### Воронка

```
GitHub Discovery (stars, search)
        ↓
Self-hosted Docker (бесплатно, open source)
        ↓
"Не хочу поддерживать инфраструктуру" → Cloud waitlist → платный план
        ↓
Enterprise (SLA, поддержка, on-prem лицензия)
```

---

## Рекомендация

**Block-watcher — жизнеспособный коммерческий продукт**, а не просто grant material.

Правильная последовательность:
1. **Сейчас:** подать EF грант (валидация + финансирование open source release)
2. **После релиза:** запустить Cloud waitlist, собрать первых enterprise пользователей
3. **При первых $1k MRR:** принять решение open core vs full commercial

Главный риск — adoption. Нужно попасть в руки 2–3 крупных DApps чтобы получить
публичный кейс "мы сэкономили $X на RPC". Это становится главным маркетингом.

---

## Сравнение с конкурентами (итог)

| | Block-Watcher | Alchemy Notify | The Graph | DIY |
|---|---|---|---|---|
| Решает RPC cost | **✅ Полностью** | ❌ Нет | ⚠️ Частично | ✅ Да |
| Время интеграции | **5 минут** | 1–2 часа | 1–2 недели | 2–5 дней |
| Меняет архитектуру | **❌ Нет** | ❌ Нет | ✅ Да (GraphQL) | ❌ Нет |
| Redis out-of-the-box | **✅ Да** | ❌ Нет | ❌ Нет | ✅ (сам пишешь) |
| Production-hardened | **✅ Да** | ✅ Да | ✅ Да | ❌ Обычно нет |
| Цена | **$0–$499/мес** | $49–$499/мес | $0–$5000/мес | $0 + dev time |
