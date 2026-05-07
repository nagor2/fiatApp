const path = require('path');
const cacheService = require('./cacheService');
const appConfig = require('../config/config');
const logger = require('../utils/logger');
const { connectWithFallback } = require('../utils/rpcProvider');

const ABI_DIR = path.join(__dirname, '../config/abi');

class ContractService {
  constructor() {
    this.web3 = null;
    this.contracts = {};
  }

  async init() {
    const daoAbi = require(path.join(ABI_DIR, 'dao.json'));

    // Try each RPC URL until one can successfully call the DAO contract.
    this.web3 = await connectWithFallback(async (web3) => {
      const dao = new web3.eth.Contract(daoAbi, appConfig.daoAddress);
      await dao.methods.addresses('rule').call(); // connectivity probe
    });

    const daoContract = new this.web3.eth.Contract(daoAbi, appConfig.daoAddress);
    this.contracts.dao = daoContract;
    logger.info(`DAO contract initialized at ${appConfig.daoAddress}`);

    await this.loadDynamicContracts();
  }

  async loadDynamicContracts() {
    for (const name of appConfig.contracts) {
      try {
        const address = await this.contracts.dao.methods.addresses(name).call();
        const abi     = require(path.join(ABI_DIR, `${name}.json`));
        this.contracts[name] = new this.web3.eth.Contract(abi, address);
        logger.info(`Contract ${name} initialized at ${address}`);
      } catch (error) {
        logger.error(`Failed to initialize contract ${name}:`, error);
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
