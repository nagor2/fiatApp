import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import MainLayout from '../layouts/MainLayout';
import MyPanel from '../components/MyPanel';
import config from '../utils/config';

const AuctionsPage = ({ emitter }) => {
  const { web3, contracts, account, ethPrice, ethPriceUniswap } = useWeb3();
  const navigate = useNavigate();
  const { auctionId } = useParams();
  
  useEffect(() => {
    if (auctionId && contracts) {
      setTimeout(() => {
        emitter.emit('change-state', ['Auctions', 'auction', auctionId, null]);
      }, 100);
    }
  }, [auctionId, contracts, emitter]);

  return (
    <MainLayout emitter={emitter} auctionsInitialOpen={!!auctionId}>
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

export default AuctionsPage;
