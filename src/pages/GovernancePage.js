import React, { useEffect, useMemo, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { usePrices } from '../contexts/PricesContext';
import { usePool as useGovernance } from '../hooks/useGovernance';
import {
  PoolTokensForm,
  ReturnTokensForm,
  VoteForm,
  ClaimToFinalizeForm,
  NewVotingForm,
  ProposalSummary,
} from '../components/GovernanceForms';
import Icon from '../components/redesign/Icons';
import Spinner from '../components/Spinner';
import TokenMark from '../components/redesign/TokenMark';
import PageHead from '../components/redesign/PageHead';
import '../styles/balances.css';
import '../styles/deposits.css';
import '../styles/credits.css';
import '../styles/auctions.css';
import '../styles/governance.css';

/* ── helpers ───────────────────────────────────────── */

const fmt = (n, dp = 2) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: dp,
    minimumFractionDigits: dp === 2 ? 2 : 0,
  });
};
const fmtRel = (d) => {
  if (!d) return '—';
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60)        return 'just now';
  if (s < 3600)      return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30)return `${Math.floor(s / 86400)}d ago`;
  if (s < 86400 * 365) return `${Math.floor(s / 86400 / 30)}mo ago`;
  return `${Math.floor(s / 86400 / 365)}y ago`;
};

/**
 * PoolPage — DAO governance dashboard.
 *
 * Sections:
 *   1. Stats hero (your stake, total pooled, share, active voting?)
 *   2. Active / latest proposal card with quick actions
 *   3. Tabs: Parameters · Contracts
 *   4. Drawer panes for: pool, return, vote, finalize, propose
 */
