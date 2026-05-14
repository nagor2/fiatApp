'use strict';

const { Web3 } = require('web3');
const redis = require('redis');
const axios = require('axios');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

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

// ──────────────────────────────────────────────────────────────────────────────
// ABIs
// ──────────────────────────────────────────────────────────────────────────────

const DAO_ABI = [
  {
    type: 'function', name: 'addresses', stateMutability: 'view',
    inputs:  [{ name: '', type: 'string' }],
    outputs: [{ name: '', type: 'address' }]
  }
];

const ORACLE_ABI = [
  {
    type: 'event', name: 'priceUpdated',
    inputs: [{ name: 'id', type: 'uint16', indexed: false }]
  },
  {
    type: 'event', name: 'highVolatility',
    inputs: [{ name: 'id', type: 'uint16', indexed: false }]
  },
  {
    type: 'function', name: 'instruments', stateMutability: 'view',
    inputs:  [{ name: '', type: 'uint16' }],
    outputs: [{ name: 'price', type: 'uint256' }, { name: 'timeStamp', type: 'uint128' }]
  }
];

const CDP_ABI = [
  {
    type: 'event', name: 'liquidationStatusChanged',
    inputs: [
      { name: 'posID',             type: 'uint32', indexed: true  },
      { name: 'liquidationStatus', type: 'uint24', indexed: false }
    ]
  },
  {
    type: 'function', name: 'positions', stateMutability: 'view',
    inputs:  [{ name: '', type: 'uint32' }],
    outputs: [
      { name: 'owner',                        type: 'address' },
      { name: 'coinsMinted',                  type: 'uint256' },
      { name: 'ethAmountLocked',              type: 'uint256' },
      { name: 'liquidationStatus',            type: 'uint24'  },
      { name: 'liquidationAuctionID',         type: 'uint32'  },
      { name: 'markedOnLiquidationTimestamp', type: 'uint256' }
    ]
  }
];

const LIQUIDATION_LABELS = {
  0: 'OK',
  1: '🔴 Marked for liquidation',
  2: '💀 On liquidation',
  3: '🪦 Liquidated',
  4: '✅ Closed'
};

// ──────────────────────────────────────────────────────────────────────────────

const SUBSCRIBERS_FILE = path.join(__dirname, '../data/subscribers.json');

// How long without a new block before we consider block-watcher stale (ms)
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

class OracleAlertBot {
  constructor() {
    this.daoAddress        = process.env.DAO_ADDRESS;
    this.rpcHttpUrl        = (process.env.RPC_URL || '').split(',')[0].trim();
    this.rpcWsUrl          = process.env.RPC_WS_URL;
    this.telegramToken     = process.env.TELEGRAM_BOT_TOKEN;
    this.channelId         = process.env.TELEGRAM_CHANNEL_ID || null;
    this.alertThresholdPct = parseFloat(process.env.PRICE_ALERT_THRESHOLD_PCT || '3');
    this.coingeckoUrl      = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
    this.blockWatcherUrl   = process.env.BLOCK_WATCHER_URL || 'http://app-workers:3002';
    this.redisUrl          = process.env.REDIS_URL || 'redis://redis:6379';

    // contractKeys as registered in block-watcher (must match watched-addresses.json)
    this.bwOracleKey = process.env.BW_ORACLE_KEY || 'oracle';
    this.bwCdpKey    = process.env.BW_CDP_KEY    || 'cdp';

    // id -> { symbol, coingeckoId }
    this.instrumentMap = new Map();
    // coingeckoId -> { price, fetchedAt }
    this.marketPriceCache = new Map();

    // Set of subscribed chat IDs
    this.subscribers = new Set();
    this.updateOffset = 0;
    this.tgPollTimeout = null;

    // Source mode: 'redis' (primary, via block-watcher) | 'rpc' (fallback)
    this.mode = null; // set during init
    this.redisClient = null;
    this.web3 = null;
    this.oracleContract = null;
    this.cdpContract = null;
    this.oracleAddress = null;
    this.cdpAddress = null;

    // Last indexed block per event key (for Redis polling)
    this.lastSeenBlock = {};

    this.ethPollInterval    = null;
    this.redisPollInterval  = null;
    this.healthCheckInterval = null;
  }

