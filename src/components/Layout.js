import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import ConnectButton from './ConnectButton';
import { Address, ETHPrice } from '../utils/utils.js';

const Layout = () => {
  const { account, walletConnected, ethPrice, ethPriceLastUpdate, ethPriceEtherscan, ethPriceUniswap, getAccount } = useWeb3();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="App">
      <div className="App-header">
        <ETHPrice 
          ethPrice={ethPrice} 
          lastUpdate={ethPriceLastUpdate}
          ethPriceEtherscan={ethPriceEtherscan}
          ethPriceUniswap={ethPriceUniswap}
        />
        <img src='/img/logo.png' alt="DotFlat Logo" />
        &nbsp;
        <h2 align="center" className="pointer" onClick={handleLogoClick}>
          DotFlat
        </h2>
        {walletConnected ? (
          <Address account={account} />
        ) : (
          <ConnectButton getAccount={getAccount} name='connect wallet' />
        )}
      </div>

      <div className="content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
