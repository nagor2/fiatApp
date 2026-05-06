/**
 * RPC Provider с автоматическим fallback
 * Если один провайдер недоступен (429, timeout, CORS), автоматически пробует следующий
 */

import { JsonRpcProvider } from 'ethers';

const RPC_PROVIDERS = {
  PROXY:      typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : '/api/rpc',
  PUBLICNODE: 'https://ethereum-rpc.publicnode.com',
  LLAMARPC:   'https://eth.llamarpc.com',
};

const DEFAULT_RPC_URL = RPC_PROVIDERS.PROXY;
const FALLBACK_RPC_URLS = [
  RPC_PROVIDERS.PUBLICNODE,
  RPC_PROVIDERS.LLAMARPC,
];

const providerCache = new Map();

function getProvider(rpcUrl) {
  if (!providerCache.has(rpcUrl)) {
    const provider = new JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
    providerCache.set(rpcUrl, provider);
  }
  return providerCache.get(rpcUrl);
}

export async function withFallback(requestFn, options = {}) {
  const { timeout = 10000 } = options;
  
  const urls = [DEFAULT_RPC_URL, ...FALLBACK_RPC_URLS];
  let lastError = null;
  
  for (const rpcUrl of urls) {
    try {
      console.log(`🔄 Trying RPC: ${rpcUrl}`);
      const provider = getProvider(rpcUrl);
      
      const result = await Promise.race([
        requestFn(provider),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);
      
      console.log(`✅ Success with ${rpcUrl}`);
      return result;
      
    } catch (error) {
      lastError = error;
      const errorMsg = error.message || error.toString();
      
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        console.warn(`⚠️ Rate limit on ${rpcUrl}, trying next...`);
        continue;
      }
      
      if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
        console.warn(`⚠️ Timeout on ${rpcUrl}, trying next...`);
        continue;
      }
      
      if (errorMsg.includes('CORS') || errorMsg.includes('NetworkError')) {
        console.warn(`⚠️ CORS error on ${rpcUrl}, trying next...`);
        continue;
      }
      
      console.error(`❌ Error on ${rpcUrl}:`, errorMsg);
      continue;
    }
  }
  
  console.error('❌ All RPC providers unavailable');
  throw lastError || new Error('All RPC providers unavailable');
}

export function getRpcProvider() {
  return getProvider(DEFAULT_RPC_URL);
}

export async function createContract(address, abi, rpcUrl = null) {
  const { Contract } = await import('ethers');
  const provider = rpcUrl ? getProvider(rpcUrl) : getRpcProvider();
  return new Contract(address, abi, provider);
}

const rpcProviderModule = {
  withFallback,
  getRpcProvider,
  createContract,
};

export default rpcProviderModule;
