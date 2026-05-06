/**
 * Auction action forms — opened from the drawer in AuctionsPage.
 *
 * Canonical async/await + parseTxError shape:
 *   try { await tx.send(...); // success
 *   } catch (e) { setStatus(parseTxError(e));
 *   } finally { setBusy(false); }
 *
 * Allowance-then-action: the "Place bid" / "Improve bid" forms sequence
 * approve(amount) → makeBid(amount) under one button. We re-check allowance
 * every time the user changes the amount so we don\u2019t double-approve.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { cachedContractCall, batchCachedContractCalls } from '../utils/cachedContractCall';
import { parseTxError } from '../utils/txError';
import { useAuctionBids } from '../hooks/useAuctions';
import Icon from './redesign/Icons';
import TokenMark from './redesign/TokenMark';

/* ── tiny formatting helpers (local; matches AuctionsPage) ────────── */

const fmt = (n, dp = 4) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: dp,
    minimumFractionDigits: 0,
  });
};
const fmtDate = (d) => d ? d.toLocaleString(undefined, {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
}) : '—';
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

/* ── shared: which contract/symbol receives the payment token ──────── */

function paymentContractFor(auction, contracts) {
  if (!contracts) return { contract: null, key: null };
  if (auction.paymentToken?.toLowerCase() === contracts.flatCoin?._address?.toLowerCase()) {
    return { contract: contracts.flatCoin, key: 'flatCoin' };
  }
  if (auction.paymentToken?.toLowerCase() === contracts.rule?._address?.toLowerCase()) {
    return { contract: contracts.rule, key: 'rule' };
  }
  return { contract: null, key: null };
}

/**
 * useBidContext — pulls user balance + allowance for the auction's payment
 * token. Re-fetches when the auction changes or after a successful tx.
 */
function useBidContext(auction) {
  const { account, contracts } = useWeb3();
  const { contract: payContract, key: payKey } = paymentContractFor(auction, contracts);
  const [balance, setBalance]     = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [reloading, setReloading] = useState(false);

  const reload = useCallback(async () => {
    if (!account || !payContract || !contracts?.auction) return;
    setReloading(true);
    try {
      const auctionAddr = contracts.auction._address;
      const res = await batchCachedContractCalls([
        { contractKey: payKey, methodName: 'balanceOf', args: [account], noCache: true },
        { contractKey: payKey, methodName: 'allowance', args: [account, auctionAddr], noCache: true },
      ]);
      if (res[0]?.success) setBalance(Number(res[0].result) / 1e18);
      if (res[1]?.success) setAllowance(Number(res[1].result) / 1e18);
    } finally {
      setReloading(false);
    }
  }, [account, contracts, payContract, payKey]);

  useEffect(() => { reload(); }, [reload]);

  return { balance, allowance, reload, payContract, payKey, reloading };
}

/* ── Make bid ───────────────────────────────────────────────────────── */

