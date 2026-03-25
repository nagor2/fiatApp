import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const HomePage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice } = useWeb3();
  const navigate = useNavigate();

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

export default HomePage;
