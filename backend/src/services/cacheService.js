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
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.enabled = false;
    }
  }

  async get(key) {
    if (!this.enabled || !this.client) return null;

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
    if (!this.enabled || !this.client) return false;

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
    if (!this.enabled || !this.client) return false;

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
    if (!this.enabled || !this.client) return false;

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
