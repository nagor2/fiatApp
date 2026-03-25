import './App.css';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BalancesPage from './pages/BalancesPage';
import CreditsPage from './pages/CreditsPage';
import DepositsPage from './pages/DepositsPage';
import AuctionsPage from './pages/AuctionsPage';
import PoolsPage from './pages/PoolsPage';
import ContractsPage from './pages/ContractsPage';
import CommoditiesPage from './pages/CommoditiesPage';
import ChartsDemoPage from './pages/ChartsDemoPage';
import BlockWatcherPage from './pages/BlockWatcherPage';
import WalletTest from './components/WalletTest';
import NotFoundPage from './pages/NotFoundPage';

const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(13);

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage emitter={eventEmitter} />} />
            <Route path="balances" element={<BalancesPage emitter={eventEmitter} />} />
            <Route path="credits" element={<CreditsPage emitter={eventEmitter} />} />
            <Route path="cdp" element={<CreditsPage emitter={eventEmitter} />} />
            <Route path="debtPositions/:id" element={<CreditsPage emitter={eventEmitter} />} />
            <Route path="deposits" element={<DepositsPage emitter={eventEmitter} />} />
            <Route path="deposit/:depositId" element={<DepositsPage emitter={eventEmitter} />} />
            <Route path="auctions" element={<AuctionsPage emitter={eventEmitter} />} />
            <Route path="auction/:auctionId" element={<AuctionsPage emitter={eventEmitter} />} />
            <Route path="pools" element={<PoolsPage emitter={eventEmitter} />} />
            <Route path="pool/:token1/:token2" element={<PoolsPage emitter={eventEmitter} />} />
            <Route path="contracts" element={<ContractsPage emitter={eventEmitter} />} />
            <Route path="contracts/:contractName" element={<ContractsPage emitter={eventEmitter} />} />
            <Route path="commodities" element={<CommoditiesPage emitter={eventEmitter} />} />
            <Route path="commodity/:commodityName" element={<CommoditiesPage emitter={eventEmitter} />} />
            <Route path="charts-demo" element={<ChartsDemoPage />} />
            <Route path="block-watcher" element={<BlockWatcherPage emitter={eventEmitter} />} />
            <Route path="test/wallet" element={<WalletTest />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
