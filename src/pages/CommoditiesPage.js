import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

const CommoditiesPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice, ethPriceUniswap } = useWeb3();
  const navigate = useNavigate();
  const { commodityName } = useParams();
  
  useEffect(() => {
    const loadCommodity = async () => {
      if (commodityName && contracts && contracts['basket']) {
        try {
          console.log('🔄 CommoditiesPage: Loading commodity via Block Watcher API...');
          
          const itemsCountRes = await fetch(`${BLOCK_WATCHER_API}/api/call/basket/itemsCount`);
          const itemsCountData = await itemsCountRes.json();
          const count = parseInt(itemsCountData.result);

          for (let i = 1; i <= count; i++) {
            const itemRes = await fetch(`${BLOCK_WATCHER_API}/api/call/basket/items?args=[${i}]`);
            const itemData = await itemRes.json();
            const item = itemData.result;
            const normalizedName = commodityName.replace(/-/g, '/');
            
            if (item.symbol === normalizedName || item.symbol.toLowerCase() === normalizedName.toLowerCase()) {
              emitter.emit('change-state', ['Commodities', item.symbol, i, null]);
              console.log(`✅ CommoditiesPage: Found commodity ${item.symbol}`);
              break;
            }
          }
        } catch (err) {
          console.error('❌ CommoditiesPage: Failed to find commodity:', err);
        }
      }
    };
    
    loadCommodity();
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
        ethPriceUniswap={ethPriceUniswap}
      />
    </MainLayout>
  );
};

export default CommoditiesPage;
