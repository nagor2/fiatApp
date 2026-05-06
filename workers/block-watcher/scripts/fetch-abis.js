#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Web3 } = require('web3');

// Конфигурация
const RPC_URL = process.env.RPC_HTTP_URL || 'https://ethereum.publicnode.com';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const ETHERSCAN_API_URL = 'https://api.etherscan.io/v2/api';
const CHAIN_ID = 1; // Ethereum Mainnet

// Загружаем конфигурацию контрактов
const configPath = path.join(__dirname, '../config/watched-addresses.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Загружаем DAO ABI
const daoAbiPath = path.join(__dirname, '../config/dao-abi.json');
const daoAbi = JSON.parse(fs.readFileSync(daoAbiPath, 'utf8'));

async function fetchABI(address, name) {
  try {
    console.log(`\n📥 Fetching ABI for ${name} (${address})...`);
    
    const response = await axios.get(ETHERSCAN_API_URL, {
      params: {
        chainid: CHAIN_ID,
        module: 'contract',
        action: 'getabi',
        address: address,
        apikey: ETHERSCAN_API_KEY
      }
    });
    
    if (response.data.status !== '1') {
      throw new Error(`API error: ${response.data.message} - ${response.data.result}`);
    }
    
    const abi = JSON.parse(response.data.result);
    console.log(`   ✓ Loaded ${abi.length} ABI items`);
    
    // Подсчет типов
    const types = abi.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
    console.log(`   Functions: ${types.function || 0}, Events: ${types.event || 0}, Constructor: ${types.constructor || 0}`);
    
    return abi;
    
  } catch (error) {
    console.error(`   ✗ Failed to fetch ABI for ${name}:`, error.message);
    return null;
  }
}

async function getContractAddress(daoContract, contractName) {
  try {
    const address = await daoContract.methods.addresses(contractName).call();
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return address;
  } catch (error) {
    console.error(`   ✗ Failed to get address for ${contractName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Contract ABI Fetcher\n');
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Etherscan API: ${ETHERSCAN_API_URL}`);
  console.log(`Chain ID: ${CHAIN_ID}\n`);
  
  // Подключаемся к Web3
  console.log('🔌 Connecting to Web3...');
  const web3 = new Web3(RPC_URL);
  const daoContract = new web3.eth.Contract(daoAbi, config.dao.address);
  console.log(`   ✓ Connected to DAO at ${config.dao.address}\n`);
  
  const outputDir = path.join(__dirname, '../config');
  
  // Обрабатываем динамические контракты
  for (const contractName of config.dynamicContracts) {
    console.log(`\n📦 Processing ${contractName}...`);
    
    // Получаем адрес из DAO
    const address = await getContractAddress(daoContract, contractName);
    
    if (!address) {
      console.log(`   ⚠️  Skipped: zero address or failed to fetch`);
      continue;
    }
    
    console.log(`   Address: ${address}`);
    
    // Загружаем ABI через Etherscan
    const abi = await fetchABI(address, contractName);
    
    if (abi) {
      // Сохраняем в файл
      const outputPath = path.join(outputDir, `${contractName}-abi.json`);
      fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2), 'utf8');
      console.log(`   💾 Saved to: ${outputPath}`);
    }
    
    // Задержка между запросами чтобы не словить rate limit
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n✅ Done!\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
