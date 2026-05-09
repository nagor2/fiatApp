import React, { useEffect, useMemo, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuctions } from '../hooks/useAuctions';
import {
  MakeBidForm,
  ImproveBidForm,
  CancelBidConfirm,
  FinalizeAuctionConfirm,
  BidHistory,
} from '../components/AuctionsForms';
import Icon from '../components/redesign/Icons';
import Spinner from '../components/Spinner';
import TokenMark from '../components/redesign/TokenMark';
import '../styles/balances.css';
import '../styles/deposits.css';
import '../styles/credits.css';
import '../styles/auctions.css';

/* ── helpers (kept local; mirrors CreditsPage) ────────── */

const fmt = (n, dp = 2) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: dp,
    minimumFractionDigits: dp === 2 ? 2 : 0,
  });
};
const fmtRel = (d) => {
  if (!d) return '—';
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};
const fmtCountdown = (sec) => {
  if (sec == null) return '—';
  if (sec <= 0) return 'now';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
};

/**
 * AuctionsPage — list of every auction the protocol has ever held,
 * filterable by Live / Claimable / Past, plus a drawer for actions.
 *
 * Drawer panes:
 *   detail    — overview, best bid, time left, history
 *   bid       — place a new bid (or improve existing one)
 *   improve   — same form, scoped to a specific bid you own
 *   cancel    — confirm cancelling your bid (only if not the best)
 *   finalize  — claim-to-finalize (when timeLeft ≤ 0)
 */
export default function AuctionsPage() {
  const { account, explorer } = useWeb3();
  const { rows, stats, totals, loading, refresh } = useAuctions();
  const [tab, setTab] = useState('live');         // 'live' | 'claimable' | 'yours' | 'past'
  const [pane, setPane] = useState(null);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'live':       return rows.filter(r => !r.finalized);
      case 'claimable':  return rows.filter(r => !r.finalized && r.timeLeft <= 0);
      case 'yours':      return rows.filter(r => !r.finalized && r.youAreBest);
      case 'past':       return rows.filter(r =>  r.finalized);
      default:           return rows;
    }
  }, [rows, tab]);

  const onRowClick = (auction) => setPane({ kind: 'detail', auction });
  const onClose    = () => setPane(null);
  const onDone     = () => { setPane(null); refresh(); };

  return (
    <div className="df-page">
      <header className="df-page-head">
        <div>
          <h1 className="df-page-head__title">Auctions</h1>
          <p className="df-page-head__sub">
            Liquidations, RLE buyouts, and DFC buyouts — bid on lots,
            improve standing offers, claim finalized auctions.
          </p>
        </div>
      </header>

      <section className="df-stat-row df-stat-row--4">
        <Stat label="Live" value={totals.live} />
        <Stat label="Ready to claim" value={totals.claimable} highlight={totals.claimable > 0} />
        <Stat label="Your best bids" value={totals.yours} />
        <Stat label="Finalized" value={totals.finalized} muted />
      </section>

      <div className="df-auctions-toolbar">
        <div className="df-tabs" role="tablist">
          <Tab active={tab === 'live'}      onClick={() => setTab('live')}>Live <em>{totals.live}</em></Tab>
          <Tab active={tab === 'claimable'} onClick={() => setTab('claimable')}>Ready <em>{totals.claimable}</em></Tab>
          <Tab active={tab === 'yours'}     onClick={() => setTab('yours')}>Yours <em>{totals.yours}</em></Tab>
          <Tab active={tab === 'past'}      onClick={() => setTab('past')}>Past <em>{totals.finalized}</em></Tab>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="df-loading"><Spinner size={20} /> Loading auctions…</div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="df-auctions-grid">
          {filtered.map(a => (
            <AuctionCard key={a.id} auction={a} onClick={() => onRowClick(a)} />
          ))}
        </div>
      )}

      {pane && (
        <Drawer
          pane={pane}
          setPane={setPane}
          onClose={onClose}
          onDone={onDone}
          explorer={explorer}
          account={account}
        />
      )}
    </div>
  );
}

