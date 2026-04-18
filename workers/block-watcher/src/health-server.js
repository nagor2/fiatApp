const http = require('http');

class HealthServer {
  constructor(port, getHealthStatus, getWatchedContracts, getContractTransactions, getContractEvents, renewContractCache, web3, redisClient, contracts, settings = {}) {
    this.port = port;
    this.getHealthStatus = getHealthStatus;
    this.getWatchedContracts = getWatchedContracts;
    this.getContractTransactions = getContractTransactions;
    this.getContractEvents = getContractEvents;
    this.renewContractCache = renewContractCache;
    this.web3 = web3;
    this.redisClient = redisClient;
    this.contracts = contracts;
    this.server = null;
    this.cacheTTL = settings.cacheTTL !== undefined ? settings.cacheTTL : 0; // TTL для кэша contract calls (0 = без TTL, event-driven инвалидация)
    console.log(`HealthServer: cacheTTL = ${this.cacheTTL} (from settings: ${settings.cacheTTL})`);
  }
  
  async handleRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;
      
      console.log(`[${req.method}] ${pathname}`);
      
      if (pathname === '/health') {
        const health = this.getHealthStatus();

        // Статистика кэша из Redis — опциональна.
        // ВАЖНО: liveness probe k8s ждёт ответа за timeoutSeconds; если Redis лежит
        // и мы здесь зависаем — kubelet решит, что под мёртв и убьёт его
        // (Exit 137 / CrashLoopBackOff). Поэтому:
        //  1) не трогаем redis, если клиент не ready (isReady=false);
        //  2) даже когда ready — оборачиваем info() в короткий таймаут.
        if (this.redisClient && this.redisClient.isReady) {
          try {
            const infoPromise = this.redisClient.info('stats');
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('redis info timeout')), 1000)
            );
            const info = await Promise.race([infoPromise, timeoutPromise]);
            const lines = info.split('\n');

            let hits = 0;
            let misses = 0;

            for (const line of lines) {
              if (line.startsWith('keyspace_hits:')) {
                hits = parseInt(line.split(':')[1]);
              } else if (line.startsWith('keyspace_misses:')) {
                misses = parseInt(line.split(':')[1]);
              }
            }

            const total = hits + misses;
            const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

