// Конфигурация контрактов DotFlat
// Адреса остальных контрактов загружаются динамически из DAO

module.exports = {
  // DAO - единственный контракт с известным адресом
  dao: {
    address: process.env.DAO_ADDRESS || '0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122',
    abiPath: './abi/dao.json',
  },
  
  // Остальные контракты загружаются через dao.methods.addresses('name')
  dynamicContracts: [
    { name: 'rule', abiPath: './abi/rule.json' },
    { name: 'flatCoin', abiPath: './abi/flatCoin.json', abiKey: 'stableCoinABI' },
    { name: 'cdp', abiPath: './abi/cdp.json' },
    { name: 'oracle', abiPath: './abi/oracle.json', abiKey: 'oracleABI' },
    { name: 'deposit', abiPath: './abi/deposit.json', abiKey: 'depositABI' },
    { name: 'basket', abiPath: './abi/basket.json', abiKey: 'cartABI' },
    { name: 'auction', abiPath: './abi/auction.json' },
  ],
};
