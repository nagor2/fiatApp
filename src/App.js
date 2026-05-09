import './styles/index.css';
import React, { Suspense, lazy } from 'react';
import Spinner from './components/Spinner';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import { PricesProvider } from './contexts/PricesContext';
import Layout from './components/Layout';
import Stub from './pages/_Stub';
import DepositsPage from './pages/DepositsPage';
import BalancesPage from './pages/BalancesPage';
import HomePage         from './pages/HomePage';

const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const AuctionsPage = lazy(() => import('./pages/AuctionsPage'));
const PoolsPage = lazy(() => import('./pages/PoolsPage'));
const GovernancePage = lazy(() => import('./pages/GovernancePage'));
const CommoditiesPage = lazy(() => import('./pages/CommoditiesPage'));
const ContractsPage = lazy(() => import('./pages/ContractsPage'));
const BlockWatcherPage = lazy(() => import('./pages/BlockWatcherPage'));



// As we migrate each page, replace the corresponding Stub with a real lazy import.
// Step 1: every route renders a Stub inside the new shell.

const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(13);

const PageFallback = () => (
  <div style={{ padding: 40, textAlign: 'center', color: 'var(--df-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
    <Spinner size={20} /> Loading…
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <PricesProvider>
        <Web3Provider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>

            {/* ── Migrated ─────────────────────────────────── */}          
              <Route index                   element={<HomePage />} />
              <Route path="balances"         element={<BalancesPage />} />
              <Route path="/credits" element={<CreditsPage />} />
              <Route path="cdp"                      element={<CreditsPage />} />
              <Route path="debtPositions/:id"        element={<CreditsPage />} />
              <Route path="deposits"           element={<DepositsPage />} />
              <Route path="deposit/:depositId" element={<DepositsPage />} />
              <Route path="/auctions" element={<AuctionsPage />} />
              <Route path="auction/:auctionId"       element={<AuctionsPage />} />
              <Route path="pools"                    element={<PoolsPage />} />
              <Route path="pool/:token1/:token2"     element={<PoolsPage />} />
              <Route path="governance"               element={<GovernancePage />} />
              <Route path="contracts"        element={<ContractsPage/>} />
              <Route path="contracts/:contractName" element={<ContractsPage />} />
            {/* Commodities — Index + Basket tabs */}
              <Route path="commodities"              element={<CommoditiesPage />} />
              <Route path="commodities/:name"        element={<CommoditiesPage />} />
              <Route path="commodity/:commodityName" element={<CommoditiesPage />} />

              <Route path="block-watcher"    element={<BlockWatcherPage />} />
              <Route path="*"                element={<Stub title="Not" accent="found" sub="That page doesn't exist." />} />
            </Route>
          </Routes>
        </Suspense>
        </Web3Provider>
      </PricesProvider>
    </BrowserRouter>
  );
}

export default App;
