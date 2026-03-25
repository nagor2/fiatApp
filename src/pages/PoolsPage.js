import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const PoolsPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice } = useWeb3();
  const navigate = useNavigate();
  const { token1, token2 } = useParams();
  
  useEffect(() => {
    if (token1 && token2 && config.pools && contracts) {
      const pool = config.pools.find(p => 
        p.name === `${token1}/${token2}` ||
        p.name === `${token2}/${token1}`
      );
      
      if (pool) {
        setTimeout(() => {
          emitter.emit('change-state', ['Pools', pool.title, pool.id, pool.hash]);
        }, 100);
      }
    }
  }, [token1, token2, contracts, emitter]);

  return (
    <MainLayout emitter={emitter} poolsInitialOpen={!!(token1 && token2)}>
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

export default PoolsPage;
