#!/usr/bin/env node
/**
 * Fetches contract ABIs from Etherscan and writes them to src/config/abi/.
 * Run once after deploying new contracts:
 *   ETHERSCAN_API_KEY=xxx node backend/scripts/fetch-abis.js
 */

const fs   = require('fs');
const path = require('path');
const { Web3 } = require('web3');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config  = require('../src/config/config');
const ABI_DIR = path.join(__dirname, '../src/config/abi');
const API_KEY = process.env.ETHERSCAN_API_KEY;
const RPC_URL = process.env.RPC_URL || 'https://ethereum-rpc.publicnode.com';

if (!API_KEY) {
  console.error('ETHERSCAN_API_KEY is required');
  process.exit(1);
}

async function fetchAbi(address) {
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getabi&address=${address}&apikey=${API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== '1') throw new Error(`${data.message}: ${data.result}`);
  return JSON.parse(data.result);
}

function write(name, abi) {
  fs.writeFileSync(path.join(ABI_DIR, `${name}.json`), JSON.stringify(abi, null, 2));
  console.log(`  ${name}.json  (${abi.length} entries)`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(ABI_DIR, { recursive: true });

  console.log(`DAO: ${config.daoAddress}`);
  const daoAbi = await fetchAbi(config.daoAddress);
  write('dao', daoAbi);

  const web3 = new Web3(RPC_URL);
  const dao  = new web3.eth.Contract(daoAbi, config.daoAddress);

  for (const name of config.contracts) {
    await sleep(250); // Etherscan rate limit: 5 req/s on free tier
    try {
      const address = await dao.methods.addresses(name).call();
      console.log(`${name}: ${address}`);
      await sleep(250);
      const abi = await fetchAbi(address);
      write(name, abi);
    } catch (e) {
      console.error(`  FAILED ${name}: ${e.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
