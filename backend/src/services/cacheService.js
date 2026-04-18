const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.enabled = process.env.CACHE_ENABLED !== 'false';
    this.ttl = parseInt(process.env.CACHE_TTL || '60', 10);
  }

  async connect() {
    if (!this.enabled) {
      logger.info('Cache disabled');
      return;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://redis.dotflat.svc.cluster.local:6379',
        socket: {
          // Экспоненциальный backoff, максимум 30с.
          // Без стратегии node-redis v4 за ~20 попыток сдаётся и уходит в
          // "closed", а пока идёт — спамит ENOTFOUND по 10 раз в секунду.
          // Мы хотим тихую паузу, чтобы контейнер не жёг CPU/логи, пока
          // Service или Secret не поправлены администратором.
          reconnectStrategy: (retries) => {
            const delay = Math.min(1000 * 2 ** Math.min(retries, 10), 30000);
            if (retries === 0 || retries % 5 === 0) {
              logger.warn(
                `Redis reconnect attempt #${retries + 1}, next delay ${delay}ms`
              );
            }
            return delay;
          },
          connectTimeout: 10000,
        },
      });

      this.client.on('error', (err) => {
        // Логируем только когда клиент был в рабочем состоянии — иначе
        // цикл переподключения зальёт логи одинаковыми сообщениями.
        if (this.client && this.client.isReady) {
          logger.error('Redis Client Error:', err.message);
        }
      });

      this.client.on('ready', () => {
        logger.info('Redis ready');
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
      });

      await this.client.connect();
    } catch (error) {
      // Если Redis недоступен на старте — не валим backend: API-эндпоинты
      // не критичны к кэшу (get/set всё равно проверяют isReady и молча
      // возвращают null/false). Это даёт админу время починить Service
      // REDIS_URL без потери доступности /health и /api/contracts.
      logger.error('Failed to connect to Redis (cache disabled):', error.message);
      this.enabled = false;
    }
  }

  async get(key) {
    if (!this.enabled || !this.client || !this.client.isReady) return null;

    try {
      const data = await this.client.get(key);
      if (data) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(data);
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.enabled || !this.client || !this.client.isReady) return false;

    try {
      const expiry = ttl || this.ttl;
      await this.client.setEx(key, expiry, JSON.stringify(value));
      logger.debug(`Cache SET: ${key} (TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.enabled || !this.client || !this.client.isReady) return false;

    try {
      await this.client.del(key);
      logger.debug(`Cache DEL: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache del error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.enabled || !this.client || !this.client.isReady) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache invalidate pattern error for ${pattern}:`, error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      logger.info('Disconnected from Redis');
    }
  }

  generateKey(contract, method, ...args) {
    const argsHash = args.length > 0 ? `:${args.join(':')}` : '';
    return `contract:${contract}:${method}${argsHash}`;
  }
}

module.exports = new CacheService();
