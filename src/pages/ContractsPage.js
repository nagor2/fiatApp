import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const ContractsPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice } = useWeb3();
  const navigate = useNavigate();
  const { contractName } = useParams();
  
  useEffect(() => {
    if (contractName && contracts) {
      const contract = config.contractsList?.find(c => 
        c.title === contractName || 
        c.title.toLowerCase() === contractName.toLowerCase()
      );
      
      if (contract) {
        setTimeout(() => {
          emitter.emit('change-state', ['Contracts', contract.title, contract.id, contract.hash]);
        }, 100);
      }
    }
  }, [contractName, contracts, emitter]);

  return (
    <MainLayout emitter={emitter} contractsInitialOpen={!!contractName}>
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

export default ContractsPage;
