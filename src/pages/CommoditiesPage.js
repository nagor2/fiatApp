import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';
import { cachedContractCall } from '../utils/cachedContractCall';

const CommoditiesPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice, ethPriceUniswap } = useWeb3();
  const navigate = useNavigate();
  const { commodityName } = useParams();

  useEffect(() => {
    const loadCommodity = async () => {
      if (commodityName && contracts && contracts['basket']) {
        try {
          console.log('🔄 CommoditiesPage: Loading commodity...');

          const itemsCountRaw = await cachedContractCall(
            'basket', 'itemsCount', [], contracts['basket']
          );
          const count = parseInt(itemsCountRaw);

          for (let i = 1; i <= count; i++) {
            const item = await cachedContractCall(
              'basket', 'items', [i], contracts['basket']
            );
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
