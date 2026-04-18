# DotFlat Frontend Documentation

Документация по разработке и развертыванию DotFlat Frontend приложения.

## Содержание

### Разработка и Развертывание

- **[CHEATSHEET](../CHEATSHEET.md)** - Шпаргалка с командами ⚡⚡⚡
  - Быстрые команды для всех режимов
  - Выбор режима одной строкой
  - Troubleshooting одной командой

- **[Quick Start Guide](QUICK-START.md)** - Быстрый старт для разработчиков ⚡
  - Выбор режима разработки (dev-local / dev / prod)
  - Workflow для ежедневной работы
  - Сравнение режимов
  - FAQ и troubleshooting

- **[Modes Comparison](MODES-COMPARISON.md)** - Детальное сравнение режимов
  - Таблица параметров каждого режима
  - Performance метрики
  - Когда использовать каждый режим

- **[Docker Setup Guide](README-DOCKER.md)** - Полное руководство по работе с Docker
  - Development режимы с hot reload
  - Production режим с nginx
  - Troubleshooting и best practices
  - Работа с локальным блокчейном
  - CI/CD интеграция

### Конфигурация

- **Environment Variables** - см. `.env.example` в корне проекта
- **Smart Contracts** - конфигурация в `src/utils/config.js`
- **Nginx Configuration** - `nginx.conf` в корне проекта
- **CI/CD Pipeline** - `.gitlab-ci.yml` в корне проекта

## Quick Links

- [Основной README](../README.md) - обзор проекта и quick start
- [Docker Compose](../docker-compose.yml) - конфигурация локального окружения
- [GitLab CI/CD](../.gitlab-ci.yml) - автоматический deployment

## Структура Проекта

```
app-dotflat/
├── docs/                      # 📚 Документация
│   ├── README.md             # Этот файл (индекс документации)
│   └── README-DOCKER.md      # Docker setup guide
│
├── src/                       # ⚛️ React приложение
│   ├── components/           # React компоненты
│   └── utils/
│       └── config.js         # Web3 и smart contracts конфигурация
│
├── public/                    # 🌐 Статические ресурсы
├── build/                     # 📦 Production build (генерируется)
│
├── docker-compose.yml         # 🐳 Docker Compose конфигурация
├── Dockerfile                 # 🐳 Production Docker образ
├── nginx.conf                 # 🌐 Nginx конфигурация для production
├── .gitlab-ci.yml            # 🚀 CI/CD pipeline
│
├── package.json              # 📦 NPM зависимости
└── README.md                 # 📖 Основная документация
```

## Технологии

### Frontend
- React 19.0.1
- Redux 9.2.0
- Web3 4.16.0
- Testing Library

### Build & Deploy
- Node.js 20 Alpine
- Nginx Alpine
- Docker & Docker Compose
- GitLab CI/CD
- Kaniko (containerless builds)
- Kubernetes (K3s)

### Blockchain
- Ethereum compatible network
- Smart Contracts: DAO, CDP, Auction, Deposit, Oracle
- Web3 provider: PublicNode (публичный CORS-совместимый RPC), с fallback на LlamaRPC

## Environments

| Environment | Branch   | URL | Kubernetes Namespace |
|-------------|----------|-----|---------------------|
| Development | develop  | TBD | app-dotflat         |
| Production  | master   | TBD | app-dotflat         |

## Getting Help

Если нужна помощь:
1. Проверьте [Docker Setup Guide](README-DOCKER.md) - там есть раздел Troubleshooting
2. Посмотрите логи контейнера: `docker compose logs -f`
3. Проверьте актуальность зависимостей: `npm outdated`

## Roadmap Документации

Планируется добавить:
- [ ] API документация (если будет backend)
- [ ] Гайд по архитектуре приложения
- [ ] Руководство по работе со Smart Contracts
- [ ] Testing guide
- [ ] Performance optimization guide
- [ ] Security best practices
