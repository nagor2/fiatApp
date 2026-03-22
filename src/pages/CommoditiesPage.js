import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MyPanel from '../components/MyPanel';
import Worker from '../components/Worker';
import config from '../utils/config';

const CommoditiesPage = ({ emitter }) => {
  const { web3, contracts, account, walletConnected, ethPrice } = useWeb3();
  const navigate = useNavigate();
  const { commodityName } = useParams();
  
  useEffect(() => {
    if (commodityName && contracts && contracts['basket']) {
      // Загружаем все commodities и ищем нужный
      contracts['basket'].methods.itemsCount().call().then(async (count) => {
        for (let i = 1; i <= count; i++) {
          const item = await contracts['basket'].methods.items(i).call();
          const normalizedName = commodityName.replace(/-/g, '/'); // URL: XAU-USD → XAU/USD
          
          if (item.symbol === normalizedName || item.symbol.toLowerCase() === normalizedName.toLowerCase()) {
            emitter.emit('change-state', ['Commodities', item.symbol, i, null]);
            break;
          }
        }
      }).catch(err => console.error('Failed to find commodity:', err));
    }
  }, [commodityName, contracts, emitter]);

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
          initialOpen={!!commodityName}
        />
      </div>
    </>
  );
};

export default CommoditiesPage;
