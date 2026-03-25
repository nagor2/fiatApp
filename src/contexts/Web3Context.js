import React, { createContext, useContext, useState, useEffect } from 'react';
import Web3 from 'web3';
import config from '../utils/config';
import {getPastEventsCached} from "../utils/cacheApi";

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
  const [ethPriceEtherscan, setEthPriceEtherscan] = useState(null);
  const [ethPriceUniswap, setEthPriceUniswap] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initWeb3 = async () => {
    let web3Instance;
    
    try {
      if (window.ethereum && Number(await window.ethereum.request({ method: "eth_chainId" })) === 1) {
        web3Instance = new Web3(window.ethereum);
        console.log('using window web3');
      } else {
        web3Instance = new Web3(config.rpc);
        console.log('using rivet');
      }
    } catch (error) {
      console.log('Error initializing web3, using fallback RPC:', error.message);
      web3Instance = new Web3(config.rpc);
    }
    
    setWeb3(web3Instance);
    return web3Instance;
  };

  const initContracts = async (web3Instance) => {
    const contractsObj = {};
    const dao = new web3Instance.eth.Contract(config.daoABI, config.daoAddress);
    contractsObj['dao'] = dao;

    dao.methods.addresses('rule').call().then((result) => {
      contractsObj['rule'] = new web3Instance.eth.Contract(config.ruleABI, result);
      setContracts(prev => ({ ...prev, rule: contractsObj['rule'] }));
    });

    dao.methods.addresses("flatCoin").call().then((result) => {
      contractsObj['flatCoin'] = new web3Instance.eth.Contract(config.stableCoinABI, result);
      setContracts(prev => ({ ...prev, flatCoin: contractsObj['flatCoin'] }));
    });

    dao.methods.addresses("cdp").call().then((result) => {
      contractsObj['cdp'] = new web3Instance.eth.Contract(config.cdpABI, result);
      setContracts(prev => ({ ...prev, cdp: contractsObj['cdp'] }));
    });

    dao.methods.addresses('oracle').call().then(async (oracleAddress) => {
      contractsObj['oracle'] = new web3Instance.eth.Contract(config.oracleABI, oracleAddress);
      
      // Получаем текущую цену
      contractsObj['oracle'].methods.getPrice('eth').call().then((price) => {
        console.log("price: " + price);
        setEthPrice((parseFloat(price) / 10 ** 6).toFixed(2));
      });
      
      // Получаем последнее событие priceUpdated для ETH из cache
      try {
        const events = await getPastEventsCached(
          contractsObj['oracle'],
          'priceUpdated',
          {fromBlock: 0, toBlock: 'latest'},
          web3Instance
        );
        
        if (events.length > 0) {
          // Берём последнее событие
          const lastEvent = events[events.length - 1];
          const blockNum = typeof lastEvent.blockNumber === 'bigint' 
            ? Number(lastEvent.blockNumber) 
            : lastEvent.blockNumber;
          const block = await web3Instance.eth.getBlock(blockNum);
          const blockTimestamp = typeof block.timestamp === 'bigint' 
            ? Number(block.timestamp) 
            : block.timestamp;
          const timestamp = new Date(blockTimestamp * 1000);
          
          console.log("Last ETH price update:", timestamp, "block:", blockNum);
          setEthPriceLastUpdate(timestamp);
        }
      } catch (err) {
        console.error('Failed to get price update events:', err);
      }
      
      setContracts(prev => ({ ...prev, oracle: contractsObj['oracle'] }));
    });

    dao.methods.addresses("deposit").call().then((result) => {
      contractsObj['deposit'] = new web3Instance.eth.Contract(config.depositABI, result);
      setContracts(prev => ({ ...prev, deposit: contractsObj['deposit'] }));
    });

    dao.methods.addresses("basket").call().then((result) => {
      contractsObj['basket'] = new web3Instance.eth.Contract(config.cartABI, result);
      setContracts(prev => ({ ...prev, basket: contractsObj['basket'] }));
    });

    dao.methods.addresses("auction").call().then((result) => {
      contractsObj['auction'] = new web3Instance.eth.Contract(config.auctionABI, result);
      setContracts(prev => ({ ...prev, auction: contractsObj['auction'] }));
    });

    setContracts(contractsObj);
    return contractsObj;
  };

  const getAccount = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum
        .request({ method: "eth_requestAccounts" })
        .catch((err) => {
          if (err.code === 4001) {
            console.log("Please connect to MetaMask.");
          } else {
            console.error(err);
          }
        });

      if (accounts && accounts.length > 0) {
        console.log(accounts[0]);
        setAccount(accounts[0]);
        setWalletConnected(true);
      }
    } else {
      console.log('no window ethereum');
      console.log('try to connect to walletConnect');
    }
  };

  const fetchEthPriceEtherscan = async () => {
    if (!config.etherscanApiKey) {
      return;
    }

    try {
      const url = `${config.etherscanApiUrl}?chainid=1&module=stats&action=ethprice&apikey=${config.etherscanApiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        const price = parseFloat(data.result.ethusd);
        setEthPriceEtherscan(price);
        console.log('✅ ETH price from Etherscan:', price);
      }
    } catch (err) {
      console.error('Failed to fetch Etherscan ETH price:', err);
    }
  };

  const fetchEthPriceUniswap = async () => {
    try {
      const { getEthPriceInUsd } = await import('../utils/uniswap-quoter');
      const result = await getEthPriceInUsd();
      setEthPriceUniswap(result.priceInUSD);
      console.log('✅ ETH price from Uniswap:', result.priceInUSD);
    } catch (err) {
      console.error('Failed to fetch Uniswap ETH price:', err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const web3Instance = await initWeb3();
      await initContracts(web3Instance);
      setIsInitialized(true);
    };
    
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    fetchEthPriceEtherscan();
    fetchEthPriceUniswap();
    
    const interval = setInterval(() => {
      fetchEthPriceEtherscan();
      fetchEthPriceUniswap();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isInitialized]);

  const value = {
    web3,
    account,
    contracts,
    walletConnected,
    ethPrice,
    ethPriceLastUpdate,
    ethPriceEtherscan,
    ethPriceUniswap,
    isInitialized,
    getAccount,
    fetchEthPriceEtherscan,
    fetchEthPriceUniswap,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