/* ── small bits ───────────────────────────────────────── */

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
    <button
      type="button"
      className={`df-tabs__btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab }) {
  const text = {
    live:      { title: 'No live auctions', sub: 'Nothing\u2019s up for bid right now. Check back in a bit.' },
    claimable: { title: 'Nothing to claim', sub: 'Auctions become claimable when their turn timer hits zero.' },
    yours:     { title: 'You hold no leading bids', sub: 'Place a bid on a live auction to see it here.' },
    past:      { title: 'No finalized auctions', sub: 'Auctions move here once their best bid is claimed.' },
  }[tab];
  return (
    <div className="df-empty">
      <div className="df-empty__icon"><Icon name="auction" size={28} /></div>
      <h3>{text.title}</h3>
      <p>{text.sub}</p>
    </div>
  );
}

/* ── auction card ─────────────────────────────────────── */

const TYPE_META = {
  'liquidation': { label: 'Collateral liquidation', tone: 'danger',  receive: 'WETH', pay: 'DFC' },
  'dfc-buyout':  { label: 'DFC buyout',             tone: 'safe',    receive: 'RLE',  pay: 'DFC' },
  'rle-buyout':  { label: 'RLE buyout',             tone: 'ok',      receive: 'DFC',  pay: 'RLE' },
};

function AuctionCard({ auction, onClick }) {
  const meta = TYPE_META[auction.type] || TYPE_META.liquidation;
  const claimable = !auction.finalized && auction.timeLeft <= 0;
  const past = !!auction.finalized;
  const status = past
    ? { tone: 'safe',   label: 'Finalized' }
    : claimable
      ? { tone: 'warn', label: 'Ready to claim' }
      : { tone: 'ok',   label: fmtCountdown(auction.timeLeft) };

  const lotDisplay = auction.type === 'dfc-buyout'
    ? (auction.bestBidAmount > 0 ? auction.bestBidAmount : auction.nextBid)   // RLE printed = bid amount
    : auction.lotAmount;

  return (
    <button type="button" className="df-card df-auction-card" onClick={onClick}>
      <div className="df-card__head">
        <div className="df-card__id">
          <TokenMark symbol={meta.receive} size={36} />
          <div>
            <div className="df-card__title">{meta.label}</div>
            <div className="df-card__sub">#{auction.id} · opened {fmtRel(auction.initTime)}</div>
          </div>
        </div>
        <span className={`df-pill df-pill--${status.tone}`}>{status.label}</span>
      </div>

      <div className="df-card__row">
        <div className="df-card__metric">
          <div className="df-card__metric-label">Lot</div>
          <div className="df-card__metric-value">
            {fmt(lotDisplay, 4)} <span>{meta.receive}</span>
          </div>
        </div>
        <div className="df-card__metric df-card__metric--right">
          <div className="df-card__metric-label">
            {auction.bestBidID > 0 ? 'Best bid' : 'Min bid'}
          </div>
          <div className="df-card__metric-value">
            {fmt(auction.bestBidID > 0 ? auction.bestBidAmount : auction.nextBid, 4)}
            <span> {meta.pay}</span>
          </div>
        </div>
      </div>

      {auction.youAreBest && (
        <div className="df-card__foot">
          <Icon name="alert" size={12} /> You hold the best bid
        </div>
      )}
    </button>
  );
}

/* ── drawer ───────────────────────────────────────────── */

function Drawer({ pane, setPane, onClose, onDone, explorer, account }) {
  // Esc + scroll-lock parity with Deposits/Credits
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

  if (!pane) return null;
  const a = pane.auction;
  const meta = TYPE_META[a.type] || TYPE_META.liquidation;

  const eyebrowByKind = {
    detail:   `Auction #${a.id}`,
    bid:      `Auction #${a.id}`,
    improve:  `Auction #${a.id}`,
    cancel:   `Auction #${a.id}`,
    finalize: `Auction #${a.id}`,
  };
  const titleByKind = {
    detail:   meta.label,
    bid:      a.bestBidID > 0 ? 'Place a higher bid' : 'Place opening bid',
    improve:  'Improve your bid',
    cancel:   'Cancel your bid',
    finalize: 'Claim to finalize',
  };
  const subByKind = {
    detail:   null,
    bid:      `Pay ${meta.pay} to receive ${meta.receive}.`,
    improve:  'Raise the amount on your existing bid without placing a new one.',
    cancel:   'Withdraw your bid. Only allowed if you\u2019re not currently the best bid.',
    finalize: 'Claim the lot for the best bid and close the auction.',
  };

  return (
    <div className="df-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="df-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="df-drawer__head">
          <button className="df-icon-btn df-drawer__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          <div className="df-drawer__title">
            <TokenMark symbol={meta.receive} size={36} />
            <div>
              <div className="df-eyebrow">{eyebrowByKind[pane.kind]}</div>
              <h3>{titleByKind[pane.kind]}</h3>
            </div>
          </div>
        </header>

        <div className="df-drawer__body">
          {subByKind[pane.kind] && <p className="df-muted df-drawer__lede">{subByKind[pane.kind]}</p>}

          {pane.kind === 'detail'   && <AuctionDetail auction={a} setPane={setPane} explorer={explorer} account={account} />}
          {pane.kind === 'bid'      && <MakeBidForm    auction={a} onDone={onDone} />}
          {pane.kind === 'improve'  && <ImproveBidForm auction={a} bid={pane.bid} onDone={onDone} />}
          {pane.kind === 'cancel'   && <CancelBidConfirm    auction={a} bid={pane.bid} onDone={onDone} />}
          {pane.kind === 'finalize' && <FinalizeAuctionConfirm auction={a} onDone={onDone} />}
        </div>
      </aside>
    </div>
  );
}

