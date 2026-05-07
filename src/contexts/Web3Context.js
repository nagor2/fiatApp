import React, { createContext, useContext, useState, useEffect } from 'react';
import Web3 from 'web3';
import config from '../utils/config';
import {getPastEventsCached} from "../utils/cacheApi";
import { usePrices } from './PricesContext';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [contracts, setContracts] = useState({});
  const [walletConnected, setWalletConnected] = useState(false);
  const [ethPrice, setEthPrice] = useState('');
  const [ethPriceLastUpdate, setEthPriceLastUpdate] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const prices = usePrices();
  const ethPriceUniswap   = prices?.ethUsdUniswap   ?? null;
  const ethPriceEtherscan = prices?.ethUsdEtherscan ?? null;

  const initWeb3 = async () => {
    let web3Instance;

    try {
      if (window.ethereum && Number(await window.ethereum.request({ method: "eth_chainId" })) === 1) {
        web3Instance = new Web3(window.ethereum);
        console.log('using window web3 (MetaMask)');
      } else {
        web3Instance = new Web3(config.rpc);
        console.log('using RPC proxy:', config.rpc);
      }
    } catch (error) {
      console.log('Error initializing web3, falling back to RPC proxy:', error.message);
      web3Instance = new Web3(config.rpc);
    }

    setWeb3(web3Instance);
    return web3Instance;
  };

  const initContracts = async (web3Instance) => {
    const resp = await fetch('/api/contracts/abis');
    if (!resp.ok) throw new Error('Failed to fetch contract ABIs');
    const abis = await resp.json();

    const contractsObj = {};
    for (const [name, { address, abi }] of Object.entries(abis)) {
      if (address && abi) {
        contractsObj[name] = new web3Instance.eth.Contract(abi, address);
      }
    }

    if (contractsObj.oracle) {
      contractsObj.oracle.methods.getPrice('eth').call().then((price) => {
        console.log("price: " + price);
        setEthPrice((parseFloat(price) / 10 ** 6).toFixed(2));
      }).catch(() => {});

      getPastEventsCached(
        contractsObj.oracle,
        'priceUpdated',
        { fromBlock: 0, toBlock: 'latest' },
        web3Instance,
      ).then(async (events) => {
        if (events.length > 0) {
          const lastEvent = events[events.length - 1];
          const blockNum = typeof lastEvent.blockNumber === 'bigint'
            ? Number(lastEvent.blockNumber)
            : lastEvent.blockNumber;
          const block = await web3Instance.eth.getBlock(blockNum);
          const blockTimestamp = typeof block.timestamp === 'bigint'
            ? Number(block.timestamp)
            : block.timestamp;
          console.log("Last ETH price update block:", blockNum);
          setEthPriceLastUpdate(new Date(blockTimestamp * 1000));
        }
      }).catch(err => console.error('Failed to get price update events:', err));
    }

    setContracts(contractsObj);
    return contractsObj;
  };

  const getAccount = async () => {
    console.log('getAccount called');

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setWalletConnected(true);
          return;
        }

        const newAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (newAccounts && newAccounts.length > 0) {
          setAccount(newAccounts[0]);
          setWalletConnected(true);
          return;
        }
      } catch (err) {
        console.log('MetaMask extension connection failed or rejected:', err.message);
      }
    }

    try {
      const { connectWithWalletConnect } = await import(/* webpackPrefetch: true */ '../utils/walletconnect');
      const result = await connectWithWalletConnect();
      if (result && result.address) {
        setAccount(result.address);
        setWalletConnected(true);
      }
    } catch (error) {
      console.error('Connection error:', error.message);
    }
  };

  const disconnectWallet = async () => {
    try {
      try {
        const { disconnectWalletConnect, isWalletConnectConnected } = await import('../utils/walletconnect');
        if (isWalletConnectConnected()) {
          await disconnectWalletConnect();
        }
      } catch (err) {
        console.log('WalletConnect not connected or error:', err.message);
      }
      setAccount('');
      setWalletConnected(false);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const web3Instance = await initWeb3();
      await initContracts(web3Instance);

      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setWalletConnected(true);
          }

          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts && accounts.length > 0) {
              setAccount(accounts[0]);
              setWalletConnected(true);
            } else {
              setAccount('');
              setWalletConnected(false);
            }
          });

          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        } catch (err) {
          console.log('No saved MetaMask connection');
        }
      }

      setIsInitialized(true);
    };

    initialize();
  }, []);

  const value = {
    web3,
    account,
    contracts,
    walletConnected,
    ethPrice,
    ethPriceLastUpdate,
    ethPriceUniswap,
    ethPriceEtherscan,
    isInitialized,
    getAccount,
    disconnectWallet,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
