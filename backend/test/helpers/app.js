/**
 * Builds a testable Express app with all routes wired up,
 * but with Redis and contract services replaced by Jest mocks.
 *
 * Each test file requires this helper after setting up module mocks.
 */

// Silence logger in tests
jest.mock('../../src/utils/logger', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const express = require('express');

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    const cacheService = require('../../src/services/cacheService');
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      cache: cacheService.enabled ? 'enabled' : 'disabled',
    });
  });

  app.use('/api/contracts', require('../../src/routes/contracts'));
  app.use('/api/0x',        require('../../src/routes/zeroex'));
  app.use('/api/ethprice',  require('../../src/routes/ethprice'));
  app.use('/api/prices',    require('../../src/routes/prices'));

  return app;
}

module.exports = { buildApp };
