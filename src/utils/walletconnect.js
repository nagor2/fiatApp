/**
 * WalletConnect интеграция через Web3Modal (Reown AppKit)
 */

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';
import { BrowserProvider } from 'ethers';

let web3modal = null;
let walletConnectProvider = null;
let isInitialized = false;

const WALLETCONNECT_PROJECT_ID = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID';
const CHAIN_ID = 1;
const CHAIN_NAME = 'Ethereum';
const EXPLORER_URL = 'https://etherscan.io';

/**
 * Инициализирует Web3Modal для WalletConnect
 */
export function initWalletConnect() {
  if (isInitialized || typeof window === 'undefined') {
    return web3modal;
  }

  try {
    if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID === 'demo-project-id-12345' || WALLETCONNECT_PROJECT_ID === 'YOUR_PROJECT_ID_HERE') {
      console.error('❌ WalletConnect Project ID not configured!');
      console.error('🔗 Get Project ID: https://cloud.walletconnect.com/');
      throw new Error('WalletConnect Project ID not configured. Get a free Project ID at https://cloud.walletconnect.com/');
    }

    console.log('🔄 Initializing Web3Modal...');
    console.log(`   Project ID: ${WALLETCONNECT_PROJECT_ID.slice(0, 8)}...`);

    const metadata = {
      name: 'Dotflat',
      description: 'Dotflat Token Exchange',
      url: window.location.origin,
      icons: [`${window.location.origin}/favicon.ico`]
    };

    const ethersConfig = defaultConfig({
      metadata,
      enableEIP6963: true,
      enableInjected: true,
      enableCoinbase: true,
      defaultChainId: CHAIN_ID
    });

    web3modal = createWeb3Modal({
      ethersConfig,
      chains: [{
        chainId: CHAIN_ID,
        name: CHAIN_NAME,
        currency: 'ETH',
        explorerUrl: EXPLORER_URL,
        rpcUrl: 'https://ethereum-rpc.publicnode.com'
      }],
      projectId: WALLETCONNECT_PROJECT_ID,
      enableAnalytics: false,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#4BB781',
        '--w3m-border-radius-master': '8px'
      }
    });

    isInitialized = true;
    console.log('✅ Web3Modal successfully initialized');
    
    return web3modal;
    
  } catch (error) {
    console.error('❌ Error initializing Web3Modal:', error);
    
    if (error.message && error.message.includes('403')) {
      console.error('💡 Hint: Make sure Project ID is configured correctly');
    }
    
    throw error;
  }
}

/**
 * Открывает модальное окно для подключения кошелька
 * @returns {Promise<{address: string, provider: any, signer: any}>}
 */
export async function connectWithWalletConnect() {
  try {
    if (!web3modal) {
      initWalletConnect();
    }

    console.log('🔄 Opening WalletConnect modal...');
    
    const connectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 120000);
      
      const unsubscribe = web3modal.subscribeState((state) => {
        console.log('📊 WalletConnect state:', state);
        
        if (state.open === false && walletConnectProvider) {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });
    });
    
    await web3modal.open();
    
    const checkProvider = setInterval(() => {
      const provider = web3modal.getWalletProvider();
      if (provider) {
        walletConnectProvider = provider;
        clearInterval(checkProvider);
      }
    }, 500);
    
    await connectionPromise;
    
    clearInterval(checkProvider);
    
    if (!walletConnectProvider) {
      throw new Error('Provider not received from Web3Modal');
    }
    
    const provider = new BrowserProvider(walletConnectProvider);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    console.log('✅ Connected via WalletConnect:', address);
    
    return { address, provider, signer };
    
  } catch (error) {
    console.error('❌ Error connecting WalletConnect:', error);
    throw error;
  }
}

/**
 * Отключает WalletConnect
 */
export async function disconnectWalletConnect() {
  try {
    if (web3modal) {
      await web3modal.disconnect();
      walletConnectProvider = null;
      console.log('🔌 WalletConnect disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting WalletConnect:', error);
  }
}

/**
 * Получает текущий статус подключения
 * @returns {boolean}
 */
export function isWalletConnectConnected() {
  return walletConnectProvider !== null && web3modal?.getIsConnected();
}

/**
 * Получает провайдер WalletConnect
 * @returns {any}
 */
export function getWalletConnectProvider() {
  return walletConnectProvider;
}

/**
 * Подписывается на события WalletConnect
 * @param {Function} onAccountChange - Callback при смене аккаунта
 * @param {Function} onChainChange - Callback при смене сети
 * @param {Function} onDisconnect - Callback при отключении
 */
export function subscribeToWalletConnectEvents(onAccountChange, onChainChange, onDisconnect) {
  if (!walletConnectProvider) return;

  walletConnectProvider.on('accountsChanged', (accounts) => {
    console.log('🔄 WalletConnect: account changed', accounts);
    if (onAccountChange) onAccountChange(accounts);
  });

  walletConnectProvider.on('chainChanged', (chainId) => {
    console.log('🔄 WalletConnect: chain changed', chainId);
    if (onChainChange) onChainChange(chainId);
  });

  walletConnectProvider.on('disconnect', () => {
    console.log('🔌 WalletConnect: disconnected');
    if (onDisconnect) onDisconnect();
  });
}

const walletConnectModule = {
  initWalletConnect,
  connectWithWalletConnect,
  disconnectWalletConnect,
  isWalletConnectConnected,
  getWalletConnectProvider,
  subscribeToWalletConnectEvents,
};

export default walletConnectModule;
