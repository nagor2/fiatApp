import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useContractStats } from '../hooks/useContractStats';
import { contractKeyForTitle } from '../utils/contractKeys';
import config from '../utils/config';
import Icon from '../components/redesign/Icons';
import TokenMark from '../components/redesign/TokenMark';
import PageHead from '../components/redesign/PageHead';
import TradeWidget from '../components/redesign/TradeWidget';
import '../styles/balances.css';
import '../styles/auctions.css';
import '../styles/contracts.css';

/**
 * ContractsPage — directory of every deployed DotFlat contract.
 *
 * Routes:
 *   /contracts                  → grid of all contracts (no detail open)
 *   /contracts/:contractTitle   → grid + detail panel for that contract
 *
 * Detail panel renders the per-token stat block expected by users
 * coming from the legacy panels (DFC, RLE, CDP, Deposit, Basket, ER, …).
 */

export default function ContractsPage() {
  const { contracts } = useWeb3();
  const { contractName } = useParams();
  const navigate = useNavigate();
  const [tradeFor, setTradeFor] = useState(null);  // 'DFC' | 'RLE' | 'ETH' | null

  const list = useMemo(() => {
    return (config.contractsList || []).map((c) => {
      const key = contractKeyForTitle(c.title);
      const addr = key && contracts?.[key]?._address;
      return { ...c, key, address: addr || null };
    });
  }, [contracts]);

  const selected = useMemo(() => {
    if (!contractName) return null;
    const lc = String(contractName).toLowerCase();
    return list.find((c) => c.title.toLowerCase() === lc) || null;
  }, [list, contractName]);

  return (
    <>
      <div className="df-page">
        <PageHead
          title="Smart"
          accent="contracts"
          sub="Every contract that powers the DotFlat protocol — verifiable on-chain. Click any contract to see live stats, copy its address, or open it in your block explorer."
        />

        <section className="df-contracts-grid">
          {list.map((c) => {
            const isOpen = selected?.id === c.id;
            return (
              <button
                key={c.id}
                className={`df-contract-card ${isOpen ? 'is-open' : ''}`}
                onClick={() => navigate(isOpen ? '/contracts' : `/contracts/${c.title}`)}
              >
                <header className="df-contract-card__head">
                  <TokenMark symbol={c.title} size={40} kind="navy" />
                  <div>
                    <h3>{c.title}</h3>
                    <span className="df-eyebrow">{c.name}</span>
                  </div>
                </header>
                <div className="df-contract-card__addr df-mono">
                  {c.address ? short(c.address) : <span className="df-muted">Loading…</span>}
                </div>
              </button>
            );
          })}
        </section>

        {selected && (
          <ContractDetail
            selected={selected}
            onClose={() => navigate('/contracts')}
            onTrade={() => setTradeFor(tokenForTitle(selected.title))}
          />
        )}
      </div>

      {tradeFor && (
        <TradeWidget token={tradeFor} onClose={() => setTradeFor(null)} />
      )}
    </>
  );
}

/**
 * Map a contract title to a tradeable token symbol (or null).
 * Only DFC and RLE are "tradeable" from contract pages — the rest
 * (CDP/Deposit/Auction/DAO) are operational, not market positions.
 */
function tokenForTitle(title) {
  if (title === 'DFC') return 'DFC';
  if (title === 'RLE') return 'RLE';
  return null;
}

function ContractDetail({ selected, onClose, onTrade }) {
  const { stats, loading, address } = useContractStats(selected.title);
  const explorer = (config.explorer || 'https://etherscan.io/').replace(/\/?$/, '/');
  const tradeToken = tokenForTitle(selected.title);

  return (
    <section className="df-contract-detail">
      <header className="df-contract-detail__head">
        <TokenMark symbol={selected.title} size={56} kind="navy" />
        <div>
          <div className="df-eyebrow">Contract</div>
          <h2>{selected.name}</h2>
        </div>
        <button className="df-icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>

      {(address || selected.address) ? (
        <>
          <div className="df-contract-detail__row">
            <span className="df-muted">Address</span>
            <code className="df-mono">{address || selected.address}</code>
            <CopyBtn value={address || selected.address} />
          </div>

          <div className="df-contract-detail__actions">
            <a className="df-btn df-btn--ghost df-btn--sm"
               href={`${explorer}address/${address || selected.address}`}
               target="_blank" rel="noreferrer">
              <Icon name="external" size={16} /> View on explorer
            </a>
            <a className="df-btn df-btn--ghost df-btn--sm"
               href={`${explorer}address/${address || selected.address}#code`}
               target="_blank" rel="noreferrer">
              <Icon name="contract" size={16} /> Source code
            </a>
            {tradeToken && (
              <button className="df-btn df-btn--primary df-btn--sm" onClick={onTrade}>
                <Icon name="swap" size={16} /> Trade {tradeToken}
              </button>
            )}
            {(selected.title === 'INTDAO') && (
              <Link className="df-btn df-btn--primary df-btn--sm" to="/governance">
                <Icon name="pool" size={16} /> Open governance
              </Link>
            )}
            {(selected.title === 'Auction') && (
              <Link className="df-btn df-btn--primary df-btn--sm" to="/auctions">
                <Icon name="auction" size={16} /> Open auctions
              </Link>
            )}
            {(selected.title === 'CDP') && (
              <Link className="df-btn df-btn--primary df-btn--sm" to="/credits">
                <Icon name="credit" size={16} /> Open credits
              </Link>
            )}
            {(selected.title === 'Deposit') && (
              <Link className="df-btn df-btn--primary df-btn--sm" to="/deposits">
                <Icon name="deposit" size={16} /> Open deposits
              </Link>
            )}
            {(selected.title === 'Basket') && (
              <Link className="df-btn df-btn--primary df-btn--sm" to="/commodities">
                <Icon name="commodity" size={16} /> Open commodities
              </Link>
            )}
            {(selected.title === 'ExchangeRateContract') && (
              <Link className="df-btn df-btn--primary df-btn--sm" to="/commodities">
                <Icon name="commodity" size={16} /> Open commodities
              </Link>
            )}
          </div>

          {/* Stat grid */}
          <div className="df-contract-stats">
            {loading && stats.length === 0 ? (
              <div className="df-loading">Loading on-chain data…</div>
            ) : (
              stats.map((s, i) => (
                <div key={i} className={`df-stat-cell ${s.accent ? 'df-stat-cell--accent' : ''}`}>
                  <div className="df-stat-cell__label">{s.label}</div>
                  <div className="df-stat-cell__value">{s.value}</div>
                  {s.sub && <div className="df-stat-cell__sub">{s.sub}</div>}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <p className="df-faint">No deployment address available in the current network.</p>
      )}
    </section>
  );
}

function short(addr) {
  return addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '';
}

function CopyBtn({ value }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch (_) {}
  };
  return (
    <button className="df-icon-btn" onClick={onCopy} aria-label="Copy" title={done ? 'Copied!' : 'Copy address'}>
      <Icon name={done ? 'check' : 'receipt'} />
    </button>
  );
}
