import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const CommoditiesPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice } = useWeb3();
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
    <MainLayout emitter={emitter}>
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
    </MainLayout>
  );
};

export default CommoditiesPage;
