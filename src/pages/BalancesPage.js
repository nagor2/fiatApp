import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useBalances } from '../hooks/useBalances';
import PageHead from '../components/redesign/PageHead';
import Icon from '../components/redesign/Icons';
import Spinner from '../components/Spinner';
import TokenMark from '../components/redesign/TokenMark';
import TokenTransfers from '../components/redesign/TokenTransfers';
import TradeWidget from '../components/redesign/TradeWidget';

const fmt = (n, dp = 4) => {
  if (n == null || Number.isNaN(n)) return '—';
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: dp });
};

const fmtUsd = (n) => {
  if (n == null) return null;
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function BalancesPage() {
  const { account, walletConnected, web3, contracts, getAccount } = useWeb3();
  const { rows, loading, totalUsd, refresh } = useBalances();
  const [openToken, setOpenToken] = useState(null);
  const [tradeFor,  setTradeFor]  = useState(null);  // 'DFC' | 'RLE' | 'ETH' | null

  if (!walletConnected) {
    return (
      <>
        <PageHead title="Your" accent="balances" sub="Tokens, pools and ETH across the DotFlat ecosystem." />
        <div className="df-empty">
          <div className="df-empty__icon"><Icon name="wallet" /></div>
          <h3>Connect a wallet to see your balances</h3>
          <p>Read-only mode is fine, but you'll need a connected wallet to transfer or trade.</p>
          <button className="df-btn df-btn--primary" onClick={getAccount}>Connect wallet</button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Your"
        accent="balances"
        sub="Tokens, pools and ETH across the DotFlat ecosystem."
        actions={
          <button className="df-btn df-btn--ghost" onClick={refresh} disabled={loading}>
            <Icon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <section className="df-stat-row">
        <div className="df-stat">
          <div className="df-stat__label">Portfolio value</div>
          <div className="df-stat__value">
            {totalUsd ? fmtUsd(totalUsd) : <span className="df-muted">priced positions only</span>}
          </div>
          <div className="df-stat__sub">{rows.length} positions</div>
        </div>
        <div className="df-stat">
          <div className="df-stat__label">Wallet</div>
          <div className="df-stat__value df-stat__value--sm df-mono">
            {account?.slice(0, 6)}…{account?.slice(-4)}
          </div>
          <div className="df-stat__sub">connected</div>
        </div>
      </section>

      <section className="df-cards">
        {loading && rows.length === 0 ? (
          <div className="df-loading"><Spinner size={20} /> Loading balances…</div>
        ) : (
          rows.map(row => (
            <BalanceCard
              key={row.key}
              row={row}
              onTransfers={() => row.contractName && setOpenToken(row)}
              onTrade={() => row.tradeable && setTradeFor(row.symbol)}
            />
          ))
        )}
      </section>

      {openToken && (
        <TransfersDrawer
          row={openToken}
          web3={web3}
          contracts={contracts}
          account={account}
          onClose={() => setOpenToken(null)}
        />
      )}

      {tradeFor && (
        <TradeWidget token={tradeFor} onClose={() => setTradeFor(null)} onSwapDone={refresh} />
      )}
    </>
  );
}

function BalanceCard({ row, onTransfers, onTrade }) {
  const priceLine = row.priceUsd != null
    ? <span className="df-card__price">@ {fmtUsd(row.priceUsd)} / {row.symbol}</span>
    : null;

  return (
    <article className="df-card df-card--token">
      <header className="df-card__head">
        <TokenMark symbol={row.symbol} size={44} />
        <div className="df-card__title-block">
          <h3 className="df-card__title">{row.symbol}</h3>
          <div className="df-card__sub">{row.name}</div>
        </div>
      </header>

      <div className="df-card__body">
        <div className="df-balance">{fmt(row.balance)} <span className="df-balance__sym">{row.symbol}</span></div>
        <div className="df-balance__usd">
          {fmtUsd(row.usd) || <span className="df-muted">unpriced</span>}
          {priceLine}
        </div>
      </div>

      <footer className="df-card__foot">
        {row.tradeable && (
          <button className="df-btn df-btn--primary df-btn--sm" onClick={onTrade}>
            <Icon name="swap" size={16} /> Trade
          </button>
        )}
        {row.contractName && (
          <button className="df-btn df-btn--ghost df-btn--sm" onClick={onTransfers}>
            <Icon name="arrows" size={16} /> Transfers
          </button>
        )}
        {row.contractName === 'flatCoin' && (
          <Link to="/credits" className="df-btn df-btn--ghost df-btn--sm">Borrow DFC</Link>
        )}
        {row.symbol === 'ETH' && (
          <Link to="/credits" className="df-btn df-btn--ghost df-btn--sm">Use as collateral</Link>
        )}
      </footer>
    </article>
  );
}

function TransfersDrawer({ row, web3, contracts, account, onClose }) {
  // Lock body scroll while drawer is open + close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="df-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${row.symbol} transfers`}>
      <aside className="df-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="df-drawer__head">
          <button className="df-icon-btn df-drawer__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          <div className="df-drawer__title">
            <TokenMark symbol={row.symbol} size={36} />
            <div>
              <div className="df-eyebrow">{row.symbol} · transfers</div>
              <h3>{row.name}</h3>
            </div>
          </div>
        </header>
        <div className="df-drawer__body">
          <TokenTransfers
            web3={web3}
            contracts={contracts}
            contractName={row.contractName}
            account={account}
            symbol={row.symbol}
          />
        </div>
      </aside>
    </div>
  );
}