/* ── detail pane ──────────────────────────────────────── */

function AuctionDetail({ auction: a, setPane, explorer, account }) {
  const meta = TYPE_META[a.type] || TYPE_META.liquidation;
  const claimable = !a.finalized && a.timeLeft <= 0;
  const past = !!a.finalized;

  const lotDisplay = a.type === 'dfc-buyout'
    ? (a.bestBidAmount > 0 ? a.bestBidAmount : a.nextBid)
    : a.lotAmount;

  return (
    <div className="df-detail">
      <div className="df-detail__hero">
        <div className="df-detail__hero-row">
          <span className="df-detail__hero-label">You receive</span>
          <span className="df-detail__hero-value">
            {fmt(lotDisplay, 4)} <small>{meta.receive}</small>
          </span>
        </div>
        <div className="df-detail__hero-row">
          <span className="df-detail__hero-label">
            {a.bestBidID > 0 ? 'Best bid (pay)' : 'Min bid (pay)'}
          </span>
          <span className="df-detail__hero-value">
            {fmt(a.bestBidID > 0 ? a.bestBidAmount : a.nextBid, 4)}{' '}
            <small>{meta.pay}</small>
          </span>
        </div>

        {!past && (
          <div className="df-detail__hero-row">
            <span className="df-detail__hero-label">Turn ends in</span>
            <span className="df-detail__hero-value" style={{ fontSize: 18 }}>
              {claimable ? 'Ready to claim' : fmtCountdown(a.timeLeft)}
            </span>
          </div>
        )}
      </div>

      <dl className="df-detail__grid">
        <dt>Type</dt><dd>{meta.label}</dd>
        <dt>ID</dt><dd>#{a.id}</dd>
        <dt>Opened</dt><dd>{fmtRel(a.initTime)}</dd>
        <dt>Last update</dt><dd>{fmtRel(a.lastUpdate)}</dd>
        <dt>Status</dt><dd>{past ? 'Finalized' : claimable ? 'Awaiting claim' : 'Active'}</dd>
        {a.bestBidOwner && (
          <>
            <dt>Best bidder</dt>
            <dd>
              <a className="df-link"
                 href={`${explorer}address/${a.bestBidOwner}`}
                 target="_blank" rel="noreferrer">
                {a.bestBidOwner.slice(0, 6)}…{a.bestBidOwner.slice(-4)}
              </a>
              {a.youAreBest && <> · <em>that&rsquo;s you</em></>}
            </dd>
          </>
        )}
      </dl>

      {!past && (
        <div className="df-detail__actions">
          {claimable ? (
            <button className="df-btn df-btn--primary" onClick={() => setPane({ kind: 'finalize', auction: a })}>
              <Icon name="receipt" size={16} /> Claim to finalize
            </button>
          ) : (
            <button className="df-btn df-btn--primary" onClick={() => setPane({ kind: 'bid', auction: a })}>
              <Icon name="auction" size={16} /> {a.bestBidID > 0 ? 'Place higher bid' : 'Place opening bid'}
            </button>
          )}
        </div>
      )}

      <BidHistory
        auction={a}
        account={account}
        explorer={explorer}
        onImprove={(bid) => setPane({ kind: 'improve', auction: a, bid })}
        onCancel={(bid)  => setPane({ kind: 'cancel',  auction: a, bid })}
      />
    </div>
  );
}
