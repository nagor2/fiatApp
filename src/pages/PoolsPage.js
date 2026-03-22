import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MyPanel from '../components/MyPanel';
import Worker from '../components/Worker';
import config from '../utils/config';

const PoolsPage = ({ emitter }) => {
  const { web3, contracts, account, walletConnected, ethPrice } = useWeb3();
  const navigate = useNavigate();
  const { token1, token2 } = useParams();

  return (
    <>
      <div className="region_left">
        {walletConnected ? (
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
            />
            <MyPanel
              emitter={emitter}
              navigate={navigate}
              web3={web3}
              bgColor="#FFFFFF"
              contracts={contracts}
              account={account}
              content={config.Credits}
            />
            <MyPanel
              emitter={emitter}
              navigate={navigate}
              web3={web3}
              bgColor="#FFFFFF"
              contracts={contracts}
              account={account}
              content={config.Deposits}
            />
          </>
        ) : ''}
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Auctions}
          products={config.auctions}
        />
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Pools}
          products={config.pools}
          initialOpen={!!(token1 && token2)}
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

      <div className="region_middle">
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          explorer={config.explorer}
          contracts={contracts}
          displayContent={true}
          content={config.about}
          account={account}
          ethPrice={ethPrice}
        />
      </div>

      <div className="region_left">
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Contracts}
          products={config.contractsList}
        />
        <MyPanel
          emitter={emitter}
          navigate={navigate}
          web3={web3}
          bgColor="#FFFFFF"
          contracts={contracts}
          content={config.Commodities}
        />
      </div>
    </>
  );
};

export default PoolsPage;