export function MakeBidForm({ auction, onDone }) {
  const { account, contracts, web3 } = useWeb3();
  const { balance, allowance, reload, payContract } = useBidContext(auction);
  const [amount, setAmount] = useState(() => String(auction.nextBid || ''));
  const [status, setStatus] = useState(null);
  const [busy, setBusy]     = useState(false);

  const num = Number(amount) || 0;
  const min = auction.bestBidID > 0 ? auction.nextBid : (auction.nextBid || 0.0001);
  const enough = num <= balance + 1e-9;
  const aboveMin = auction.type === 'dfc-buyout'
    // DFC buyout bids LOWER than current best (price moves down).
    ? (auction.bestBidID > 0 ? num <= auction.nextBid : num > 0)
    : num >= min;
  const canSubmit = !busy && num > 0 && enough && aboveMin;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Preparing transaction…' });
    try {
      const auctionAddr = contracts.auction._address;
      const wei = web3.utils.toWei(String(num));

      // Step 1: approve if we don't already cover the bid.
      if (allowance + 1e-12 < num) {
        setStatus({ kind: 'pending', msg: `Approving ${fmt(num)} ${auction.paymentSymbol}…` });
        await payContract.methods
          .approve(auctionAddr, wei)
          .send({ from: account });
      }

      // Step 2: make the bid.
      setStatus({ kind: 'pending', msg: 'Placing bid…' });
      await contracts.auction.methods
        .makeBid(auction.id, wei)
        .send({ from: account });

      setStatus({ kind: 'ok', msg: 'Bid placed.' });
      await reload();
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <div className="df-form__head">
        <h4>{auction.bestBidID > 0 ? 'Improve to a better bid' : 'Open this auction'}</h4>
        <span className="df-eyebrow">#{auction.id}</span>
      </div>

      <BidContextSummary auction={auction} balance={balance} allowance={allowance} />

      <div className="df-field df-field__amount">
        <label>Your bid</label>
        <input
          type="number"
          min={0}
          step="0.0001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <span className="df-field__unit">{auction.paymentSymbol}</span>
      </div>

      <div className="df-form__row" style={{ gap: 8 }}>
        <button
          type="button"
          className="df-btn df-btn--ghost df-btn--sm"
          onClick={() => setAmount(String(auction.nextBid))}
          disabled={busy}
        >
          {auction.bestBidID > 0 ? 'Use min step' : 'Use floor'}
        </button>
        <button
          type="button"
          className="df-btn df-btn--ghost df-btn--sm"
          onClick={() => setAmount(String(Math.max(0, balance)))}
          disabled={busy || balance <= 0}
        >
          Max ({fmt(balance)} {auction.paymentSymbol})
        </button>
      </div>

      <button
        type="button"
        className="df-btn df-btn--primary df-btn--block"
        disabled={!canSubmit}
        onClick={submit}
      >
        {busy
          ? 'Working…'
          : !enough
            ? `Insufficient ${auction.paymentSymbol}`
            : !aboveMin
              ? auction.type === 'dfc-buyout'
                ? `Must be ≤ ${fmt(auction.nextBid)} ${auction.paymentSymbol}`
                : `Must be ≥ ${fmt(min)} ${auction.paymentSymbol}`
              : allowance + 1e-12 < num
                ? `Approve & bid ${fmt(num)} ${auction.paymentSymbol}`
                : `Place bid for ${fmt(num)} ${auction.paymentSymbol}`}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── Improve a specific bid ─────────────────────────────────────────── */

export function ImproveBidForm({ auction, bid, onDone }) {
  const { account, contracts, web3 } = useWeb3();
  const { balance, allowance, reload, payContract } = useBidContext(auction);
  const [amount, setAmount] = useState(() => String(auction.nextBid || bid?.amount || ''));
  const [status, setStatus] = useState(null);
  const [busy, setBusy]     = useState(false);

  const num = Number(amount) || 0;
  // For RLE/liquidation: must be > existing. For DFC-buyout: must be < existing.
  const direction = auction.move > 0 ? 'up' : 'down';
  const aboveCurrent = direction === 'up' ? num > bid.amount : num < bid.amount;
  const meetsStep    = direction === 'up' ? num >= auction.nextBid : num <= auction.nextBid;
  const delta = Math.max(0, num - bid.amount); // we may need extra allowance for the delta in 'up' mode
  const enough = direction === 'up' ? (delta <= balance + 1e-9) : true;
  const canSubmit = !busy && aboveCurrent && meetsStep && enough && num > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Preparing transaction…' });
    try {
      const auctionAddr = contracts.auction._address;
      const wei = web3.utils.toWei(String(num));

      // For "up" auctions we may need more allowance than the current bid.
      if (direction === 'up' && allowance + 1e-12 < num) {
        setStatus({ kind: 'pending', msg: `Approving ${fmt(num)} ${auction.paymentSymbol}…` });
        await payContract.methods
          .approve(auctionAddr, wei)
          .send({ from: account });
      }

      setStatus({ kind: 'pending', msg: 'Improving bid…' });
      await contracts.auction.methods
        .improveBid(bid.id, wei)
        .send({ from: account });

      setStatus({ kind: 'ok', msg: 'Bid improved.' });
      await reload();
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <div className="df-form__head">
        <h4>Improve bid #{bid.id}</h4>
        <span className="df-eyebrow">{auction.paymentSymbol}</span>
      </div>

      <dl className="df-detail__grid">
        <dt>Current bid</dt><dd>{fmt(bid.amount)} {auction.paymentSymbol}</dd>
        <dt>Min next bid</dt><dd>{fmt(auction.nextBid)} {auction.paymentSymbol}</dd>
        <dt>Your balance</dt><dd>{fmt(balance)} {auction.paymentSymbol}</dd>
      </dl>

      <div className="df-field df-field__amount">
        <label>New amount</label>
        <input
          type="number"
          step="0.0001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <span className="df-field__unit">{auction.paymentSymbol}</span>
      </div>

      <button
        type="button"
        className="df-btn df-btn--primary df-btn--block"
        disabled={!canSubmit}
        onClick={submit}
      >
        {busy
          ? 'Working…'
          : !aboveCurrent
            ? direction === 'up' ? 'Must be higher' : 'Must be lower'
            : !meetsStep
              ? `Must reach ${fmt(auction.nextBid)} ${auction.paymentSymbol}`
              : !enough
                ? `Need ${fmt(delta)} more ${auction.paymentSymbol}`
                : `Improve to ${fmt(num)} ${auction.paymentSymbol}`}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── Cancel bid ─────────────────────────────────────────────────────── */

export function CancelBidConfirm({ auction, bid, onDone }) {
  const { account, contracts } = useWeb3();
  const [busy, setBusy]     = useState(false);
  const [status, setStatus] = useState(null);

  const submit = async () => {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Cancelling bid…' });
    try {
      await contracts.auction.methods
        .cancelBid(bid.id)
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Bid cancelled.' });
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <div className="df-form__head">
        <h4>Cancel bid #{bid.id}</h4>
      </div>

      <p className="df-muted" style={{ margin: 0 }}>
        Your <b>{fmt(bid.amount)} {auction.paymentSymbol}</b> bid will be withdrawn.
        You can&rsquo;t cancel the current best bid &mdash; outbid someone first or wait
        until you&rsquo;re no longer leading.
      </p>

      <div className="df-detail__actions">
        <button className="df-btn df-btn--ghost" onClick={() => onDone?.()} disabled={busy}>
          Keep bid
        </button>
        <button className="df-btn df-btn--danger" onClick={submit} disabled={busy}>
          {busy ? 'Cancelling…' : 'Cancel bid'}
        </button>
      </div>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── Finalize ───────────────────────────────────────────────────────── */

export function FinalizeAuctionConfirm({ auction, onDone }) {
  const { account, contracts } = useWeb3();
  const [busy, setBusy]     = useState(false);
  const [status, setStatus] = useState(null);

  const submit = async () => {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Claiming auction…' });
    try {
      await contracts.auction.methods
        .claimToFinalizeAuction(auction.id)
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Auction finalized.' });
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <div className="df-form__head">
        <h4>Finalize auction #{auction.id}</h4>
      </div>

      <dl className="df-detail__grid">
        <dt>Best bid</dt>
        <dd>{auction.bestBidID > 0 ? `${fmt(auction.bestBidAmount)} ${auction.paymentSymbol}` : 'No bids yet'}</dd>
        <dt>Time since last update</dt>
        <dd>{fmtDate(auction.lastUpdate)}</dd>
      </dl>

      <p className="df-muted" style={{ margin: 0 }}>
        Claiming finalizes the auction and transfers the lot to the best bidder.
        Anyone can do this once the turn timer hits zero.
      </p>

      <button
        type="button"
        className="df-btn df-btn--primary df-btn--block"
        disabled={busy}
        onClick={submit}
      >
        {busy ? 'Claiming…' : 'Claim & finalize'}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── Bid history list ───────────────────────────────────────────────── */

export function BidHistory({ auction, account, explorer, onImprove, onCancel }) {
  const { bids, loading } = useAuctionBids(auction.id);

  if (loading) return <div className="df-loading" style={{ padding: 24 }}>Loading bids…</div>;
  if (!bids.length) return (
    <div className="df-empty df-empty--inline">
      <h3>No bids yet</h3>
      <p>Be the first to place one.</p>
    </div>
  );

  return (
    <div className="df-bids">
      <h4 className="df-bids__title">Bid history <span className="df-muted">· {bids.length}</span></h4>
      <ul className="df-bids__list">
        {bids.map((b) => {
          const isBest = String(b.id) === String(auction.bestBidID);
          const yours = b.isYours;
          return (
            <li key={b.id} className={`df-bid${isBest ? ' df-bid--best' : ''}${b.canceled ? ' df-bid--cancelled' : ''}`}>
              <div className="df-bid__main">
                <div className="df-bid__amount">
                  {fmt(b.amount)} <small>{auction.paymentSymbol}</small>
                </div>
                <div className="df-bid__meta">
                  <span>#{b.id}</span>
                  <span>·</span>
                  <a className="df-link" target="_blank" rel="noreferrer"
                     href={`${explorer}address/${b.owner}`}>
                    {b.owner.slice(0, 6)}…{b.owner.slice(-4)}
                  </a>
                  {b.time && <><span>·</span><span>{fmtDate(b.time)}</span></>}
                </div>
              </div>

              <div className="df-bid__tags">
                {isBest && <span className="df-pill df-pill--ok">Best</span>}
                {b.canceled && <span className="df-pill df-pill--danger">Cancelled</span>}
                {yours && !b.canceled && <span className="df-pill df-pill--safe">Yours</span>}
              </div>

              {yours && !b.canceled && !auction.finalized && (
                <div className="df-bid__actions">
                  <button className="df-btn df-btn--ghost df-btn--sm" onClick={() => onImprove(b)}>
                    <Icon name="edit" size={14} /> Improve
                  </button>
                  {!isBest && (
                    <button className="df-btn df-btn--ghost df-btn--sm" onClick={() => onCancel(b)}>
                      <Icon name="close" size={14} /> Cancel
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── shared bits ────────────────────────────────────────────────────── */

function BidContextSummary({ auction, balance, allowance }) {
  return (
    <dl className="df-detail__grid">
      <dt>Auction type</dt>
      <dd>
        {auction.type === 'liquidation' && 'Collateral liquidation'}
        {auction.type === 'rle-buyout'  && 'RLE buyout'}
        {auction.type === 'dfc-buyout'  && 'DFC buyout'}
      </dd>
      <dt>Lot</dt>
      <dd>{fmt(auction.lotAmount)} {auction.lotSymbol}</dd>
      <dt>{auction.bestBidID > 0 ? 'Best bid' : 'Min bid'}</dt>
      <dd>{fmt(auction.bestBidID > 0 ? auction.bestBidAmount : auction.nextBid)} {auction.paymentSymbol}</dd>
      <dt>Turn ends in</dt>
      <dd>{fmtCountdown(auction.timeLeft)}</dd>
      <dt>Your balance</dt>
      <dd>{fmt(balance)} {auction.paymentSymbol}</dd>
      <dt>Approved</dt>
      <dd>{fmt(allowance)} {auction.paymentSymbol}</dd>
    </dl>
  );
}

function StatusLine({ status }) {
  if (!status) return null;
  return <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>;
}
