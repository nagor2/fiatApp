import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const CreditsPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice } = useWeb3();
  const navigate = useNavigate();
  const { id } = useParams();
  
  useEffect(() => {
    if (id && contracts) {
      setTimeout(() => {
        emitter.emit('change-state', ['Loans', 'debt position', id, null]);
      }, 100);
    }
  }, [id, contracts, emitter]);

  return (
    <MainLayout emitter={emitter} creditsInitialOpen={!!id}>
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

export default CreditsPage;
