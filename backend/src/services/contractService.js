const Web3 = require('web3');
const cacheService = require('./cacheService');
const contractsConfig = require('../config/contracts');
const logger = require('../utils/logger');

class ContractService {
  constructor() {
    this.web3 = null;
    this.contracts = {};
  }

  async init() {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error('RPC_URL not configured');
    }

    this.web3 = new Web3(rpcUrl);
    logger.info(`Connected to Ethereum RPC: ${rpcUrl}`);

    try {
      // Инициализируем DAO контракт
      const daoAbi = require('../config/abi/dao.json');
      this.contracts.dao = new this.web3.eth.Contract(daoAbi, contractsConfig.dao.address);
      logger.info(`DAO contract initialized at ${contractsConfig.dao.address}`);

      // Загружаем остальные контракты динамически из DAO
      await this.loadDynamicContracts();
      
    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  async loadDynamicContracts() {
    for (const contractConfig of contractsConfig.dynamicContracts) {
      try {
        // Получаем адрес из DAO
        const address = await this.contracts.dao.methods.addresses(contractConfig.name).call();
        
        // Загружаем ABI
        const abi = require(`../${contractConfig.abiPath}`);
        
        // Создаем contract instance
        this.contracts[contractConfig.name] = new this.web3.eth.Contract(abi, address);
        
        logger.info(`Contract ${contractConfig.name} initialized at ${address}`);
      } catch (error) {
        logger.error(`Failed to initialize contract ${contractConfig.name}:`, error);
      }
    }
  }

  async callMethod(contractName, methodName, args = [], options = {}) {
    const contract = this.contracts[contractName];
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }

    const cacheKey = cacheService.generateKey(contractName, methodName, ...args);
    const cacheTTL = options.cacheTTL || parseInt(process.env.CACHE_TTL || '60', 10);

    // Проверяем кэш
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Вызываем метод контракта
    try {
      const result = await contract.methods[methodName](...args).call();
      
      // Сохраняем в кэш
      await cacheService.set(cacheKey, result, cacheTTL);
      
      return result;
    } catch (error) {
      logger.error(`Contract call error (${contractName}.${methodName}):`, error);
      throw error;
    }
  }

  async getBalance(address) {
    const cacheKey = `eth:balance:${address}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const balance = await this.web3.eth.getBalance(address);
    await cacheService.set(cacheKey, balance);
    
    return balance;
  }

  // CDP специфичные методы
  async getCDPState() {
    const cdpAddress = this.contracts.cdp._address;
    const auctionAddress = this.contracts.auction._address;

    const [
      stubFund,
      totalSupply,
      stabilizationFundPercent,
      ruleBalance,
      allowanceToAuction,
      ethBalance,
      numPositions,
      collateralDiscount,
      interestRate,
    ] = await Promise.all([
      this.callMethod('flatCoin', 'balanceOf', [cdpAddress]),
      this.callMethod('flatCoin', 'totalSupply'),
      this.callMethod('dao', 'params', ['stabilizationFundPercent']),
      this.callMethod('rule', 'balanceOf', [cdpAddress]),
      this.callMethod('flatCoin', 'allowance', [cdpAddress, auctionAddress]),
      this.getBalance(cdpAddress),
      this.callMethod('cdp', 'numPositions'),
      this.callMethod('dao', 'params', ['collateralDiscount']),
      this.callMethod('dao', 'params', ['interestRate']),
    ]);

    const stubFundFormatted = parseFloat(stubFund) / 1e18;
    const totalSupplyFormatted = parseFloat(totalSupply) / 1e18;
    const coinsExceed = stubFundFormatted - (totalSupplyFormatted * parseFloat(stabilizationFundPercent) / 100);

    return {
      stubFund: stubFundFormatted.toFixed(8),
      stubFundExceed: coinsExceed.toFixed(2),
      totalSupply: totalSupplyFormatted.toFixed(4),
      ruleBalance: (parseFloat(ruleBalance) / 1e18).toFixed(2),
      allowanceToAuction: (parseFloat(allowanceToAuction) / 1e18).toFixed(2),
      ethBalance: (parseFloat(ethBalance) / 1e18).toFixed(2),
      numPositions: parseFloat(numPositions),
      collateralDiscount: `${parseFloat(collateralDiscount)}%`,
      interestRate: `${parseFloat(interestRate)}%`,
      address: cdpAddress,
    };
  }

  // Basket данные
  async getBasketState() {
    const itemsCount = await this.callMethod('basket', 'itemsCount');
    const items = [];

    for (let i = 1; i <= itemsCount; i++) {
      const item = await this.callMethod('basket', 'items', [i]);
      const price = await this.callMethod('basket', 'getPrice', [item.symbol]);
      
      items.push({
        symbol: item.symbol,
        initialPrice: (parseFloat(item.initialPrice) / 1e6).toFixed(5),
        currentPrice: (parseFloat(price) / 1e6).toFixed(5),
      });
    }

    return { itemsCount: parseInt(itemsCount), items };
  }

  // DAO данные
  async getDAOState() {
    const daoAddress = this.contracts.dao._address;

    const [
      activeVoting,
      totalPooled,
    ] = await Promise.all([
      this.callMethod('dao', 'activeVoting'),
      this.callMethod('rule', 'balanceOf', [daoAddress]),
    ]);

    return {
      activeVoting,
      totalPooled: (parseFloat(totalPooled) / 1e18).toFixed(2),
      address: daoAddress,
    };
  }

  async invalidateContract(contractName) {
    const pattern = `contract:${contractName}:*`;
    await cacheService.invalidatePattern(pattern);
    logger.info(`Invalidated cache for contract: ${contractName}`);
  }
}

module.exports = new ContractService();
