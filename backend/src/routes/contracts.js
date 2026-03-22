const express = require('express');
const contractService = require('../services/contractService');
const logger = require('../utils/logger');

const router = express.Router();

// Получить состояние CDP контракта
router.get('/cdp/state', async (req, res) => {
  try {
    const state = await contractService.getCDPState();
    res.json({
      success: true,
      data: state,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching CDP state:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Получить состояние DAO
router.get('/dao/state', async (req, res) => {
  try {
    const state = await contractService.getDAOState();
    res.json({
      success: true,
      data: state,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching DAO state:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Получить состояние Basket
router.get('/basket/state', async (req, res) => {
  try {
    const state = await contractService.getBasketState();
    res.json({
      success: true,
      data: state,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching Basket state:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Универсальный endpoint для вызова методов контрактов
router.get('/:contract/:method', async (req, res) => {
  try {
    const { contract, method } = req.params;
    const args = req.query.args ? JSON.parse(req.query.args) : [];
    
    const result = await contractService.callMethod(contract, method, args);
    
    res.json({
      success: true,
      data: result,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error calling ${req.params.contract}.${req.params.method}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Инвалидация кэша для контракта (для admin/debug)
router.post('/:contract/invalidate', async (req, res) => {
  try {
    const { contract } = req.params;
    await contractService.invalidateContract(contract);
    
    res.json({
      success: true,
      message: `Cache invalidated for contract: ${contract}`,
    });
  } catch (error) {
    logger.error(`Error invalidating cache for ${req.params.contract}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