  // ── startup ────────────────────────────────────────────────────────────────

  async init() {
    this._validateConfig();
    this._loadInstruments();
    this._loadSubscribers();

    await this._connectRpc(); // always connect RPC (needed for position lookups + fallback)
    await this._loadContracts();
    await this._connectRedis();

    const bwHealthy = await this._checkBlockWatcherHealth(/* silent */ true);
    await this._setMode(bwHealthy ? 'redis' : 'rpc', /* initial */ true);

    this._startHealthChecks();
    this._startTelegramPolling();

    logger.info('Oracle alert bot running');
    await this.broadcast(
      `🤖 <b>CryptoFiat Oracle Alert Bot started</b>\n` +
      `Mode: <b>${this.mode === 'redis' ? 'Redis (block-watcher)' : 'Direct RPC (block-watcher unreachable)'}</b>\n\n` +
      `/subscribe — get alerts in this chat\n` +
      `/unsubscribe — stop\n` +
      `/status — bot info`
    );
  }

  _validateConfig() {
    if (!this.telegramToken) throw new Error('Missing TELEGRAM_BOT_TOKEN');
    if (!this.daoAddress)    throw new Error('Missing DAO_ADDRESS');
    if (!this.rpcHttpUrl && !this.rpcWsUrl) throw new Error('Need RPC_URL or RPC_WS_URL');
    logger.info(`Alert threshold: ${this.alertThresholdPct}% | Block-watcher: ${this.blockWatcherUrl}`);
  }

