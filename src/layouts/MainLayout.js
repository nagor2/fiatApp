import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MyPanel from '../components/MyPanel';
import Worker from '../components/Worker';
import config from '../utils/config';

const MainLayout = ({ 
  children, 
  emitter, 
  poolsInitialOpen, 
  contractsInitialOpen,
  balancesInitialOpen,
  creditsInitialOpen,
  depositsInitialOpen,
  auctionsInitialOpen
}) => {
  const { web3, contracts, account, walletConnected } = useWeb3();
  const navigate = useNavigate();

  return (
    <>
      {/* Левая панель */}
      <div className="region_left">
        {walletConnected && (
          <>
            <MyPanel
              emitter={emitter}
              navigate={navigate}
              web3={web3}
              bgColor="#FFFFFF"
              contracts={contracts}
              account={account}
              content={config.Balances}
              products={config.balances}
              initialOpen={balancesInitialOpen}
            />
            <MyPanel
              emitter={emitter}
              navigate={navigate}
              web3={web3}
              bgColor="#FFFFFF"
              contracts={contracts}
              account={account}
              content={config.Credits}
              initialOpen={creditsInitialOpen}
            />
            <MyPanel
              emitter={emitter}
              navigate={navigate}
              web3={web3}
              bgColor="#FFFFFF"
              contracts={contracts}
              account={account}
              content={config.Deposits}
              initialOpen={depositsInitialOpen}
            />
          </>
        )}
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Contracts}
          products={config.contractsList}
          initialOpen={contractsInitialOpen}
        />
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Auctions}
          products={config.auctions}
          initialOpen={auctionsInitialOpen}
        />
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Pools}
          products={config.pools}
          initialOpen={poolsInitialOpen}
        />
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Workers}
        >
          {config.workers.map(worker => (
            <Worker 
              key={worker.id}
              title={worker.title}
              name={worker.name}
              icon="/img/robot.png"
              healthUrl={worker.healthUrl}
              onClick={() => navigate('/block-watcher')}
            />
          ))}
        </MyPanel>
      </div>

      {/* Центральный контент (уникальный для каждой страницы) */}
      <div className="region_middle">
        {children}
      </div>
    </>
  );
};

export default MainLayout;
