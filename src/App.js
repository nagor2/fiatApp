import './styles/index.css';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import Layout from './components/Layout';
import Stub from './pages/_Stub';
import DepositsPage from './pages/DepositsPage';
import BalancesPage from './pages/BalancesPage';
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const AuctionsPage = lazy(() => import('./pages/AuctionsPage'));




// As we migrate each page, replace the corresponding Stub with a real lazy import.
// Step 1: every route renders a Stub inside the new shell.

const events = require('events');
const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(13);

const PageFallback = () => (
  <div style={{ padding: 40, textAlign: 'center', color: 'var(--df-muted)' }}>Loading…</div>
);

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index                   element={<Stub title="Welcome to" accent="DotFlat" sub="Your dashboard for Dotflat-coin, credits, deposits and the commodity basket." />} />
              <Route path="balances"         element={<BalancesPage />} />
              <Route path="/credits" element={<CreditsPage />} />
              <Route path="cdp"              element={<Stub title="Credit" accent="positions" />} />
              <Route path="debtPositions/:id" element={<Stub title="Credit" accent="position" />} />
              <Route path="deposits"           element={<DepositsPage />} />
              <Route path="deposit/:depositId" element={<DepositsPage />} />
              <Route path="/auctions" element={<AuctionsPage />} />
              <Route path="auction/:auctionId" element={<Stub title="Auction" accent="detail" />} />
              <Route path="pools"            element={<Stub title="Liquidity" accent="pools" sub="Provide liquidity and earn fees." />} />
              <Route path="pool/:token1/:token2" element={<Stub title="Pool" accent="detail" />} />
              <Route path="contracts"        element={<Stub title="Protocol" accent="contracts" />} />
              <Route path="contracts/:contractName" element={<Stub title="Contract" accent="detail" />} />
              <Route path="commodities"      element={<Stub title="Commodity" accent="basket" sub="Real-world commodities backing DFC." />} />
              <Route path="commodity/:commodityName" element={<Stub title="Commodity" accent="detail" />} />
              <Route path="block-watcher"    element={<Stub title="Block" accent="watcher"   sub="Live view of DotFlat-relevant transactions." />} />
              <Route path="*"                element={<Stub title="Not" accent="found" sub="That page doesn't exist." />} />
            </Route>
          </Routes>
        </Suspense>
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
