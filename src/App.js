import './App.css';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import Layout from './components/Layout';

const HomePage = lazy(() => import('./pages/HomePage'));
const BalancesPage = lazy(() => import(/* webpackPrefetch: true */ './pages/BalancesPage'));
const CreditsPage = lazy(() => import(/* webpackPrefetch: true */ './pages/CreditsPage'));
const DepositsPage = lazy(() => import(/* webpackPrefetch: true */ './pages/DepositsPage'));
const AuctionsPage = lazy(() => import(/* webpackPrefetch: true */ './pages/AuctionsPage'));
const PoolsPage = lazy(() => import(/* webpackPrefetch: true */ './pages/PoolsPage'));
const ContractsPage = lazy(() => import(/* webpackPrefetch: true */ './pages/ContractsPage'));
const CommoditiesPage = lazy(() => import(/* webpackPrefetch: true */ './pages/CommoditiesPage'));
const ChartsDemoPage = lazy(() => import('./pages/ChartsDemoPage'));
const BlockWatcherPage = lazy(() => import('./pages/BlockWatcherPage'));
const WalletTest = lazy(() => import('./components/WalletTest'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(13);

const PageFallback = () => <div align="center">Loading...</div>;

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Suspense fallback={<PageFallback />}>
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
        </Suspense>
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