            health.cache = {
              hits,
              misses,
              total,
              hitRate: `${hitRate}%`
            };
          } catch (error) {
            console.error('Failed to get cache stats:', error.message);
            health.cache = { error: error.message };
          }
        } else {
          health.cache = { error: 'redis not ready' };
        }

        // /health всегда отвечает 200 — это liveness, а не readiness.
        // Отдельный readiness-эндпоинт ниже говорит k8s, готовы ли мы к трафику.
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
        return;
      }

      if (pathname === '/ready') {
        // Readiness: контейнер готов принимать трафик только если Redis поднят.
        // k8s readinessProbe использует это, чтобы вывести под из Service, пока
        // Redis лежит (и избежать 503 на фронте без убийства пода).
        const redisReady = !!(this.redisClient && this.redisClient.isReady);
        const payload = {
          ready: redisReady,
          redis: redisReady ? 'ready' : 'not_ready',
          timestamp: new Date().toISOString(),
        };
        res.writeHead(redisReady ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
        return;
      }
      
      if (pathname === '/api/contracts') {
        const contracts = await this.getWatchedContracts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ contracts }));
        return;
      }
      
      if (pathname.startsWith('/api/transactions/')) {
        // GET /api/transactions/{address}?page=1&limit=25
        const contractAddress = pathname.split('/api/transactions/')[1];
        if (!contractAddress) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Contract address required' }));
          return;
        }
        
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '25');
        
        // Валидация limit
        const allowedLimits = [10, 25, 50, 100];
        const validLimit = allowedLimits.includes(limit) ? limit : 25;
        
        const result = await this.getContractTransactions(contractAddress.toLowerCase(), { page, limit: validLimit });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          address: contractAddress,
          ...result
        }));
        return;
      }
      
      if (pathname.startsWith('/api/events/')) {
        // GET /api/events/{address}?event=Transfer&page=1&limit=25
        const contractAddress = pathname.split('/api/events/')[1];
        if (!contractAddress) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Contract address required' }));
          return;
        }
        
        const eventName = url.searchParams.get('event') || null;
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '25');
        
        // Валидация limit
        const allowedLimits = [10, 25, 50, 100];
        const validLimit = allowedLimits.includes(limit) ? limit : 25;
        
        const result = await this.getContractEvents(contractAddress.toLowerCase(), eventName, { page, limit: validLimit });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          address: contractAddress,
          eventName: eventName || 'all',
          ...result
        }));
        return;
      }
      
      if (pathname.startsWith('/api/renewCache/')) {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.' }));
          return;
        }

        const contractName = pathname.split('/api/renewCache/')[1];
        if (!contractName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Contract name/address required' }));
          return;
        }

        try {
          const result = await this.renewContractCache(contractName);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      // Универсальный endpoint для вызова методов контрактов с кэшированием
      // GET /api/call/{contractKey}/{method}?args=["arg1","arg2"]
      if (pathname.startsWith('/api/eth/getBalance')) {
        // GET /api/eth/getBalance?address=0x...
        const address = url.searchParams.get('address');
        
        if (!address) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Address parameter required' }));
          return;
        }
        
        try {
          const { value, fromCache } = await this.getEthBalance(address);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            method: 'eth.getBalance',
            address,
            result: value,
            cached: fromCache,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`eth.getBalance error (${address}):`, error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false,
            error: error.message 
          }));
        }
        return;
      }
      
      if (pathname.startsWith('/api/call/')) {
        const pathParts = pathname.split('/').filter(p => p);
        if (pathParts.length < 4) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid path. Use: /api/call/{contractKey}/{method}' }));
          return;
        }
        
        const contractKey = pathParts[2]; // api/call/{contractKey}/...
        const methodName = pathParts[3];  // api/call/{contractKey}/{method}
        
        try {
          const argsParam = url.searchParams.get('args');
          const args = argsParam ? JSON.parse(argsParam) : [];
          
          const { value, fromCache } = await this.callContractMethod(contractKey, methodName, args);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            contract: contractKey,
            method: methodName,
            args,
            result: value,
            cached: fromCache,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`Contract call error (${contractKey}.${methodName}):`, error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false,
            error: error.message 
          }));
        }
        return;
      }
      
      res.writeHead(404);
      res.end('Not Found');
      
    } catch (error) {
      console.error('Request handling error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }
  
  start() {
    this.server = http.createServer(async (req, res) => {
      // CORS headers для frontend доступа
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      
      await this.handleRequest(req, res);
    });
    
    this.server.listen(this.port, () => {
      console.log(`Health server listening on port ${this.port}`);
    });
  }
  
  async getEthBalance(address) {
    const cacheKey = `eth:balance:${address.toLowerCase()}`;
    
    // Проверяем кэш
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return { value: cached, fromCache: true };
      }
    } catch (error) {
      console.error(`Cache read error for ${cacheKey}:`, error.message);
    }
    
    // Получаем баланс через web3
    const balance = await this.web3.eth.getBalance(address);
    const balanceStr = balance.toString();
    
    // Сохраняем в кэш
    try {
      // Для балансов ETH используем короткий TTL или event-driven инвалидацию
      if (this.cacheTTL > 0) {
        await this.redisClient.setEx(cacheKey, this.cacheTTL, balanceStr);
      } else {
        // Без TTL - инвалидация при новых транзакциях
        await this.redisClient.set(cacheKey, balanceStr);
      }
    } catch (error) {
      console.error(`Cache write error for ${cacheKey}:`, error.message);
    }
    
    return { value: balanceStr, fromCache: false };
  }

  async callContractMethod(contractKey, methodName, args = []) {
    // Формируем cache key
    const argsHash = args.length > 0 ? `:${args.join(':')}` : '';
    const cacheKey = `contract:${contractKey}:${methodName}${argsHash}`;
    
    // Проверяем кэш
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        return { value: result, fromCache: true };
      }
    } catch (error) {
      console.error(`Cache read error for ${cacheKey}:`, error.message);
    }
    
    // Получаем контракт (this.contracts это Map: contractKey -> Web3Contract)
    const contractInstance = this.contracts.get(contractKey);
    if (!contractInstance) {
      throw new Error(`Contract ${contractKey} not found`);
    }
    
    // Вызываем метод
    if (!contractInstance.methods[methodName]) {
      throw new Error(`Method ${methodName} not found in contract ${contractKey}`);
    }
    
    const result = await contractInstance.methods[methodName](...args).call();
    
    // Сохраняем в кэш (с BigInt replacer)
    try {
      const serialized = JSON.stringify(result, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
      
      // Если TTL = 0, сохраняем без expiration (инвалидация только event-driven)
      if (this.cacheTTL > 0) {
        await this.redisClient.setEx(cacheKey, this.cacheTTL, serialized);
      } else {
        await this.redisClient.set(cacheKey, serialized);
      }
    } catch (error) {
      console.error(`Cache write error for ${cacheKey}:`, error.message);
    }
    
    // Конвертируем BigInt для ответа
    const responseResult = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    return { value: responseResult, fromCache: false };
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = HealthServer;
