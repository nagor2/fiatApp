require('dotenv').config();
const express = require('express');
const cors = require('cors');
const contractService = require('./services/contractService');
const cacheService = require('./services/cacheService');
const contractsRouter = require('./routes/contracts');
const zeroexRouter = require('./routes/zeroex');
const ethpriceRouter = require('./routes/ethprice');
const pricesRouter = require('./routes/prices');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cache: cacheService.enabled ? 'enabled' : 'disabled',
  });
});

app.use('/api/contracts', contractsRouter);
app.use('/api/0x', zeroexRouter);
app.use('/api/ethprice', ethpriceRouter);
app.use('/api/prices', pricesRouter);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Startup
async function start() {
  try {
    logger.info('Starting DotFlat Backend API...');
    
    // Подключаемся к Redis
    await cacheService.connect();
    
    // Инициализируем контракты
    await contractService.init();
    
    // Запускаем сервер
    app.listen(PORT, () => {
      logger.info(`Backend API listening on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`CDP state: http://localhost:${PORT}/api/contracts/cdp/state`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await cacheService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await cacheService.disconnect();
  process.exit(0);
});

start();
