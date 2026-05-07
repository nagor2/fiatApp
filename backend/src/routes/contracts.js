const express = require('express');
const fs      = require('fs');
const path    = require('path');
const contractService = require('../services/contractService');
const appConfig       = require('../config/config');
const logger          = require('../utils/logger');

const router  = express.Router();
const ABI_DIR = path.join(__dirname, '../config/abi');

// Cached in memory once all contract addresses are resolved
let _contractsPayload = null;

function loadContractsPayload() {
  // Return cached payload only if all dynamic contracts have addresses
  if (_contractsPayload && appConfig.contracts.every(n => _contractsPayload[n]?.address)) {
    return _contractsPayload;
  }

  const result = {};

  // DAO — address from config, known statically
  const daoAbi = JSON.parse(fs.readFileSync(path.join(ABI_DIR, 'dao.json'), 'utf8'));
  result.dao = { address: appConfig.daoAddress, abi: daoAbi };

  // Dynamic contracts — address from contractService (loaded at startup from DAO)
  for (const name of appConfig.contracts) {
    const abiFile = path.join(ABI_DIR, `${name}.json`);
    if (!fs.existsSync(abiFile)) continue;
    const abi     = JSON.parse(fs.readFileSync(abiFile, 'utf8'));
    const address = contractService.contracts?.[name]?._address || null;
    result[name]  = { address, abi };
  }

  // Only freeze the cache when all addresses are known
  if (appConfig.contracts.every(n => result[n]?.address)) {
    _contractsPayload = result;
  }

  return result;
}

// GET /api/contracts/abis — addresses + ABIs for all contracts.
// Used by the frontend once on app load to initialize web3 contract instances.
// Cache-Control: immutable — ABIs only change when contracts are redeployed.
router.get('/abis', (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.json(loadContractsPayload());
  } catch (err) {
    logger.error('Failed to load contracts payload:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
