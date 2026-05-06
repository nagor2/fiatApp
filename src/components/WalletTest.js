import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { UNISWAP_CONFIG } from '../utils/uniswap-config';

const dfcTokenInfo = {
  address: UNISWAP_CONFIG.TOKENS.DFC,
  symbol: UNISWAP_CONFIG.TOKEN_INFO.DFC.symbol,
  name: UNISWAP_CONFIG.TOKEN_INFO.DFC.name,
  decimals: UNISWAP_CONFIG.TOKEN_INFO.DFC.decimals,
  chainId: UNISWAP_CONFIG.CHAIN_ID,
  uniswapUrl: `https://app.uniswap.org/explore/tokens/ethereum/${UNISWAP_CONFIG.TOKENS.DFC}`,
  wethAddress: UNISWAP_CONFIG.TOKENS.WETH,
  poolId: UNISWAP_CONFIG.POOLS.DFC_ETH_V4,
};

function WalletTest() {
  const { web3, ethPrice, ethPriceEtherscan, ethPriceUniswap } = useWeb3();
  const [wallet, setWallet] = useState(null);
  const [dfcPrice, setDfcPrice] = useState(null);
  const [poolInfo, setPoolInfo] = useState(null);
  const [swaps, setSwaps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const dfcPriceInUSD = dfcPrice && ethPriceUniswap 
    ? (dfcPrice.priceInETH * ethPriceUniswap).toFixed(4)
    : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        subscribeToWalletConnectEvents,
      } = await import('../utils/walletconnect');
      if (cancelled) return;
      subscribeToWalletConnectEvents(
        (accounts) => {
          console.log('Account changed:', accounts);
          if (accounts.length === 0) {
            setWallet(null);
          }
        },
        (chainId) => {
          console.log('Chain changed:', chainId);
        },
        () => {
          console.log('Disconnected');
          setWallet(null);
        }
      );
    })();
    return () => { cancelled = true; };
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const { connectWithWalletConnect } = await import('../utils/walletconnect');
      const result = await connectWithWalletConnect();
      setWallet(result);
      console.log('Connected:', result);
    } catch (err) {
      setError(err.message);
      console.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { disconnectWalletConnect } = await import('../utils/walletconnect');
      await disconnectWalletConnect();
      setWallet(null);
    } catch (err) {
      setError(err.message);
      console.error('Disconnect error:', err);
    }
  };

  const handleGetPrice = async () => {
    try {
      setLoading(true);
      setError(null);
      const { getDfcPriceInEth } = await import('../utils/uniswap-quoter');
      const price = await getDfcPriceInEth();
      setDfcPrice(price);
      console.log('DFC Price:', price);
    } catch (err) {
      setError(err.message);
      console.error('Price error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetPoolInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const { getPoolLiquidityDirect } = await import('../utils/pool-liquidity-direct');
      const info = await getPoolLiquidityDirect(ethPriceUniswap);
      setPoolInfo(info);
      console.log('Pool Info:', info);
    } catch (err) {
      setError(err.message);
      console.error('Pool info error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetSwaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const { getPoolSwaps } = await import('../utils/pool-liquidity-direct');
      const swapsData = await getPoolSwaps(20);
      setSwaps(swapsData);
      console.log('Pool Swaps:', swapsData);
    } catch (err) {
      setError(err.message);
      console.error('Swaps error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>WalletConnect & Uniswap Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>DFC Token Info</h2>
        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          <p><strong>Address:</strong> {dfcTokenInfo.address}</p>
          <p><strong>Symbol:</strong> {dfcTokenInfo.symbol}</p>
          <p><strong>Name:</strong> {dfcTokenInfo.name}</p>
          <p><strong>Decimals:</strong> {dfcTokenInfo.decimals}</p>
          <p><strong>Chain ID:</strong> {dfcTokenInfo.chainId}</p>
          <p><strong>Pool ID:</strong> {dfcTokenInfo.poolId.substring(0, 20)}...</p>
          <p>
            <a href={dfcTokenInfo.uniswapUrl} target="_blank" rel="noopener noreferrer">
              View on Uniswap
            </a>
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>WalletConnect</h2>
        {!wallet ? (
          <div>
            <p>Not connected</p>
            <button 
              onClick={handleConnect}
              disabled={loading}
              style={{ 
                padding: '10px 20px', 
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                backgroundColor: '#4BB781',
                color: 'white',
                border: 'none',
                borderRadius: '8px'
              }}
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <div>
            <p><strong>Address:</strong></p>
            <p style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}>
              {wallet.address}
            </p>
            <button 
              onClick={handleDisconnect}
              style={{ 
                padding: '10px 20px', 
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                marginTop: '10px'
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>ETH Prices (Global Store)</h2>
        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <p><strong>ETH (Oracle Contract):</strong> {ethPrice ? `$${ethPrice}` : 'Loading...'}</p>
          <p><strong>ETH (Etherscan):</strong> {ethPriceEtherscan ? `$${ethPriceEtherscan.toFixed(2)}` : 'Loading...'}</p>
          <p><strong>ETH (Uniswap V3):</strong> {ethPriceUniswap ? `$${ethPriceUniswap.toFixed(2)}` : 'Loading...'}</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Prices are fetched automatically every 60 seconds and stored in Web3Context
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Uniswap V4 Price</h2>
        <button 
          onClick={handleGetPrice}
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            marginBottom: '10px'
          }}
        >
          {loading ? 'Loading...' : 'Get DFC Price'}
        </button>
        
        {dfcPrice && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <p><strong>1 DFC =</strong> {dfcPrice.priceInETH.toFixed(8)} ETH</p>
            {dfcPriceInUSD && (
              <p><strong>1 DFC =</strong> ${dfcPriceInUSD} USD</p>
            )}
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>Source: {dfcPrice.source}</p>
            {dfcPrice.gasEstimate && (
              <p style={{ fontSize: '12px', color: '#666' }}>Gas estimate: {dfcPrice.gasEstimate}</p>
            )}
            {ethPriceUniswap && (
              <p style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                Calculated using ETH price from Uniswap V3: ${ethPriceUniswap.toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Pool Liquidity Info</h2>
        <button 
          onClick={handleGetPoolInfo}
          disabled={loading || !ethPriceUniswap || !web3}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            cursor: (loading || !ethPriceUniswap || !web3) ? 'not-allowed' : 'pointer',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            marginBottom: '10px'
          }}
        >
          {loading ? 'Loading...' : 'Get Pool Info'}
        </button>
        
        {!web3 && (
          <p style={{ fontSize: '12px', color: '#f57c00', marginTop: '5px' }}>
            Waiting for Web3 initialization...
          </p>
        )}
        {web3 && !ethPriceUniswap && (
          <p style={{ fontSize: '12px', color: '#f57c00', marginTop: '5px' }}>
            Waiting for ETH price from Uniswap...
          </p>
        )}
        
        {poolInfo && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Pool Composition</h3>
              <p><strong>ETH in pool:</strong> {poolInfo.amountETH ? poolInfo.amountETH.toFixed(4) : '0'} ETH</p>
              <p><strong>DFC in pool:</strong> {poolInfo.amountDFC ? poolInfo.amountDFC.toFixed(2) : '0'} DFC</p>
              {poolInfo.tvlUSD > 0 && (
                <p style={{ fontSize: '18px', marginTop: '10px' }}>
                  <strong>Total TVL:</strong> <span style={{ color: '#2e7d32' }}>${poolInfo.tvlUSD.toFixed(2)}</span>
                </p>
              )}
            </div>
            
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Technical Data</h3>
              <p><strong>Liquidity:</strong> {poolInfo.liquidity}</p>
              <p><strong>sqrtPriceX96:</strong> {poolInfo.sqrtPriceX96}</p>
              <p><strong>Tick:</strong> {poolInfo.tick}</p>
              <p><strong>Fee:</strong> {poolInfo.fee} ({poolInfo.fee / 10000}%)</p>
              {poolInfo.blockNumber && (
                <p><strong>Block:</strong> {poolInfo.blockNumber}</p>
              )}
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>Source: {poolInfo.source}</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Pool Swaps History</h2>
        <button 
          onClick={handleGetSwaps}
          disabled={loading}
          style={{ 
            padding: '10px 20px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {loading ? 'Loading...' : 'Get Swaps (last 20)'}
        </button>
        
        {swaps && swaps.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <p><strong>Found {swaps.length} swaps</strong></p>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {swaps.reverse().map((swap, idx) => {
                const amount0 = Number(swap.amount0) / 1e18;
                const amount1 = Number(swap.amount1) / 1e18;
                const isETHtoDF = amount0 > 0;
                
                return (
                  <div key={idx} style={{ 
                    padding: '10px', 
                    marginBottom: '8px', 
                    backgroundColor: isETHtoDF ? '#e8f5e9' : '#fff3e0',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <div><strong>Block:</strong> {swap.blockNumber}</div>
                    <div><strong>Direction:</strong> {isETHtoDF ? 'ETH → DFC' : 'DFC → ETH'}</div>
                    <div><strong>Amount0 (ETH):</strong> {amount0.toFixed(6)}</div>
                    <div><strong>Amount1 (DFC):</strong> {amount1.toFixed(2)}</div>
                    <div><strong>Tick:</strong> {swap.tick}</div>
                    <div style={{ marginTop: '5px', fontSize: '10px', color: '#666', wordBreak: 'break-all' }}>
                      <strong>Tx:</strong> {swap.txHash}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {swaps && swaps.length === 0 && (
          <p style={{ marginTop: '10px', color: '#666' }}>No swaps found in last 50,000 blocks</p>
        )}
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Connect Wallet" to connect via WalletConnect</li>
          <li>Click "Get DFC Price" to fetch current DFC price from Uniswap V4</li>
          <li>Click "Get Pool Info" to view liquidity information</li>
        </ol>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          Note: Make sure you have a WalletConnect Project ID configured in your environment variables.
        </p>
      </div>
    </div>
  );
}

export default WalletTest;