export default function GovernancePage() {
  const { explorer, walletConnected } = useWeb3();
  const { pool, stats, loading, refresh } = useGovernance();
  const prices = usePrices();
  const marketCap = (pool?.ruleSupply != null && prices?.rleUsd != null)
    ? pool.ruleSupply * prices.rleUsd
    : null;
  const [tab, setTab]   = useState('params');   // 'params' | 'contracts'
  const [pane, setPane] = useState(null);       // { kind: ... } | null

  const onClose = () => setPane(null);
  const onDone  = () => { setPane(null); refresh(); };

  if (loading && !pool) {
    return <div className="df-page"><div className="df-loading"><Spinner size={20} /> Loading governance state…</div></div>;
  }
  if (!pool) {
    return (
      <div className="df-page">
        <PageHead title="Pool &" accent="governance" sub="DAO state unavailable." />
        <div className="df-empty">
          <h3>Couldn't load DAO state</h3>
          <p>Try refreshing the page once your wallet is on the right network.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="df-page">
      <PageHead
        title="Params &"
        accent="governance"
        sub="Pool RLE to vote on protocol parameters, contract upgrades, and pause / authorize actions. Proposals run one at a time."
        actions={
          <button className="df-btn df-btn--ghost" onClick={refresh} disabled={loading}>
            <Icon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {/* ── Stats ── */}
      <section className="df-stat-row df-stat-row--5">
        <Stat label="Your pooled" value={`${fmt(pool.userPooled, 4)} RLE`} />
        <Stat label="Your share"   value={`${fmt(stats.sharePct, 2)}%`} muted={pool.userPooled <= 0} />
        <Stat label="Total pooled" value={`${fmt(pool.totalPooled, 0)} RLE`} />
        <Stat label="Voting"
              value={pool.activeVoting ? 'Active' : 'Idle'}
              highlight={pool.activeVoting} />
        <Stat label="RLE Market cap"
              value={marketCap != null ? `$${fmt(marketCap, 0)}` : '—'}
              muted={marketCap == null} />
      </section>

      {/* ── Your stake actions ── */}
      <section className="df-pool-actions">
        <button type="button" className="df-btn df-btn--primary"
                onClick={() => walletConnected ? setPane({ kind: 'pool' }) : setPane({ kind: 'connect', action: 'pool RLE' })}>
          <Icon name="plus" size={16} /> Pool RLE
        </button>
        <button type="button" className="df-btn df-btn--ghost"
                disabled={walletConnected && pool.userPooled <= 0}
                onClick={() => walletConnected ? setPane({ kind: 'return' }) : setPane({ kind: 'connect', action: 'return tokens' })}>
          <Icon name="minus" size={16} /> Return tokens
        </button>
        <button type="button" className="df-btn df-btn--ghost"
                disabled={walletConnected && (pool.userPooled <= 0 || pool.activeVoting)}
                title={pool.activeVoting ? 'Wait for current voting to finalize' : ''}
                onClick={() => walletConnected ? setPane({ kind: 'propose' }) : setPane({ kind: 'connect', action: 'submit a proposal' })}>
          <Icon name="edit" size={16} /> New proposal
        </button>
      </section>

      {/* ── Active / last voting ── */}
      <ProposalCard
        pool={pool}
        walletConnected={walletConnected}
        onVote={() => walletConnected ? setPane({ kind: 'vote' }) : setPane({ kind: 'connect', action: 'cast a vote' })}
        onFinalize={() => walletConnected ? setPane({ kind: 'finalize' }) : setPane({ kind: 'connect', action: 'finalize this proposal' })}
      />

      {/* ── Parameters / Contracts ── */}
      <div className="df-auctions-toolbar">
        <div className="df-tabs" role="tablist">
          <Tab active={tab === 'params'} onClick={() => setTab('params')}>
            Parameters <em>{pool.params.filter((p) => p.value != null).length}</em>
          </Tab>
          <Tab active={tab === 'contracts'} onClick={() => setTab('contracts')}>
            Contracts <em>{pool.addresses.filter((a) => a.value).length}</em>
          </Tab>
        </div>
        <div className="df-pool-toolbar-meta">
          <span className="df-muted">DAO contract:</span>{' '}
          <a className="df-link"
             href={`${explorer}address/${pool.daoAddress}`}
             target="_blank" rel="noreferrer">
            {pool.daoAddress.slice(0, 6)}…{pool.daoAddress.slice(-4)}
          </a>
        </div>
      </div>

      {tab === 'params'    && <ParamsGrid    pool={pool} />}
      {tab === 'contracts' && <ContractsGrid pool={pool} explorer={explorer} />}

      {pane && (
        <Drawer pool={pool} pane={pane} onClose={onClose} onDone={onDone} setPane={setPane} />
      )}
    </div>
  );
}

/* ── small bits ────────────────────────────────────── */

function Stat({ label, value, muted, highlight }) {
  return (
    <div className={`df-stat${highlight ? ' df-stat--accent' : ''}${muted ? ' df-stat--muted' : ''}`}>
      <div className="df-stat__label">{label}</div>
      <div className="df-stat__value">{value}</div>
    </div>
  );
}
function Tab({ active, onClick, children }) {
  return (
    <button type="button" role="tab" aria-selected={active}
            className={`df-tabs__btn ${active ? 'is-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

/* ── Active / latest voting card ──────────────────── */

function ProposalCard({ pool, walletConnected, onVote, onFinalize }) {
  const v = pool.voting;
  if (!v) {
    return (
      <section className="df-pool-prop df-pool-prop--empty">
        <div className="df-pool-prop__icon"><Icon name="check" size={28} /></div>
        <div>
          <h3>No proposals yet</h3>
          <p>Pool RLE and submit the first proposal to govern the protocol.</p>
        </div>
      </section>
    );
  }

  const t = v.typeMeta;
  const isActive = pool.activeVoting;

  return (
    <section className={`df-pool-prop ${isActive ? 'is-active' : 'is-finalized'}`}>
      <header className="df-pool-prop__head">
        <div className="df-pool-prop__title">
          <TokenMark symbol="RLE" size={36} />
          <div>
            <div className="df-eyebrow">
              {isActive ? 'Active proposal' : 'Last proposal'} · #{v.id}
            </div>
            <h3>{t.label}</h3>
          </div>
        </div>
        <span className={`df-pill df-pill--${isActive ? 'ok' : 'safe'}`}>
          {isActive ? 'Active' : 'Finalized'}
        </span>
      </header>

      <ProposalSummary voting={v} />

      {isActive ? (
        <div className="df-pool-prop__actions">
          <button type="button" className="df-btn df-btn--primary"
                  disabled={walletConnected && pool.userPooled <= 0}
                  title={walletConnected && pool.userPooled <= 0 ? 'Pool RLE first to vote' : ''}
                  onClick={onVote}>
            <Icon name="check" size={16} /> Cast vote
          </button>
          <button type="button" className="df-btn df-btn--ghost" onClick={onFinalize}>
            <Icon name="receipt" size={16} /> Claim to finalize
          </button>
        </div>
      ) : (
        <p className="df-muted" style={{ margin: 0 }}>
          Opened {fmtRel(v.startTime)} · resolved with{' '}
          <strong>{fmt(v.totalPositive, 4)} RLE</strong> in favor.
        </p>
      )}
    </section>
  );
}

/* ── Parameters tab ─────────────────────────────── */

function ParamsGrid({ pool }) {
  return (
    <div className="df-pool-grid">
      {pool.params.map((p) => (
        <div key={p.name} className="df-pool-card">
          <div className="df-pool-card__head">
            <div className="df-pool-card__label">{p.label}</div>
            <code className="df-pool-card__key">{p.name}</code>
          </div>
          <div className="df-pool-card__value">{p.display}</div>
          {p.hint && <p className="df-pool-card__hint">{p.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Contracts tab ──────────────────────────────── */

function ContractsGrid({ pool, explorer }) {
  return (
    <div className="df-pool-grid">
      {pool.addresses.map((a) => (
        <div key={a.name} className="df-pool-card">
          <div className="df-pool-card__head">
            <div className="df-pool-card__label">{a.label}</div>
            <code className="df-pool-card__key">{a.name}</code>
          </div>
          <div className="df-pool-card__value df-pool-card__value--addr">
            {a.value ? (
              <a className="df-link" target="_blank" rel="noreferrer"
                 href={`${explorer}address/${a.value}`}>
                {a.value.slice(0, 8)}…{a.value.slice(-6)}
              </a>
            ) : <span className="df-muted">unset</span>}
          </div>
          {a.hint && <p className="df-pool-card__hint">{a.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Drawer ──────────────────────────────────────── */

function ConnectPrompt({ action, onClose }) {
  const { getAccount } = useWeb3();
  return (
    <div className="df-empty" style={{ padding: '20px 0' }}>
      <div className="df-empty__icon"><Icon name="wallet" /></div>
      <h3>Connect a wallet to {action}</h3>
      <p>You can browse parameters and contract addresses without a wallet, but signing transactions requires one.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="df-btn df-btn--primary" onClick={async () => { await getAccount(); onClose(); }}>
          Connect wallet
        </button>
        <button className="df-btn df-btn--ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function Drawer({ pool, pane, onClose, onDone, setPane }) {
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

  const titleByKind = {
    pool:     'Pool RLE',
    return:   'Return RLE',
    vote:     'Vote',
    finalize: 'Claim to finalize',
    propose:  'New proposal',
    connect:  'Connect wallet',
  };
  const eyebrowByKind = {
    pool:     'Stake',
    return:   'Stake',
    vote:     pool.voting ? `Proposal #${pool.voting.id}` : 'Vote',
    finalize: pool.voting ? `Proposal #${pool.voting.id}` : 'Finalize',
    propose:  'Governance',
    connect:  'Wallet required',
  };

  return (
    <div className="df-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="df-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="df-drawer__head">
          <button className="df-icon-btn df-drawer__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          <div className="df-drawer__title">
            <TokenMark symbol="RLE" size={36} />
            <div>
              <div className="df-eyebrow">{eyebrowByKind[pane.kind]}</div>
              <h3>{titleByKind[pane.kind]}</h3>
            </div>
          </div>
        </header>

        <div className="df-drawer__body">
          {pane.kind === 'pool'     && <PoolTokensForm     pool={pool} onDone={onDone} />}
          {pane.kind === 'return'   && <ReturnTokensForm   pool={pool} onDone={onDone} />}
          {pane.kind === 'vote'     && <VoteForm           pool={pool} onDone={onDone} />}
          {pane.kind === 'finalize' && <ClaimToFinalizeForm pool={pool} onDone={onDone} />}
          {pane.kind === 'propose'  && <NewVotingForm      pool={pool} onDone={onDone} />}
          {pane.kind === 'connect'  && <ConnectPrompt      action={pane.action} onClose={onClose} />}
        </div>
      </aside>
    </div>
  );
}
