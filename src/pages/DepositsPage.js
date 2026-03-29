import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const DepositsPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice, ethPriceUniswap } = useWeb3();
  const navigate = useNavigate();
  const { depositId } = useParams();
  
  useEffect(() => {
    if (depositId && contracts) {
      setTimeout(() => {
        emitter.emit('change-state', ['Deposits', 'deposit', depositId, null]);
      }, 100);
    }
  }, [depositId, contracts, emitter]);

  return (
    <MainLayout emitter={emitter} depositsInitialOpen={!!depositId}>
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

export default DepositsPage;
