const { Web3 } = require('web3');
const redis = require('redis');
const WebSocket = require('ws');
const winston = require('winston');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const HealthServer = require('./health-server');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class BlockWatcher {
  constructor() {
    this.rpcWsUrl = process.env.RPC_WS_URL;
    this.rpcHttpUrl = (process.env.RPC_HTTP_URL || '').split(',')[0].trim();
    // Дефолт — FQDN Redis'а проекта DotFlat в k8s-неймспейсе `dotflat`.
    // Переопределяется через env REDIS_URL (в k8s задаётся секретом watcher-env).
    this.redisUrl = process.env.REDIS_URL || 'redis://redis.app-dotflat.svc.cluster.local:6379';
    // Максимальное время ожидания готовности Redis перед fail-fast (мс).
    // Если Redis не поднимается за это время — контейнер падает, kubelet рестартит.
    this.redisReadyTimeoutMs = parseInt(process.env.REDIS_READY_TIMEOUT_MS || '60000', 10);
    this.healthPort = process.env.HEALTH_BROADCAST_PORT || 3002;
    this.startBlock = parseInt(process.env.START_BLOCK || '0');
    this.etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    this.etherscanApiUrl = process.env.ETHERSCAN_API_URL || 'https://api.etherscan.io/v2/api';
    
    this.watchedAddresses = new Map(); // address -> info
    this.contracts = new Map(); // contractKey -> Web3 Contract instance
    this.contractEvents = {}; // contractKey -> [eventNames]
    this.health = {
      status: 'initializing',
      lastNetworkBlock: null,
      lastNetworkBlockTime: null,
      lastRelevantBlock: null,
      lastRelevantBlockTime: null,
      lastProcessedBlock: null,
      watchedAddressesCount: 0,
      transactionsIndexed: 0,
      eventsIndexed: 0,
      historicalSyncProgress: null,
      uptime: 0,
      startTime: Date.now()
    };
    
    this.web3 = null;
    this.redisClient = null;
    this.subscription = null;
    this.wss = null;
    this.healthServer = null;
    this.blockTimestampCache = new Map();
    this.pollingInterval = null;   // HTTP polling timer — stored so watchdog can clear it
    this.watchdogInterval = null;
    this._lastBlockReceivedAt = null; // wall-clock ms, updated on every new block
    this._restarting = false;         // guard against concurrent restarts
  }
  
  async init() {
    try {
      await this.connectRedis();
      
      // Clear all watcher-owned Redis data on every startup so the event index
      // is always built fresh from START_BLOCK. Backend contract-call cache
      // (contract:v2:* / price:*) is preserved.
      await this.clearWatcherData();
      
      await this.connectWeb3();
      await this.loadContracts();
      this.startHealthBroadcast();
      
      // Синхронизация истории транзакций
      await this.initializeSync();
      
      // Подписка на новые блоки
      await this.subscribeToBlocks();
      this.startWatchdog();

      this.health.status = 'healthy';
      logger.info('Block Watcher initialized successfully');
    } catch (error) {
      this.health.status = 'error';
      logger.error('Failed to initialize Block Watcher:', error);
      throw error;
    }
  }
  
  async clearWatcherData() {
    const patterns = ['event:*', 'events:*', 'txs:*', 'tx:*', 'watcher:*'];
    let deleted = 0;
    for (const pattern of patterns) {
      let cursor = 0;
      do {
        const res = await this.redisClient.scan(cursor, { MATCH: pattern, COUNT: 200 });
        cursor = res.cursor;
        if (res.keys.length > 0) {
          await this.redisClient.del(res.keys);
          deleted += res.keys.length;
        }
      } while (cursor !== 0);
    }
    logger.info(`Cleared ${deleted} watcher Redis keys — resyncing from block ${this.startBlock}`);
  }

  async connectRedis() {
    // reconnectStrategy: бесконечный реконнект с backoff 100мс..5000мс.
    // Без этого node-redis v4 после ~20 неудачных попыток переходит в
    // постоянное состояние 'closed', и любой set/zAdd кидает
    // "The client is closed" — именно это мы ловили в проде.
    this.redisClient = redis.createClient({
      url: this.redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          const delay = Math.min(100 * Math.pow(2, retries), 5000);
          if (retries > 0 && retries % 10 === 0) {
            logger.warn(`Redis reconnect: attempt ${retries}, delay ${delay}ms`);
          }
          return delay;
        },
        connectTimeout: 10000,
      },
    });

    this.redisClient.on('error', (err) => {
      logger.error(`Redis Client Error: ${err.message}`);
      this.health.status = 'degraded';
      this.health.redisError = err.message;
    });
    this.redisClient.on('ready',   () => {
      logger.info('Redis ready');
      this.health.redisError = null;
      if (this.health.status === 'degraded') {
        this.health.status = 'healthy';
      }
    });
    this.redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    this.redisClient.on('end',     () => logger.warn('Redis connection ended'));

    await this.redisClient.connect();
    logger.info('Connected to Redis');
  }

  // Быстрая проверка доступности Redis без блокирующих вызовов.
  // node-redis v4 выставляет isReady=true только когда соединение активно и
  // готово принимать команды. Если false — никакие операции делать нельзя,
  // иначе получим "The client is closed" / таймауты.
  isRedisReady() {
    return !!(this.redisClient && this.redisClient.isReady);
  }

  // Ждёт готовности Redis до таймаута. Если за это время клиент не поднялся —
  // кидает ошибку (вызывающий код решает: упасть, пропустить батч, и т.п.).
  // Используется в тяжёлых циклах (historicalSync), чтобы не сыпать тысячами
  // запросов в заведомо нерабочий клиент.
  async ensureRedisReady(timeoutMs = this.redisReadyTimeoutMs) {
    if (this.isRedisReady()) return;
    logger.warn(`Redis not ready, waiting up to ${timeoutMs}ms...`);
    await new Promise((resolve, reject) => {
      const onReady = () => {
        clearTimeout(timer);
        this.redisClient.off('ready', onReady);
        resolve();
      };
      const timer = setTimeout(() => {
        this.redisClient.off('ready', onReady);
        reject(new Error(`Redis not ready after ${timeoutMs}ms`));
      }, timeoutMs);
      this.redisClient.on('ready', onReady);
    });
  }
  
  async connectWeb3() {
    // По умолчанию используем HTTP polling — WebSocket у публичных RPC
    // (publicnode, llamarpc) регулярно обрывается, в web3.js v4 это
    // проявляется как PendingRequestsOnReconnectingError и потеря блоков
    // между реконнектами. HTTP polling скучнее (latency 5s), но стабилен.
    // Принудительно включить WS можно через USE_WS=1.
    const forceWs = process.env.USE_WS === '1' || process.env.USE_WS === 'true';

    if (this.rpcWsUrl && forceWs) {
      try {
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.rpcWsUrl, {
          reconnect: {
            auto: true,
            delay: 5000,
            maxAttempts: 10
          }
        }));

        await this.web3.eth.getBlockNumber();
        logger.info('Connected to Ethereum via WebSocket (USE_WS=1)');
        return;
      } catch (error) {
        logger.warn('WebSocket connection failed, falling back to HTTP:', error.message);
      }
    }

    if (this.rpcHttpUrl) {
      this.web3 = new Web3(this.rpcHttpUrl);
      await this.web3.eth.getBlockNumber();
      logger.info('Connected to Ethereum via HTTP (polling mode)');
    } else if (this.rpcWsUrl) {
      // Последний резерв: WS если HTTP не настроен.
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.rpcWsUrl, {
        reconnect: { auto: true, delay: 5000, maxAttempts: 10 },
      }));
      await this.web3.eth.getBlockNumber();
      logger.warn('Connected to Ethereum via WebSocket (no HTTP URL configured)');
    } else {
      throw new Error('No RPC URL configured');
    }
  }
  
  async loadContracts() {
    const configPath = path.join(__dirname, '../config/watched-addresses.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.settings = config.settings;
    this.cacheDependencies = config.cacheDependencies || {};
    this.eventDependencies = config.eventDependencies || {};
    
    // Загружаем список событий для индексации
    const eventsConfigPath = path.join(__dirname, '../config/events-config.json');
    const eventsConfig = JSON.parse(fs.readFileSync(eventsConfigPath, 'utf8'));
    this.contractEvents = eventsConfig.contractEvents;
    // Контракты, чьи события индексируются на КАЖДОМ блоке (не только
    // когда в блоке есть watched tx). Нужно для DFC/RLE, где Transfer может
    // быть инициирован внешним контрактом (DEX-роутер, bridge), а мы обязаны
    // всё равно увидеть этот перевод и показать юзеру.
    this.fullScanContracts = eventsConfig.fullScanContracts || {};
    
    // Загружаем полные ABI из contract-abis.js
    const contractAbis = require('../config/contract-abis.js');
    
    // Загружаем DAO контракт
    const daoAbi = contractAbis.dao;
    const daoContract = new this.web3.eth.Contract(daoAbi, config.dao.address);
    
    // Добавляем DAO в список watched
    this.watchedAddresses.set(config.dao.address.toLowerCase(), {
      name: config.dao.name,
      contractKey: 'dao',
      type: 'dao',
      address: config.dao.address
    });
    this.contracts.set('dao', daoContract);
    logger.info(`Added DAO: ${config.dao.address}`);
    
    // Загружаем статические контракты
    for (const contract of config.staticContracts) {
      this.watchedAddresses.set(contract.address.toLowerCase(), {
        name: contract.name,
        contractKey: 'pool',
        type: contract.type,
        address: contract.address,
        poolIds: contract.poolIds ? contract.poolIds.map(id => id.toLowerCase()) : null,
      });
      
      // Загружаем ABI для pool из contractAbis
      const poolAbi = contractAbis.pool;
      const poolContract = new this.web3.eth.Contract(poolAbi, contract.address);
      this.contracts.set('pool', poolContract);
      logger.info(`Added static contract ${contract.name}: ${contract.address} (with full ABI)`);
    }
    
    // Загружаем динамические контракты из DAO
    for (const contractName of config.dynamicContracts) {
      try {
        logger.debug(`Fetching address for contract: ${contractName}`);
        const address = await daoContract.methods.addresses(contractName).call();
        
        if (!address || address === '0x0000000000000000000000000000000000000000') {
          logger.warn(`Contract ${contractName} has zero address, skipping`);
          continue;
        }
        
        this.watchedAddresses.set(address.toLowerCase(), {
          name: contractName,
          contractKey: contractName,
          type: 'contract',
          address: address
        });
        
        // Загружаем полный ABI из contractAbis
        const abi = contractAbis[contractName];
        if (abi) {
          const contractInstance = new this.web3.eth.Contract(abi, address);
          this.contracts.set(contractName, contractInstance);
          logger.info(`Loaded dynamic contract ${contractName}: ${address} (with full ABI)`);
        } else {
          logger.warn(`No ABI found for ${contractName} in contractAbis`);
        }
        
      } catch (error) {
        logger.error(`Failed to load dynamic contract ${contractName}: ${error.message}`, error.stack);
      }
    }
    
    this.health.watchedAddressesCount = this.watchedAddresses.size;
    logger.info(`Watching ${this.watchedAddresses.size} addresses`);
  }
  
  // ===== Checkpointing =====
  
  async getContractsHash() {
    const addresses = Array.from(this.watchedAddresses.keys()).sort();
    const crypto = require('crypto');
    return crypto.createHash('md5').update(addresses.join(',')).digest('hex');
  }
  
  async loadCheckpoint() {
    try {
      const checkpoint = await this.redisClient.get('watcher:checkpoint');
      if (checkpoint) {
        return JSON.parse(checkpoint);
      }
    } catch (error) {
      logger.warn('Failed to load checkpoint:', error);
    }
    return null;
  }
  
  async saveCheckpoint(blockNumber) {
    try {
      if (!this.isRedisReady()) {
        logger.warn('Redis not ready, checkpoint not saved (will retry on next block)');
        return;
      }
      const checkpoint = {
        lastProcessedBlock: blockNumber,
        contractsHash: await this.getContractsHash(),
        timestamp: new Date().toISOString()
      };
      await this.redisClient.set('watcher:checkpoint', JSON.stringify(checkpoint));
      this.health.lastProcessedBlock = blockNumber;
    } catch (error) {
      logger.error('Failed to save checkpoint:', error);
    }
  }
  
  // ===== Transaction History Loading via Etherscan API =====
  
  async initializeSync() {
    const currentBlock = Number(await this.web3.eth.getBlockNumber());
    const checkpoint = await this.loadCheckpoint();
    const currentHash = await this.getContractsHash();

    // Загружаем реальные счетчики из Redis при старте
    await this.loadCountersFromRedis();

    let syncFromBlock = this.startBlock;

    if (checkpoint) {
      logger.info(`Checkpoint ignored (always-fresh sync) — starting from block ${this.startBlock}`);
    } else {
      logger.info(`Starting from block ${this.startBlock}`);
    }

    if (syncFromBlock < currentBlock) {
      this.health.status = 'syncing';
      await this.historicalSync(syncFromBlock, currentBlock);
    } else {
      logger.info('Already synced to current block');
      this.health.lastProcessedBlock = currentBlock;
    }
  }
  
  async loadCountersFromRedis() {
    try {
      // Подсчитываем транзакции для каждого контракта и параллельно
      // восстанавливаем lastRelevantBlock — максимальный score в
      // txs:{address}:list это и есть блок последней watched-tx.
      // Без восстановления после рестарта health.lastRelevantBlock = null
      // пока не произойдёт новая транзакция к watched-контракту,
      // и на UI отображается прочерк.
      let totalTxs = 0;
      let maxRelevantBlock = 0;
      for (const [address] of this.watchedAddresses.entries()) {
        const txsListKey = `txs:${address}:list`;
        const count = await this.redisClient.zCard(txsListKey);
        totalTxs += count;

        if (count > 0) {
          const top = await this.redisClient.zRange(txsListKey, 0, 0, { REV: true });
          if (top && top.length > 0) {
            const lastTx = await this.redisClient.get(`tx:${top[0]}`);
            if (lastTx) {
              try {
                const parsed = JSON.parse(lastTx);
                const bn = Number(parsed.blockNumber);
                if (bn > maxRelevantBlock) {
                  maxRelevantBlock = bn;
                  if (parsed.blockTimestamp) {
                    this.health.lastRelevantBlockTime = new Date(Number(parsed.blockTimestamp) * 1000).toISOString();
                  }
                }
              } catch (_) { /* skip malformed */ }
            }
          }
        }
      }
      this.health.transactionsIndexed = totalTxs;
      if (maxRelevantBlock > 0) {
        this.health.lastRelevantBlock = maxRelevantBlock;
      }
      
      // Подсчитываем события по контрактам
      let totalEvents = 0;
      for (const [, contractInfo] of this.watchedAddresses.entries()) {
        if (contractInfo.type === 'wallet') continue;
        
        const contractKey = contractInfo.contractKey;
        const eventsListKey = `events:${contractKey}:all:list`;
        const count = await this.redisClient.zCard(eventsListKey);
        totalEvents += count;
      }
      this.health.eventsIndexed = totalEvents;
      
      logger.info(`Loaded from Redis: ${totalTxs} transactions, ${totalEvents} events`);
    } catch (error) {
      logger.warn('Failed to load counters from Redis:', error.message);
    }
  }
  
  async historicalSync(fromBlock, toBlock) {
    logger.info(`Starting historical sync: blocks ${fromBlock} → ${toBlock}`);

    // Если Redis не готов — не запускаем тяжёлый sync.
    // Иначе получим сотни тысяч "The client is closed" ошибок и забитые CPU/логи.
    await this.ensureRedisReady();

    // 1. Загружаем транзакции для каждого контракта через Etherscan API
    logger.info('=== PHASE 1: Loading transactions via Etherscan API ===');
    for (const [address, contractInfo] of this.watchedAddresses.entries()) {
      await this.ensureRedisReady();
      logger.info(`Loading transactions for ${contractInfo.name} (${address})...`);

      try {
        await this.loadTransactionsViaEtherscan(address, fromBlock, toBlock);
      } catch (error) {
        logger.error(`Failed to load transactions for ${contractInfo.name}:`, error.message);
      }
      
      // Пауза между запросами к Etherscan (rate limit)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 2. Загружаем события для каждого контракта через Etherscan getLogs API
    logger.info('=== PHASE 2: Loading events via Etherscan getLogs API ===');
    await this.ensureRedisReady();
    await this.loadEventsViaEtherscan(fromBlock, toBlock);
    
    await this.saveCheckpoint(toBlock);
    this.health.historicalSyncProgress = null;
    this.health.status = 'healthy';
    logger.info(`Historical sync completed: ${this.health.transactionsIndexed} transactions + ${this.health.eventsIndexed} events indexed`);
  }
  
  async loadTransactionsViaEtherscan(address, startBlock, endBlock) {
    if (!this.etherscanApiKey) {
      logger.warn('Etherscan API key not configured, skipping historical sync');
      return;
    }
    
    try {
      const url = `${this.etherscanApiUrl}?chainid=1&module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=${this.etherscanApiKey}`;
      
      logger.debug(`Etherscan API request: ${address} blocks ${startBlock}-${endBlock}`);
      
      const response = await axios.get(url);
      const data = response.data;
      
      if (data.status !== '1') {
        logger.warn(`Etherscan API error for ${address}: ${data.message}`);
        return;
      }
      
      const transactions = data.result || [];
      logger.info(`Loaded ${transactions.length} transactions for ${address}`);
      
      // Сохраняем транзакции в Redis
      for (const tx of transactions) {
        await this.indexTransaction(tx, address);
      }
      
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn('Etherscan rate limit, waiting 1s...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
  
  async indexTransaction(tx, contractAddress) {
    try {
      // Fail-fast: нет смысла декодировать method и строить payload,
      // если Redis не готов принять запись — всё равно упадёт на set().
      if (!this.isRedisReady()) {
        throw new Error('Redis not ready, skipping tx');
      }
      // Декодируем имя метода из input data
      let methodName = null;
      if (tx.input && tx.input.length >= 10) {
        const methodId = tx.input.slice(0, 10);
        
        const contractInfo = this.watchedAddresses.get(contractAddress.toLowerCase());
        if (contractInfo) {
          const contractInstance = this.contracts.get(contractInfo.contractKey);
          if (contractInstance) {
            try {
              const abi = contractInstance.options.jsonInterface;
              const method = abi.find(item => {
                if (item.type === 'function') {
                  try {
                    const signature = `${item.name}(${item.inputs.map(input => input.type).join(',')})`;
                    const sig = this.web3.eth.abi.encodeFunctionSignature(signature);
                    return sig === methodId;
                  } catch (e) {
                    return false;
                  }
                }
                return false;
              });
              if (method) {
                methodName = method.name;
              }
            } catch (err) {
              logger.debug(`Failed to decode method for ${tx.hash}: ${err.message}`);
            }
          }
        }
      }
      
      // Формат Etherscan API транзакции
      const txData = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        gasUsed: tx.gasUsed,
        input: tx.input,
        method: methodName,
        blockNumber: parseInt(tx.blockNumber),
        blockTimestamp: parseInt(tx.timeStamp),
        contractAddress: contractAddress,
        isError: tx.isError,
        indexed_at: new Date().toISOString()
      };
      
      // Сохраняем raw транзакцию
      const txKey = `tx:${tx.hash}`;
      await this.redisClient.set(txKey, JSON.stringify(txData), {
        EX: 60 * 60 * 24 * 90 // TTL 90 дней
      });
      
      // Добавляем в sorted set для контракта (score = blockNumber)
      const listKey = `txs:${contractAddress}:list`;
      await this.redisClient.zAdd(listKey, {
        score: parseInt(tx.blockNumber),
        value: tx.hash
      });
      
      this.health.transactionsIndexed++;
      
      // Обновляем lastRelevantBlock
      if (!this.health.lastRelevantBlock || parseInt(tx.blockNumber) > this.health.lastRelevantBlock) {
        this.health.lastRelevantBlock = parseInt(tx.blockNumber);
        this.health.lastRelevantBlockTime = new Date(parseInt(tx.timeStamp) * 1000).toISOString();
      }
      
    } catch (error) {
      logger.error('Transaction indexing error:', error);
    }
  }
  
  // ===== Events Loading via Etherscan getLogs API =====

  async loadEventsViaEtherscan(fromBlock, toBlock) {
    if (!this.etherscanApiKey) {
      logger.warn('Etherscan API key not configured, skipping events historical sync');
      return;
    }

    for (const [address, contractInfo] of this.watchedAddresses.entries()) {
      const contractKey = contractInfo.contractKey;
      const eventNames = this.contractEvents[contractKey];

      if (!eventNames || eventNames.length === 0) {
        logger.debug(`No events configured for ${contractInfo.name}, skipping`);
        continue;
      }

      if (!this.contracts.has(contractKey)) {
        logger.warn(`No contract instance for ${contractKey}, skipping events`);
        continue;
      }

      const contractInstance = this.contracts.get(contractKey);
      logger.info(`Loading events for ${contractInfo.name} via Etherscan (${eventNames.length} event types)...`);

      for (const eventName of eventNames) {
        await this.ensureRedisReady();
        await this.loadEventLogsViaEtherscan(contractInstance, contractKey, address, eventName, fromBlock, toBlock, contractInfo.poolIds);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  async loadEventLogsViaEtherscan(contractInstance, contractKey, contractAddress, eventName, fromBlock, toBlock, poolIds = null) {
    const eventAbi = contractInstance.options.jsonInterface.find(
      item => item.type === 'event' && item.name === eventName
    );
    if (!eventAbi) {
      logger.warn(`No ABI definition for event ${eventName} in ${contractKey}`);
      return;
    }

    const signature = `${eventAbi.name}(${eventAbi.inputs.map(i => i.type).join(',')})`;
    const topic0 = this.web3.utils.keccak256(signature);

    // Если заданы poolIds — делаем отдельный запрос на каждый пул через topic1.
    // Это исключает события чужих пулов на стороне Etherscan, не гоняя лишний трафик.
    const topic1List = poolIds && poolIds.length > 0 ? poolIds : [null];

    let totalIndexed = 0;

    for (const topic1 of topic1List) {
      let page = 1;
      const pageSize = 1000;

      while (true) {
        let url = `${this.etherscanApiUrl}?chainid=1&module=logs&action=getLogs` +
          `&address=${contractAddress}&fromBlock=${fromBlock}&toBlock=${toBlock}` +
          `&topic0=${topic0}&page=${page}&offset=${pageSize}&apikey=${this.etherscanApiKey}`;
        if (topic1) url += `&topic0_1_opr=and&topic1=${topic1}`;

        try {
          const response = await axios.get(url);
          const data = response.data;

          if (data.status !== '1') {
            if (data.message !== 'No records found') {
              logger.warn(`Etherscan getLogs error for ${contractKey}.${eventName}: ${data.message}`);
            }
            break;
          }

          const logs = data.result || [];

          for (const log of logs) {
            try {
              const decoded = this.web3.eth.abi.decodeLog(
                eventAbi.inputs,
                log.data,
                log.topics.slice(1)
              );

              const event = {
                event: eventName,
                returnValues: decoded,
                blockNumber: parseInt(log.blockNumber, 16),
                transactionHash: log.transactionHash,
                logIndex: parseInt(log.logIndex, 16)
              };

              await this.indexEvent(event, contractKey, contractAddress);
              totalIndexed++;
            } catch (decodeError) {
              logger.warn(`Failed to decode ${eventName} log in tx ${log.transactionHash}: ${decodeError.message}`);
            }
          }

          if (logs.length < pageSize) break;
          page++;
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          if (error.response?.status === 429) {
            logger.warn(`Etherscan rate limit on getLogs for ${contractKey}.${eventName}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            logger.error(`Failed to load ${eventName} for ${contractKey}: ${error.message}`);
            break;
          }
        }
      }
    }

    if (totalIndexed > 0) {
      logger.info(`Indexed ${totalIndexed} ${eventName} events for ${contractKey} via Etherscan`);
    }
  }
  
  // Конвертирует BigInt в строки для JSON сериализации
  serializeBigInt(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeBigInt(item));
    }
    
    if (typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        result[key] = this.serializeBigInt(obj[key]);
      }
      return result;
    }
    
    return obj;
  }
  
  async getBlockTimestamp(blockNumber) {
    const blockNum = Number(blockNumber);
    
    if (this.blockTimestampCache.has(blockNum)) {
      return this.blockTimestampCache.get(blockNum);
    }
    
    try {
      const block = await this.web3.eth.getBlock(blockNum);
      const timestamp = Number(block.timestamp);
      this.blockTimestampCache.set(blockNum, timestamp);
      
      // Ограничиваем размер кэша (храним последние 1000 блоков)
      if (this.blockTimestampCache.size > 1000) {
        const firstKey = this.blockTimestampCache.keys().next().value;
        this.blockTimestampCache.delete(firstKey);
      }
      
      return timestamp;
    } catch (error) {
      logger.warn(`Failed to get block timestamp for ${blockNum}: ${error.message}`);
      return null;
    }
  }

  async indexEvent(event, contractKey, contractAddress) {
    try {
      // Fail-fast: не делаем тяжёлый getBlock() + сериализацию,
      // если Redis не готов — всё равно set() упадёт.
      if (!this.isRedisReady()) {
        throw new Error('Redis not ready, skipping event');
      }
      // Сериализуем весь event объект полностью
      const serializedEvent = this.serializeBigInt(event);

      // Получаем timestamp блока с кэшированием
      const blockTimestamp = await this.getBlockTimestamp(serializedEvent.blockNumber);

      const eventData = {
        event: serializedEvent.event,
        returnValues: serializedEvent.returnValues,
        blockNumber: Number(serializedEvent.blockNumber),
        blockTimestamp: blockTimestamp,
        transactionHash: serializedEvent.transactionHash,
        logIndex: serializedEvent.logIndex,
        contractAddress: contractAddress,
        contractKey: contractKey,
        indexed_at: new Date().toISOString()
      };
      
      // Сохраняем в Redis (отдельный кэш для событий)
      const eventKey = `event:${contractKey}:${eventData.event}:${eventData.transactionHash}:${eventData.logIndex}`;
      await this.redisClient.set(eventKey, JSON.stringify(eventData), {
        EX: 60 * 60 * 24 * 90 // TTL 90 дней
      });
      
      // Добавляем в sorted set по типу события
      const eventListKey = `events:${contractKey}:${event.event}:list`;
      await this.redisClient.zAdd(eventListKey, {
        score: Number(event.blockNumber),
        value: eventKey
      });
      
      // Общий список всех событий контракта
      const allEventsListKey = `events:${contractKey}:all:list`;
      await this.redisClient.zAdd(allEventsListKey, {
        score: Number(event.blockNumber),
        value: eventKey
      });
      
      this.health.eventsIndexed = (this.health.eventsIndexed || 0) + 1;
      
    } catch (error) {
      logger.error('Event indexing error:', error);
    }
  }
  
  // ===== Real-time Block Monitoring =====
  
  async subscribeToBlocks() {
    if (this.web3.currentProvider.constructor.name === 'WebsocketProvider') {
      // WebSocket provider reconnection handling
      const provider = this.web3.currentProvider;
      
      provider.on('connect', async () => {
        logger.info('WebSocket connected');
        
        // Catch-up: check if we missed any blocks during disconnect
        const currentBlock = Number(await this.web3.eth.getBlockNumber());
        const lastProcessed = this.health.lastProcessedBlock || 0;
        
        if (currentBlock > lastProcessed + 1) {
          const missedBlocks = currentBlock - lastProcessed;
          logger.warn(`Detected ${missedBlocks} missed blocks (${lastProcessed} → ${currentBlock}), catching up...`);
          
          // Process missed blocks (limit to reasonable number to avoid overload)
          const catchUpFrom = Math.max(lastProcessed + 1, currentBlock - 100);
          for (let blockNum = catchUpFrom; blockNum < currentBlock; blockNum++) {
            try {
              // getBlock может вернуть null если node ещё не увидел блок
              // (реплика отстала) или если WS реконнектится в этот момент.
              // Без null-чека получим "Cannot read properties of null (reading 'number')"
              // и прервём весь catch-up-цикл.
              const blockHeader = await this.web3.eth.getBlock(blockNum);
              if (!blockHeader) {
                logger.warn(`getBlock(${blockNum}) returned null during catch-up, skipping`);
                continue;
              }
              await this.processBlockHeader(blockHeader);
              // Yield the event loop every 10 blocks so HTTP requests aren't
              // starved while catching up on missed blocks.
              if ((blockNum - catchUpFrom) % 10 === 9) {
                await new Promise(resolve => setImmediate(resolve));
              }
            } catch (error) {
              logger.error(`Failed to catch up block ${blockNum}:`, error.message);
            }
          }
          logger.info(`Catch-up completed, processed blocks ${catchUpFrom} → ${currentBlock - 1}`);
        }
      });
      
      provider.on('disconnect', (error) => {
        logger.warn('WebSocket disconnected:', error?.message || 'Unknown reason');
        this.health.status = 'degraded';
      });
      
      this.subscription = await this.web3.eth.subscribe('newBlockHeaders');
      
      this.subscription.on('data', async (blockHeader) => {
        await this.processBlockHeader(blockHeader);
      });
      
      this.subscription.on('error', (error) => {
        logger.error('Subscription error:', error);
        this.health.status = 'degraded';
      });
      
      logger.info('Subscribed to new block headers (WebSocket)');
    } else {
      // Fallback polling с защитой от дубликатов.
      // Без `lastPolledBlock` один и тот же блок обрабатывается каждые 5s,
      // пока в цепочке не появится следующий — это засоряет RPC и кидает
      // лишние зависимые инвалидации кэша.
      logger.warn('Using polling mode (HTTP provider)');
      // Стартуем с текущего блока — пропускаем блоки produced во время
      // исторического синка, чтобы не делать burst из сотен RPC-запросов
      // сразу после старта и не упереться в rate limit free-tier ноды.
      let lastPolledBlock = Number(await this.web3.eth.getBlockNumber());
      logger.info(`Polling starting from current block ${lastPolledBlock}`);
      this.pollingInterval = setInterval(async () => {
        try {
          const latest = Number(await this.web3.eth.getBlockNumber());
          if (latest <= lastPolledBlock) return;

          // Обрабатываем не более 5 блоков за тик — защита от rate limit при
          // большом отставании (например после рестарта подписки).
          const catchUpTo = Math.min(latest, lastPolledBlock + 5);
          for (let n = lastPolledBlock + 1; n <= catchUpTo; n++) {
            const blockHeader = await this.web3.eth.getBlock(n);
            if (!blockHeader) {
              logger.warn(`getBlock(${n}) returned null during polling, will retry`);
              return; // не двигаем lastPolledBlock — повторим на следующей итерации
            }
            await this.processBlockHeader(blockHeader);
            lastPolledBlock = n;
          }
        } catch (error) {
          logger.error('Polling error:', error.message);
        }
      }, 5000);
    }
  }
  
  async processBlockHeader(blockHeader) {
    const blockNumber = Number(blockHeader.number);
    const blockTimestamp = Number(blockHeader.timestamp);

    this._lastBlockReceivedAt = Date.now();
    this.health.lastNetworkBlock = blockNumber;
    this.health.lastNetworkBlockTime = new Date(blockTimestamp * 1000).toISOString();
    
    logger.debug(`New block: ${blockNumber}`);
    
    // Получаем полный блок с транзакциями
    const block = await this.web3.eth.getBlock(blockNumber, true);
    
    if (!block.transactions || block.transactions.length === 0) {
      await this.saveCheckpoint(blockNumber);
      return;
    }
    
    let hasRelevantTx = false;
    
    for (const tx of block.transactions) {
      const toAddress = tx.to?.toLowerCase();
      const fromAddress = tx.from?.toLowerCase();
      
      // Проверяем транзакции с нашими контрактами
      if (toAddress && this.watchedAddresses.has(toAddress)) {
        hasRelevantTx = true;
        const contractInfo = this.watchedAddresses.get(toAddress);
        
        logger.info(`New transaction to ${contractInfo.name}: ${tx.hash}`);
        
        // Получаем полные данные транзакции из блока
        const fullTxData = {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value?.toString() || '0',
          gas: tx.gas?.toString() || '0',
          gasPrice: tx.gasPrice?.toString() || '0',
          input: tx.input,
          blockNumber: blockNumber,
          timeStamp: blockTimestamp.toString(), // В формате Etherscan
          contractAddress: toAddress,
          indexed_at: new Date().toISOString()
        };
        
        // Получаем receipt для gasUsed, isError и событий
        try {
          const receipt = await this.web3.eth.getTransactionReceipt(tx.hash);
          fullTxData.gasUsed = receipt.gasUsed?.toString() || '0';
          fullTxData.isError = receipt.status ? '0' : '1';
          
          // Декодируем события из receipt
          await this.processReceiptEvents(receipt, contractInfo, toAddress, blockNumber);
          
        } catch (error) {
          logger.warn(`Failed to get receipt for ${tx.hash}: ${error.message}`);
        }

        // Индексируем транзакцию
        await this.indexTransaction(fullTxData, toAddress);

        // Инвалидируем старый кэш backend API
        await this.invalidateBackendCache(toAddress);
      }
    }

    if (hasRelevantTx) {
      this.health.lastRelevantBlock = blockNumber;
      this.health.lastRelevantBlockTime = new Date(blockTimestamp * 1000).toISOString();

      // Backup-индексация всех watched-контрактов параллельно.
      // Было: sequential for-await → N×RPC_latency per block (10+ seconds).
      // Теперь: Promise.all → max(RPC_latency) per block (~200ms).
      await Promise.all(
        Array.from(this.watchedAddresses.entries()).map(([watchedAddress, watchedInfo]) =>
          this.indexBlockEventsForContract(watchedInfo, watchedAddress, blockNumber)
            .catch(error =>
              logger.warn(`Backup-index for ${watchedInfo.name} at block ${blockNumber} failed: ${error.message}`)
            )
        )
      );
    }

    if (!hasRelevantTx) {
      await Promise.all(
        Object.entries(this.fullScanContracts).map(([contractKey, eventNames]) => {
          const contractInstance = this.contracts.get(contractKey);
          if (!contractInstance) return Promise.resolve();
          const contractAddress = contractInstance.options.address?.toLowerCase();
          if (!contractAddress) return Promise.resolve();
          const contractInfo = this.watchedAddresses.get(contractAddress)
            || { contractKey, name: contractKey };
          return this.indexBlockEventsForContract(contractInfo, contractAddress, blockNumber, eventNames)
            .catch(error =>
              logger.warn(`Full-scan ${contractKey} at block ${blockNumber} failed: ${error.message}`)
            );
        })
      );
    }

    await this.saveCheckpoint(blockNumber);
  }
  
  async processReceiptEvents(receipt, contractInfo, contractAddress, blockNumber) {
    if (!receipt.logs || receipt.logs.length === 0) {
      return;
    }

    // Раньше здесь стоял `if (log.address !== contractAddress) continue;`,
    // из-за чего при tx-вызове контракта A эмиттнутые внутри Transfer/других
    // события из контракта B (типичный кейс: Deposit.openDeposit → внутри
    // FlatCoin.transferFrom) не индексировались НИ в A (событие не его),
    // НИ в B (indexBlockEventsForContract зовётся только для A). Результат —
    // перевод DFC на deposit-контракт пропадал из списка Transfers.
    //
    // Теперь: для каждого лога определяем watched-контракт по log.address
    // и декодируем его ABI'ем. Если адрес не watched — пропускаем без шума.
    for (const log of receipt.logs) {
      const logAddress = log.address.toLowerCase();
      const logContractInfo = this.watchedAddresses.get(logAddress);
      if (!logContractInfo) {
        continue;
      }

      const logContractInstance = this.contracts.get(logContractInfo.contractKey);
      if (!logContractInstance) {
        continue;
      }

      try {
        const decodedEvent = logContractInstance._decodeEventABI.call({
          name: 'ALLEVENTS',
          jsonInterface: logContractInstance.options.jsonInterface
        }, log);

        if (!decodedEvent || !decodedEvent.event) {
          continue;
        }

        const event = {
          event: decodedEvent.event,
          returnValues: decodedEvent.returnValues,
          blockNumber: blockNumber,
          transactionHash: receipt.transactionHash,
          logIndex: log.logIndex
        };

        await this.indexEvent(event, logContractInfo.contractKey, logAddress);
        logger.debug(`Indexed ${event.event} for ${logContractInfo.name} (via tx to ${contractInfo.name})`);

      } catch (decodeError) {
        // warn (не debug) — чтобы эти ошибки были видны в обычном логе.
        // В debug-режиме проблемы с decodeEventABI (вроде несовпадения ABI
        // или обрезанного receipt'а) уходили в /dev/null и пользователь
        // не видел, что свежие события не попадают в индекс.
        logger.warn(`Failed to decode log for ${logContractInfo.name}: ${decodeError.message}`);
      }
    }
  }

  // Подхват событий контракта ровно для одного блока через getPastEvents.
  // Надёжнее, чем парсинг receipt.logs на нестабильном WebSocket: это
  // отдельный JSON-RPC запрос (eth_getLogs), который не страдает от
  // PendingRequestsOnReconnectingError. Вызывается как backup после
  // processReceiptEvents чтобы гарантировать, что ни одно событие watched
  // контракта не потерялось.
  async indexBlockEventsForContract(contractInfo, contractAddress, blockNumber, eventNamesOverride = null) {
    const contractKey = contractInfo.contractKey;
    const eventNames = eventNamesOverride || this.contractEvents[contractKey];
    if (!eventNames || eventNames.length === 0) return;

    const contractInstance = this.contracts.get(contractKey);
    if (!contractInstance) return;

    for (const eventName of eventNames) {
      try {
        const events = await contractInstance.getPastEvents(eventName, {
          fromBlock: blockNumber,
          toBlock: blockNumber,
        });
        for (const event of events) {
          await this.indexEvent(event, contractKey, contractAddress);
        }
        if (events.length > 0) {
          logger.info(
            `Backup-indexed ${events.length} ${eventName} events for ${contractInfo.name} at block ${blockNumber}`
          );
        }
      } catch (error) {
        logger.warn(
          `Backup getPastEvents failed for ${contractKey}.${eventName} @${blockNumber}: ${error.message}`
        );
      }
    }
  }

  // SCAN-based key lookup — non-blocking alternative to KEYS.
  // KEYS is O(N) and freezes Redis while scanning; SCAN iterates in small
  // batches, letting other commands run between cursor steps.
  async scanKeys(pattern) {
    const keys = [];
    let cursor = 0;
    do {
      const result = await this.redisClient.scan(cursor, { MATCH: pattern, COUNT: 200 });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);
    return keys;
  }

  async invalidateBackendCache(address) {
    try {
      const contractInfo = this.watchedAddresses.get(address);
      if (!contractInfo) {
        logger.warn(`No contract info found for ${address}, skipping cache invalidation`);
        return;
      }

      const contractKey = contractInfo.contractKey;
      const cachePrefix = `contract:v2:${contractKey}`;

      const [keys, depKeyResults] = await Promise.all([
        this.scanKeys(`${cachePrefix}:*`),
        Promise.all(
          (this.cacheDependencies?.[contractKey] || []).map(async depKey => ({
            depKey,
            keys: await this.scanKeys(`contract:v2:${depKey}:*`),
          }))
        ),
      ]);

      const toDelete = [...keys, `eth:balance:${address}`];
      for (const { keys: dk } of depKeyResults) toDelete.push(...dk);

      if (toDelete.length > 0) {
        await this.redisClient.del(toDelete);
        logger.info(`Invalidated ${toDelete.length} cache keys for ${contractInfo.name} (${contractKey})`);
      }
    } catch (error) {
      logger.error('Backend cache invalidation error:', error);
    }
  }
  
  // ===== Watchdog — detects and recovers from stalled block processing =====

  startWatchdog(staleThresholdMs = 60_000, checkIntervalMs = 30_000) {
    // Grace period after startup before we complain about no blocks.
    const startupGraceMs = 2 * 60_000;
    this.watchdogInterval = setInterval(async () => {
      if (this._restarting) return;
      if (!this._lastBlockReceivedAt) {
        // Subscription hasn't received any block yet. If historical sync is done
        // and we're past the startup grace period, the subscription likely failed
        // to start — restart it.
        if (this.health.historicalSyncProgress === null) {
          const elapsedSinceStart = Date.now() - this.health.startTime;
          if (elapsedSinceStart > startupGraceMs) {
            logger.warn('Watchdog: no blocks received since startup (subscription likely failed) — restarting');
            await this.restartSubscription();
          }
        }
        return;
      }
      const staleMs = Date.now() - this._lastBlockReceivedAt;
      if (staleMs < staleThresholdMs) return;

      logger.warn(`Watchdog: no new blocks for ${Math.floor(staleMs / 1000)}s — restarting subscription`);
      await this.restartSubscription();
    }, checkIntervalMs);
  }

  async restartSubscription() {
    if (this._restarting) return;
    this._restarting = true;
    try {
      // Tear down existing subscription / polling
      if (this.subscription) {
        try { await this.subscription.unsubscribe(); } catch (_) { /* ignore */ }
        this.subscription = null;
      }
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      // Brief pause before reconnecting
      await new Promise((r) => setTimeout(r, 2000));

      await this.subscribeToBlocks();
      this.health.status = 'healthy';
      logger.info('Watchdog: subscription restarted successfully');
    } catch (err) {
      logger.error('Watchdog: failed to restart subscription:', err.message);
      this.health.status = 'degraded';
    } finally {
      this._restarting = false;
    }
  }

  // ===== Health & Status =====

  startHealthBroadcast() {
    this.healthServer = new HealthServer(
      this.healthPort,
      () => this.getHealthStatus(),
      () => this.getWatchedContracts(),
      (addr, options) => this.getContractTransactions(addr, options),
      (addr, eventName, options) => this.getContractEvents(addr, eventName, options),
      (contractNameOrAddress) => this.renewContractCache(contractNameOrAddress),
      this.web3,
      this.redisClient,
      this.contracts,
      this.settings
    );
    this.healthServer.start();
    
    const wsPort = parseInt(this.healthPort) + 1;
    this.wss = new WebSocket.Server({ port: wsPort });
    
    this.wss.on('connection', (ws) => {
      logger.info('Health status client connected');
      ws.send(JSON.stringify(this.getHealthStatus()));
    });
    
    const interval = this.settings?.healthBroadcastInterval || 5000;
    setInterval(() => {
      this.broadcastHealth();
    }, interval);
    
    logger.info(`Health HTTP server on port ${this.healthPort}, WebSocket on ${wsPort}`);
  }
  
  getHealthStatus() {
    const h = {
      ...this.health,
      uptime: Date.now() - this.health.startTime,
      timestamp: new Date().toISOString(),
    };
    // Downgrade to degraded if we haven't seen a new block in over 60 seconds,
    // even if the internal status flag is still 'healthy'.
    if (h.status === 'healthy') {
      if (this._lastBlockReceivedAt) {
        const staleMs = Date.now() - this._lastBlockReceivedAt;
        if (staleMs > 60_000) {
          h.status = 'degraded';
          h.staleFor = `${Math.floor(staleMs / 1000)}s`;
        }
      } else if (h.historicalSyncProgress === null) {
        // Sync is done but no block has been received — subscription never started.
        const elapsedSinceStart = Date.now() - this.health.startTime;
        if (elapsedSinceStart > 2 * 60_000) {
          h.status = 'degraded';
          h.staleFor = 'subscription_never_started';
        }
      }
    }
    return h;
  }
  
  broadcastHealth() {
    const health = this.getHealthStatus();
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(health));
      }
    });
  }
  
  async getWatchedContracts() {
    const contracts = [];
    for (const [address, info] of this.watchedAddresses.entries()) {
      contracts.push({
        address: address,
        name: info.name,
        type: info.type
      });
    }
    return contracts;
  }
  
  async getContractTransactions(contractAddress, options = {}) {
    const { page = 1, limit = 25 } = options;
    
    try {
      const listKey = `txs:${contractAddress}:list`;
      
      // Получаем общее количество транзакций
      const total = await this.redisClient.zCard(listKey);
      
      if (total === 0) {
        return {
          transactions: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0
          }
        };
      }
      
      // Вычисляем offset для пагинации (от конца, т.к. нужны последние)
      // Используем positive indices с ZREVRANGE вместо negative с ZRANGE REV
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      
      // Получаем хэши транзакций для текущей страницы (ZREVRANGE для reverse order)
      const txHashes = await this.redisClient.zRange(listKey, start, end, { REV: true });
      
      const txDataList = await Promise.all(txHashes.map(hash => this.redisClient.get(`tx:${hash}`)));
      const transactions = txDataList.filter(Boolean).map(d => JSON.parse(d));
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Error fetching contract transactions:', error);
      return {
        transactions: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    }
  }
  
  async getContractEvents(contractAddressOrKey, eventName = null, options = {}) {
    const { page = 1, limit = 25 } = options;
    
    try {
      // Конвертируем адрес в contractKey если нужно
      let contractKey = contractAddressOrKey;
      
      if (contractAddressOrKey.startsWith('0x')) {
        const address = contractAddressOrKey.toLowerCase();
        const contractInfo = this.watchedAddresses.get(address);
        if (contractInfo) {
          contractKey = contractInfo.contractKey;
          logger.debug(`Resolved ${address} to contractKey: ${contractKey}`);
        } else {
          logger.warn(`Contract not found for address: ${contractAddressOrKey}`);
          return {
            events: [],
            pagination: {
              total: 0,
              page,
              limit,
              totalPages: 0
            }
          };
        }
      }
      
      let listKey;
      
      if (eventName) {
        // Конкретный тип события
        listKey = `events:${contractKey}:${eventName}:list`;
      } else {
        // Все события
        listKey = `events:${contractKey}:all:list`;
      }
      
      logger.debug(`Fetching events from key: ${listKey}`);
      
      // Получаем общее количество событий
      const total = await this.redisClient.zCard(listKey);
      
      if (total === 0) {
        return {
          events: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0
          }
        };
      }
      
      // Вычисляем offset для пагинации (от конца, т.к. нужны последние)
      // Используем positive indices с ZREVRANGE вместо negative с ZRANGE REV
      const start = (page - 1) * limit;
      const end = start + limit - 1;
      
      // Получаем ключи событий для текущей страницы (ZREVRANGE для reverse order)
      const eventKeys = await this.redisClient.zRange(listKey, start, end, { REV: true });
      
      const eventDataList = await Promise.all(eventKeys.map(key => this.redisClient.get(key)));
      const events = eventDataList.filter(Boolean).map(d => JSON.parse(d));
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        events,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Error fetching contract events:', error);
      return {
        events: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      };
    }
  }
  
  // Переиндексация событий контракта через getPastEvents без чистки его
  // существующих данных. Используется как "dep-reindex" после renewCache(X)
  // для контрактов, на которых эмиттятся события в рамках tx к X
  // (см. eventDependencies). Идемпотентно: indexEvent перезаписывает по
  // eventKey = `event:{contractKey}:{eventName}:{txHash}:{logIndex}`.
  async reindexContractEvents(contractKey, fromBlock, toBlock) {
    const contract = this.contracts.get(contractKey);
    if (!contract) {
      logger.warn(`reindexContractEvents: contract ${contractKey} not loaded, skipping`);
      return 0;
    }
    const eventNames = this.contractEvents[contractKey];
    if (!eventNames || eventNames.length === 0) return 0;

    if (!this.etherscanApiKey) {
      logger.warn('Etherscan API key not configured, skipping reindexContractEvents');
      return 0;
    }

    const contractAddress = contract.options.address?.toLowerCase();
    if (!contractAddress) return 0;

    const countBefore = this.health.eventsIndexed;
    logger.info(`Reindexing ${contractKey} events [${eventNames.join(',')}] from ${fromBlock} to ${toBlock}`);

    for (const eventName of eventNames) {
      await this.loadEventLogsViaEtherscan(contract, contractKey, contractAddress, eventName, fromBlock, toBlock);
    }

    return this.health.eventsIndexed - countBefore;
  }

  async renewContractCache(contractNameOrAddress) {
    try {
      let contractInfo = null;
      let contractAddress = null;

      if (contractNameOrAddress.startsWith('0x')) {
        contractAddress = contractNameOrAddress.toLowerCase();
        contractInfo = this.watchedAddresses.get(contractAddress);
      } else {
        for (const [addr, info] of this.watchedAddresses.entries()) {
          if (info.name.toLowerCase() === contractNameOrAddress.toLowerCase() || 
              info.contractKey === contractNameOrAddress) {
            contractAddress = addr;
            contractInfo = info;
            break;
          }
        }
      }

      if (!contractInfo) {
        throw new Error(`Contract not found: ${contractNameOrAddress}`);
      }

      logger.info(`Renewing cache for ${contractInfo.name} (${contractAddress})`);

      const contractKey = contractInfo.contractKey;
      const txsListKey = `txs:${contractAddress}:list`;
      
      const [eventsKeysByKey, eventsKeysByAddress] = await Promise.all([
        this.scanKeys(`events:${contractKey}:*`),
        this.scanKeys(`events:${contractAddress}:*`),
      ]);
      const eventsKeys = [...eventsKeysByKey, ...eventsKeysByAddress];
      
      const txHashes = await this.redisClient.zRange(txsListKey, 0, -1);
      
      for (const hash of txHashes) {
        await this.redisClient.del(`tx:${hash}`);
      }
      await this.redisClient.del(txsListKey);
      
      for (const eventKey of eventsKeys) {
        if (eventKey.endsWith(':list')) {
          const eventItemKeys = await this.redisClient.zRange(eventKey, 0, -1);
          for (const itemKey of eventItemKeys) {
            await this.redisClient.del(itemKey);
          }
        }
        await this.redisClient.del(eventKey);
      }

      await this.redisClient.del(`contract:${contractAddress}`);

      const callCacheKeys = await this.scanKeys(`contract:v2:${contractKey}:*`);
      if (callCacheKeys.length > 0) {
        await this.redisClient.del(callCacheKeys);
        logger.info(`Cleared ${callCacheKeys.length} method-call cache keys for ${contractKey}`);
      }

      // Зависимые контракты: balanceOf/allowance для DFC, ETH-balance и т.п.
      if (this.cacheDependencies?.[contractKey]?.length) {
        await Promise.all(
          this.cacheDependencies[contractKey].map(async depKey => {
            const depKeys = await this.scanKeys(`contract:v2:${depKey}:*`);
            if (depKeys.length > 0) {
              await this.redisClient.del(depKeys);
              logger.info(`Cleared ${depKeys.length} dependent cache keys for ${depKey}`);
            }
          })
        );
      }

      // ETH-баланс контракта тоже стал устаревшим после любой tx.
      await this.redisClient.del(`eth:balance:${contractAddress}`);

      logger.info(`Cleared cache for ${contractInfo.name}`);

      const currentBlock = await this.web3.eth.getBlockNumber();
      const toBlock = Number(currentBlock);
      const txCountBefore = this.health.transactionsIndexed;
      const eventsCountBefore = this.health.eventsIndexed;

      await this.loadTransactionsViaEtherscan(contractAddress, this.startBlock, toBlock);

      const eventNames = this.contractEvents[contractKey];
      const contractInstance = this.contracts.get(contractKey);

      if (eventNames && eventNames.length > 0 && contractInstance) {
        logger.info(`Loading events for ${contractInfo.name} via Etherscan (${eventNames.length} event types)...`);
        for (const eventName of eventNames) {
          await this.loadEventLogsViaEtherscan(contractInstance, contractKey, contractAddress, eventName, this.startBlock, toBlock);
        }
      }

      const txsAdded = this.health.transactionsIndexed - txCountBefore;
      const eventsAdded = this.health.eventsIndexed - eventsCountBefore;

      logger.info(`Cache renewed for ${contractInfo.name}: +${txsAdded} txs, +${eventsAdded} events`);

      // Event-dependencies: после write-tx на X (deposit/cdp/auction/...)
      // Transfer-события могли быть эмиттированы на Y (flatCoin/rule). Y живёт
      // на другом адресе → renewCache(X) их не захватывает. Здесь догоняем
      // события Y через getPastEvents (без чистки Y — чтобы не потерять его
      // историю транзакций; indexEvent идемпотентен по eventKey, так что
      // дубли не создадутся). Ограничиваемся startBlock..currentBlock, что
      // покрывает любой случай независимо от того, когда была сделана tx.
      const depsEventsBefore = this.health.eventsIndexed;
      const depList = this.eventDependencies[contractKey] || [];
      for (const depKey of depList) {
        try {
          await this.reindexContractEvents(depKey, this.startBlock, toBlock);
        } catch (error) {
          logger.warn(`Dep-reindex ${depKey} after renew(${contractKey}) failed: ${error.message}`);
        }
      }
      const depsEventsAdded = this.health.eventsIndexed - depsEventsBefore;
      if (depList.length > 0) {
        logger.info(`Event-deps for ${contractInfo.name} [${depList.join(',')}]: +${depsEventsAdded} events`);
      }

      return {
        success: true,
        contract: contractInfo.name,
        address: contractAddress,
        transactionsAdded: txsAdded,
        eventsAdded: eventsAdded + depsEventsAdded
      };

    } catch (error) {
      logger.error(`Failed to renew cache for ${contractNameOrAddress}:`, error);
      throw error;
    }
  }

  async shutdown() {
    logger.info('Shutting down Block Watcher...');

    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    if (this.pollingInterval)  clearInterval(this.pollingInterval);

    if (this.subscription) {
      await this.subscription.unsubscribe();
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    if (this.wss) {
      this.wss.close();
    }

    if (this.healthServer) {
      this.healthServer.stop();
    }

    logger.info('Block Watcher stopped');
    process.exit(0);
  }
}

// ===== Запуск =====

const watcher = new BlockWatcher();

watcher.init().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => watcher.shutdown());
process.on('SIGINT', () => watcher.shutdown());