  _loadInstruments() {
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/instruments.json'), 'utf8'));
      for (const inst of cfg.instruments) {
        this.instrumentMap.set(inst.id, { symbol: inst.symbol, decimals: inst.decimals || 6, coingeckoId: inst.coingeckoId || null });
      }
      logger.info(`Instruments: ${[...this.instrumentMap.values()].map(i => i.symbol).join(', ')}`);
    } catch (err) {
      logger.warn(`Could not load instruments.json: ${err.message}`);
    }
  }

  // ── subscriber persistence ─────────────────────────────────────────────────

  _loadSubscribers() {
    try {
      fs.mkdirSync(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
      if (fs.existsSync(SUBSCRIBERS_FILE)) {
        this.subscribers = new Set(JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8')));
        logger.info(`Loaded ${this.subscribers.size} subscriber(s)`);
      }
    } catch (err) {
      logger.warn(`Could not load subscribers: ${err.message}`);
    }
  }

  _saveSubscribers() {
    try { fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([...this.subscribers])); }
    catch (err) { logger.error(`Could not save subscribers: ${err.message}`); }
  }

  _addSubscriber(chatId) {
    if (this.subscribers.has(chatId)) return false;
    this.subscribers.add(chatId);
    this._saveSubscribers();
    logger.info(`New subscriber: ${chatId} (total: ${this.subscribers.size})`);
    return true;
  }

  _removeSubscriber(chatId) {
    if (!this.subscribers.has(chatId)) return false;
    this.subscribers.delete(chatId);
    this._saveSubscribers();
    return true;
  }

  // ── connections ────────────────────────────────────────────────────────────

  async _connectRpc() {
    this.web3 = this.rpcHttpUrl
      ? new Web3(this.rpcHttpUrl)
      : new Web3(new Web3.providers.WebsocketProvider(this.rpcWsUrl, {
          reconnect: { auto: true, delay: 5000, maxAttempts: 20 }
        }));
    const block = await this.web3.eth.getBlockNumber();
    logger.info(`RPC connected — block ${block}`);
  }

  async _connectRedis() {
    this.redisClient = redis.createClient({
      url: this.redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(100 * Math.pow(2, retries), 5000),
        connectTimeout: 10000,
      }
    });
    this.redisClient.on('error', err => logger.warn(`Redis error: ${err.message}`));
    this.redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    try {
      await this.redisClient.connect();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn(`Redis unavailable: ${err.message} — will stay in RPC mode`);
    }
  }

  async _loadContracts() {
    const dao = new this.web3.eth.Contract(DAO_ABI, this.daoAddress);
    this.oracleAddress = await dao.methods.addresses('oracle').call();
    this.cdpAddress    = await dao.methods.addresses('cdp').call();

    if (!this.oracleAddress || this.oracleAddress === '0x0000000000000000000000000000000000000000')
      throw new Error('Oracle address not set in DAO');

    this.oracleContract = new this.web3.eth.Contract(ORACLE_ABI, this.oracleAddress);
    this.cdpContract    = new this.web3.eth.Contract(CDP_ABI,    this.cdpAddress);
    logger.info(`Oracle: ${this.oracleAddress} | CDP: ${this.cdpAddress}`);
  }

  // ── block-watcher health check ─────────────────────────────────────────────

  // Returns true if block-watcher is healthy and current.
  async _checkBlockWatcherHealth(silent = false) {
    try {
      const res = await axios.get(`${this.blockWatcherUrl}/health`, { timeout: 5000 });
      const h = res.data;

      if (h.status !== 'healthy') {
        if (!silent) logger.warn(`Block-watcher status: ${h.status}`);
        return false;
      }

      if (h.lastNetworkBlockTime) {
        const staleMs = Date.now() - new Date(h.lastNetworkBlockTime).getTime();
        if (staleMs > STALE_THRESHOLD_MS) {
          if (!silent) logger.warn(`Block-watcher stale: last block ${Math.floor(staleMs / 60000)}m ago`);
          return false;
        }
      }

      return true;
    } catch (err) {
      if (!silent) logger.warn(`Block-watcher unreachable: ${err.message}`);
      return false;
    }
  }

  _startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this._checkBlockWatcherHealth();

      if (!healthy && this.mode === 'redis') {
        await this._setMode('rpc');
      } else if (healthy && this.mode === 'rpc') {
        await this._setMode('redis');
      }
    }, 30_000);
  }

  // ── mode switching ─────────────────────────────────────────────────────────

  async _setMode(newMode, initial = false) {
    if (this.mode === newMode) return;
    const prevMode = this.mode;
    this.mode = newMode;

    // Stop whatever was running
    if (this.ethPollInterval)   { clearInterval(this.ethPollInterval);   this.ethPollInterval   = null; }
    if (this.redisPollInterval) { clearInterval(this.redisPollInterval); this.redisPollInterval = null; }

    if (newMode === 'redis') {
      await this._initRedisPoller();
      if (!initial) {
        logger.info('Switched to Redis mode (block-watcher recovered)');
        await this.broadcast('✅ <b>Block-watcher recovered.</b> Switched back to Redis event mode.');
      }
    } else {
      await this._initRpcPoller();
      if (!initial) {
        logger.warn('Switched to direct RPC mode (block-watcher down)');
        await this.broadcast(
          '⚠️ <b>Block-watcher is down or stale!</b>\n' +
          'Oracle alert bot switched to direct RPC monitoring.\n' +
          'Check the block-watcher service.'
        );
      }
    }
  }

  // ── Redis event polling (primary) ──────────────────────────────────────────

  async _initRedisPoller() {
    // Initialise lastSeenBlock from current top of each sorted set
    // so we don't replay old events on mode switch.
    await this._initLastSeen(`events:${this.bwOracleKey}:priceUpdated:list`);
    await this._initLastSeen(`events:${this.bwOracleKey}:highVolatility:list`);
    await this._initLastSeen(`events:${this.bwCdpKey}:liquidationStatusChanged:list`);

    this.redisPollInterval = setInterval(
      () => this._pollRedis().catch(err => logger.error('Redis poll error:', err.message)),
      15_000
    );
    logger.info('Redis event polling started');
  }

  async _initLastSeen(listKey) {
    if (this.lastSeenBlock[listKey] !== undefined) return; // preserve across switches
    try {
      const top = await this.redisClient.zRange(listKey, 0, 0, { REV: true, WITHSCORES: true });
      this.lastSeenBlock[listKey] = top.length ? Number(top[0].score) : 0;
    } catch (_) {
      this.lastSeenBlock[listKey] = 0;
    }
  }

  async _pollRedis() {
    if (!this.redisClient?.isReady) return;

    await Promise.all([
      this._drainRedisEvents(
        `events:${this.bwOracleKey}:priceUpdated:list`,
        e => this._handlePriceUpdated(e)
      ),
      this._drainRedisEvents(
        `events:${this.bwOracleKey}:highVolatility:list`,
        e => this._handleHighVolatility(e)
      ),
      this._drainRedisEvents(
        `events:${this.bwCdpKey}:liquidationStatusChanged:list`,
        e => this._handleLiquidation(e)
      )
    ]);
  }

  async _drainRedisEvents(listKey, handler) {
    const since = this.lastSeenBlock[listKey] ?? 0;

    // Get all event keys with block score > lastSeen
    const entries = await this.redisClient.zRangeByScore(
      listKey, since + 1, '+inf', { WITHSCORES: true }
    );
    if (!entries.length) return;

    let maxBlock = since;
    for (const { value: eventKey, score } of entries) {
      try {
        const raw = await this.redisClient.get(eventKey);
        if (!raw) continue;
        const eventData = JSON.parse(raw);
        // Reshape to match the same format as web3 getPastEvents
        const ev = {
          returnValues: eventData.returnValues,
          blockNumber:  eventData.blockNumber,
          transactionHash: eventData.transactionHash
        };
        await handler(ev);
        if (Number(score) > maxBlock) maxBlock = Number(score);
      } catch (err) {
        logger.warn(`Failed to process event from ${listKey}: ${err.message}`);
      }
    }

    this.lastSeenBlock[listKey] = maxBlock;
  }

  // ── RPC polling (fallback) ─────────────────────────────────────────────────

  async _initRpcPoller() {
    const current = Number(await this.web3.eth.getBlockNumber());
    // Don't go back further than we've already seen (survives mode switches)
    Object.keys(this.lastSeenBlock).forEach(k => {
      if (this.lastSeenBlock[k] === 0) this.lastSeenBlock[k] = current;
    });
    this._rpcLastBlock = current;

    this.ethPollInterval = setInterval(
      () => this._pollRpc().catch(err => logger.error('RPC poll error:', err.message)),
      15_000
    );
    logger.info('Direct RPC polling started');
  }

  async _pollRpc() {
    const latest = Number(await this.web3.eth.getBlockNumber());
    if (latest <= this._rpcLastBlock) return;

    const from = this._rpcLastBlock + 1;
    const to   = Math.min(latest, this._rpcLastBlock + 50);

    const [priceEvents, volatilityEvents, liquidationEvents] = await Promise.all([
      this.oracleContract.getPastEvents('priceUpdated',             { fromBlock: from, toBlock: to }),
      this.oracleContract.getPastEvents('highVolatility',           { fromBlock: from, toBlock: to }),
      this.cdpContract   .getPastEvents('liquidationStatusChanged', { fromBlock: from, toBlock: to })
    ]);

    for (const e of priceEvents)       await this._handlePriceUpdated(e).catch(err => logger.error(err.message));
    for (const e of volatilityEvents)  await this._handleHighVolatility(e).catch(err => logger.error(err.message));
    for (const e of liquidationEvents) await this._handleLiquidation(e).catch(err => logger.error(err.message));

    this._rpcLastBlock = to;
  }

  // ── event handlers ─────────────────────────────────────────────────────────

  async _handlePriceUpdated(event) {
    const id   = Number(event.returnValues.id);
    const inst = this.instrumentMap.get(id) || { symbol: `Instrument #${id}`, coingeckoId: null };

    const decimals = inst.decimals ?? 6;
    logger.info(`priceUpdated id=${id} (${inst.symbol})`);

    // Fetch the now-live price from chain (priceUpdated only carries id)
    let newPrice = null;
    try {
      const onchain = await this.oracleContract.methods.instruments(id).call();
      newPrice = BigInt(onchain.price);
    } catch (err) {
      logger.warn(`Could not fetch on-chain price for id=${id}: ${err.message}`);
    }

    const lines = [
      `🔄 <b>Oracle price updated</b>`,
      `Instrument: <b>${inst.symbol}</b>`,
    ];

    if (newPrice !== null && newPrice > 0n) {
      lines.push(`New price: <code>$${this._fmtPrice(newPrice, decimals)}</code>`);
    }

    // Market comparison via CoinGecko
    if (inst.coingeckoId && newPrice !== null && newPrice > 0n) {
      try {
        const marketUsd = await this._fetchMarketPrice(inst.coingeckoId);
        if (marketUsd !== null) {
          const scale    = 10 ** decimals;
          const marketRaw = BigInt(Math.round(marketUsd * scale));
          const devPct    = this._devPct(marketRaw, newPrice);
          lines.push(`CoinGecko market: <code>$${marketUsd.toFixed(2)}</code>`);
          lines.push(`Deviation: <code>${devPct.toFixed(2)}%</code>`);
          if (devPct > this.alertThresholdPct) lines.push(`🚨 <b>MARKET DEVIATION ALERT: ${devPct.toFixed(2)}%!</b>`);
        }
      } catch (err) {
        logger.warn(`CoinGecko fetch failed: ${err.message}`);
      }
    }

    await this.broadcast(lines.join('\n'));
  }

  async _handleHighVolatility(event) {
    const id   = Number(event.returnValues.id);
    const inst = this.instrumentMap.get(id) || { symbol: `Instrument #${id}` };
    logger.warn(`highVolatility: ${inst.symbol}`);
    await this.broadcast(
      `⚡ <b>High volatility event</b>\n` +
      `Instrument: <b>${inst.symbol}</b>\n` +
      `Price moved beyond the volatility barrier set in DAO.`
    );
  }

  async _handleLiquidation(event) {
    const posID  = Number(event.returnValues.posID);
    const status = Number(event.returnValues.liquidationStatus);
    const label  = LIQUIDATION_LABELS[status] || `Status ${status}`;

    if (status === 0 || status === 4) return;

    logger.info(`liquidationStatusChanged posID=${posID} → ${label}`);

    let ownerLine = '';
    try {
      const pos = await this.cdpContract.methods.positions(posID).call();
      ownerLine = `\nOwner: <code>${pos.owner}</code>`;
    } catch (err) {
      logger.warn(`Could not fetch position ${posID}: ${err.message}`);
    }

    await this.broadcast(
      `<b>CDP Liquidation update</b>\n` +
      `Position: <b>#${posID}</b>\n` +
      `Status: <b>${label}</b>${ownerLine}`
    );
  }

  // ── market price ───────────────────────────────────────────────────────────

  async _fetchMarketPrice(coingeckoId) {
    const cached = this.marketPriceCache.get(coingeckoId);
    if (cached && Date.now() - cached.fetchedAt < 60_000) return cached.price;
    const res   = await axios.get(
      `${this.coingeckoUrl}/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
      { timeout: 10_000 }
    );
    const price = res.data?.[coingeckoId]?.usd ?? null;
    if (price != null) this.marketPriceCache.set(coingeckoId, { price, fetchedAt: Date.now() });
    return price;
  }

  // ── broadcast & Telegram ───────────────────────────────────────────────────

  async broadcast(text) {
    const targets = new Set(this.subscribers);
    if (this.channelId) targets.add(this.channelId);
    await Promise.allSettled([...targets].map(id => this._sendTo(id, text)));
  }

  async _sendTo(chatId, text) {
    try {
      await axios.post(
        `https://api.telegram.org/bot${this.telegramToken}/sendMessage`,
        { chat_id: chatId, text, parse_mode: 'HTML' },
        { timeout: 10_000 }
      );
    } catch (err) {
      const code = err.response?.data?.error_code;
      if (code === 403 || code === 400) {
        logger.warn(`Chat ${chatId} unreachable (${code}), removing`);
        this._removeSubscriber(chatId);
      } else {
        logger.error(`Telegram send to ${chatId} failed: ${err.message}`);
      }
    }
  }

  // ── Telegram long-polling for commands ────────────────────────────────────

  _startTelegramPolling() {
    const poll = async () => {
      try {
        const res = await axios.get(
          `https://api.telegram.org/bot${this.telegramToken}/getUpdates` +
          `?offset=${this.updateOffset}&timeout=25&allowed_updates=["message"]`,
          { timeout: 30_000 }
        );
        for (const update of res.data.result || []) {
          this.updateOffset = update.update_id + 1;
          await this._handleTelegramUpdate(update);
        }
      } catch (err) {
        if (!err.message?.includes('ECONNRESET') && !err.message?.includes('timeout'))
          logger.error(`Telegram poll error: ${err.message}`);
      }
      this.tgPollTimeout = setTimeout(poll, 1000);
    };
    poll();
  }

  async _handleTelegramUpdate(update) {
    const msg = update.message;
    if (!msg?.text) return;
    const chatId = msg.chat.id;
    const text   = msg.text.split('@')[0].trim();

    if (text === '/subscribe' || text === '/start') {
      const added = this._addSubscriber(chatId);
      await this._sendTo(chatId,
        added
          ? '✅ <b>Subscribed!</b> You will receive all CryptoFiat protocol alerts.\n\nSend /unsubscribe to stop.'
          : '👍 You are already subscribed.'
      );
    } else if (text === '/unsubscribe' || text === '/stop') {
      const removed = this._removeSubscriber(chatId);
      await this._sendTo(chatId,
        removed ? '👋 <b>Unsubscribed.</b>' : 'You were not subscribed.'
      );
    } else if (text === '/status') {
      await this._sendTo(chatId,
        `🤖 <b>Bot status</b>\n` +
        `Mode: <b>${this.mode === 'redis' ? '🟢 Redis (block-watcher)' : '🟡 Direct RPC (fallback)'}</b>\n` +
        `Subscribers: <b>${this.subscribers.size}</b>\n` +
        `Oracle: <code>${this.oracleAddress}</code>\n` +
        `CDP: <code>${this.cdpAddress}</code>`
      );
    } else if (text === '/help') {
      await this._sendTo(chatId,
        `<b>Commands:</b>\n` +
        `/subscribe — get alerts in this chat\n` +
        `/unsubscribe — stop\n` +
        `/status — bot info and current mode`
      );
    }
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  _devPct(a, b) {
    if (a === 0n) return 0;
    const diff = a > b ? a - b : b - a;
    return (Number(diff) / Number(a)) * 100;
  }

  _fmtPrice(raw, decimals = 6) {
    const f = Number(raw) / 10 ** decimals;
    return f < 1 ? f.toFixed(6) : f.toFixed(2);
  }

  // ── shutdown ───────────────────────────────────────────────────────────────

  async shutdown() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.ethPollInterval)     clearInterval(this.ethPollInterval);
    if (this.redisPollInterval)   clearInterval(this.redisPollInterval);
    if (this.tgPollTimeout)       clearTimeout(this.tgPollTimeout);
    if (this.redisClient?.isReady) await this.redisClient.quit();
    logger.info('Shutting down');
    process.exit(0);
  }
}

// ── entrypoint ─────────────────────────────────────────────────────────────

const bot = new OracleAlertBot();
bot.init().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => bot.shutdown());
process.on('SIGINT',  () => bot.shutdown());
