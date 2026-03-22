# Contract ABIs

Скопируйте ABI контрактов из `../../src/utils/config.js` в эти файлы.

## Список ABI для копирования

Откройте `src/utils/config.js` и найдите:

| Имя в backend | Имя в config.js | Строка |
|---------------|-----------------|--------|
| `dao.json` | `config.daoABI` | ~9 |
| `rule.json` | `config.ruleABI` | ~351 |
| `cdp.json` | `config.cdpABI` | ~1211 |
| `auction.json` | `config.auctionABI` | ~2435 |
| `flatCoin.json` | `config.stableCoinABI` | ищите в config.js |
| `deposit.json` | `config.depositABI` | ищите в config.js |
| `basket.json` | `config.cartABI` | ищите в config.js |
| `oracle.json` | `config.oracleABI` | ищите в config.js |

## Как копировать

1. Откройте `src/utils/config.js`
2. Найдите нужный ABI (например `config.daoABI = [...]`)
3. Скопируйте массив `[...]`
4. Вставьте в соответствующий файл в этой папке

Пример:
```javascript
// Найдите в config.js:
config.daoABI = [
  { ... },
  { ... },
  ...
];

// Скопируйте массив в dao.json:
[
  { ... },
  { ... },
  ...
]
```

## Важно

- Backend автоматически получает адреса контрактов из DAO
- Нужно скопировать только ABI, адреса не требуются
- Файлы должны содержать валидный JSON (массив объектов)
