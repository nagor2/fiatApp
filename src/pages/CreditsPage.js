import React, { useEffect, useMemo, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useCredits } from '../hooks/useCredits';
import PageHead from '../components/redesign/PageHead';
import Icon from '../components/redesign/Icons';
import Spinner from '../components/Spinner';
import TokenMark from '../components/redesign/TokenMark';
import { cachedContractCall } from '../utils/cachedContractCall';
import { parseTxError } from '../utils/txError';
import {
  OpenCreditForm, UpdateCreditForm, PayInterestForm,
  WithdrawEthForm, CloseCreditForm,
} from '../components/CreditsForms';
import '../styles/credits.css';

/* ── helpers ──────────────────────────────────────────── */

const fmt = (n, dp = 2) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp === 2 ? 2 : 0 });
};
const fmtRel = (d) => {
  if (!d) return '—';
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

/**
 * Liquidation thresholds.
 * Mapped from the legacy 0/1/2 status the contract returns:
 *   0 = healthy, 1 = at-risk (close to liquidation), 2 = liquidated.
 * The healthRatio is collateralUsd / debtTotal — we keep the visual
 * thresholds conservative so we don't lie about safety.
 */
function healthBand(ratio, status) {
  if (status >= 2) return { tone: 'danger', label: 'Liquidated' };
  if (status === 1 || ratio < 1.2) return { tone: 'danger',  label: 'At risk' };
  if (ratio < 1.5)                  return { tone: 'warn',   label: 'Caution' };
  if (ratio < 2.0)                  return { tone: 'ok',     label: 'Healthy' };
  return                              { tone: 'safe',   label: 'Well-collateralized' };
}

/* ── page ─────────────────────────────────────────────── */

export default function CreditsPage() {
  const { account, walletConnected, getAccount, ethPrice } = useWeb3();
  const { rows, stats, totals, loading, refresh } = useCredits();
  const [pane, setPane] = useState(null);
  // pane = {kind:'open'|'detail'|'update'|'pay'|'withdrawEth'|'close', position?:row}

  if (!walletConnected) {
    return (
      <>
        <PageHead title="Credit" accent="credits" sub="Borrow DFC against your ETH collateral." />
        <div className="df-empty">
          <div className="df-empty__icon"><Icon name="loan" /></div>
          <h3>Connect a wallet to manage debt positions</h3>
          <p>You'll need a connected wallet to open new credit lines, top up collateral, or close positions.</p>
          <button className="df-btn df-btn--primary" onClick={getAccount}>Connect wallet</button>
        </div>
      </>
    );
  }

  const atRiskCount = rows.filter(r => r.liquidationStatus >= 1 || r.healthRatio < 1.2).length;

  return (
    <>
      <PageHead
        title="Credit"
        accent="credits"
        sub="Borrow DFC against your ETH collateral."
        actions={
          <>
            <button className="df-btn df-btn--ghost" onClick={refresh} disabled={loading}>
              <Icon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="df-btn df-btn--primary" onClick={() => setPane({ kind: 'open' })}>
              <Icon name="plus" size={16} /> New credit
            </button>
          </>
        }
      />

      <section className="df-stat-row df-stat-row--4">
        <div className="df-stat">
          <div className="df-stat__label">Outstanding debt</div>
          <div className="df-stat__value">{fmt(totals.debt)} <span className="df-stat__unit">DFC</span></div>
          <div className="df-stat__sub">{fmt(totals.minted)} principal + {fmt(totals.accrued, 4)} interest</div>
        </div>
        <div className="df-stat">
          <div className="df-stat__label">Collateral locked</div>
          <div className="df-stat__value">{fmt(totals.collateral, 4)} <span className="df-stat__unit">ETH</span></div>
          <div className="df-stat__sub">≈ ${fmt(totals.collateralUsd)}</div>
        </div>
        <div className="df-stat">
          <div className="df-stat__label">Interest rate</div>
          <div className="df-stat__value">{stats.interestRate != null ? `${stats.interestRate}%` : '—'}</div>
          <div className="df-stat__sub">{stats.collateralDiscount != null ? `${stats.collateralDiscount}% collateral discount` : 'set by INTDAO'}</div>
        </div>
        <div className={`df-stat ${atRiskCount ? 'df-stat--danger' : ''}`}>
          <div className="df-stat__label">Positions</div>
          <div className="df-stat__value">{rows.length}</div>
          <div className="df-stat__sub">
            {atRiskCount > 0
              ? <span className="df-warn-text"><Icon name="alert" size={12} /> {atRiskCount} at risk</span>
              : 'all healthy'}
          </div>
        </div>
      </section>

      {loading && rows.length === 0 ? (
        <div className="df-loading"><Spinner size={20} /> Loading positions…</div>
      ) : rows.length === 0 ? (
        <div className="df-empty">
          <div className="df-empty__icon"><Icon name="loan" /></div>
          <h3>No active credit positions</h3>
          <p>Lock ETH as collateral to mint DFC against it. Pay interest periodically; close any time by repaying the debt.</p>
          <button className="df-btn df-btn--primary" onClick={() => setPane({ kind: 'open' })}>
            <Icon name="plus" size={16} /> Open your first credit line
          </button>
        </div>
      ) : (
        <section className="df-cards">
          {rows.map(r => (
            <CreditCard key={r.id} row={r} onSelect={() => setPane({ kind: 'detail', position: r })} />
          ))}
        </section>
      )}

      <Drawer pane={pane} onClose={() => setPane(null)} setPane={setPane} onDone={() => { setPane(null); refresh(); }} />
    </>
  );
}

/* ── card ─────────────────────────────────────────────── */

function CreditCard({ row, onSelect }) {
  const band = healthBand(row.healthRatio, row.liquidationStatus);
  const ratioPct = !Number.isFinite(row.healthRatio) ? 100
                 : Math.max(0, Math.min(100, (row.healthRatio - 1) / 1.5 * 100)); // 1.0 = 0%, 2.5+ = 100%

  return (
    <button className="df-card" onClick={onSelect}>
      <div className="df-card__head">
        <div className="df-card__id">
          <TokenMark sym="ETH" size={28} />
          <div>
            <div className="df-card__title">Credit #{String(row.id)}</div>
            <div className="df-card__sub">{fmtRel(row.opened)}</div>
          </div>
        </div>
        <div className={`df-pill df-pill--${band.tone}`}>{band.label}</div>
      </div>

      <div className="df-card__row">
        <div className="df-card__metric">
          <div className="df-card__metric-label">Debt</div>
          <div className="df-card__metric-value">{fmt(row.debtTotal)} <span>DFC</span></div>
        </div>
        <div className="df-card__metric df-card__metric--right">
          <div className="df-card__metric-label">Collateral</div>
          <div className="df-card__metric-value">{fmt(row.ethLocked, 4)} <span>ETH</span></div>
        </div>
      </div>

      <div className="df-health">
        <div className="df-health__bar">
          <div className={`df-health__fill df-health__fill--${band.tone}`} style={{ width: `${ratioPct}%` }} />
          <div className="df-health__tick" style={{ left: '0%' }} title="Liquidation (1.0×)" />
          <div className="df-health__tick" style={{ left: '33%' }} title="Caution (1.5×)" />
          <div className="df-health__tick" style={{ left: '67%' }} title="Healthy (2.0×)" />
        </div>
        <div className="df-health__label">
          {Number.isFinite(row.healthRatio)
            ? `${row.healthRatio.toFixed(2)}× collateralized`
            : 'no debt'}
        </div>
      </div>

      {row.interestAccrued > 0 && (
        <div className="df-card__foot">
          <Icon name="alert" size={12} /> Interest owed: <b>{fmt(row.interestAccrued, 4)} DFC</b>
        </div>
      )}
    </button>
  );
}

/* ── drawer ───────────────────────────────────────────── */

function Drawer({ pane, onClose, setPane, onDone }) {
  // Esc to close + body scroll lock (mobile parity with Deposits)
  useEffect(() => {
    if (!pane) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [pane, onClose]);

  if (!pane) return null;

  const eyebrowByKind = {
    open: 'New credit',
    detail: `Credit #${pane.position?.id}`,
    update: `Credit #${pane.position?.id}`,
    pay: `Credit #${pane.position?.id}`,
    withdrawEth: `Credit #${pane.position?.id}`,
    close: `Credit #${pane.position?.id}`,
  };
  const titleByKind = {
    open: 'Open new credit',
    detail: 'Position details',
    update: 'Adjust collateral',
    pay: 'Pay interest',
    withdrawEth: 'Withdraw ETH',
    close: 'Close credit',
  };
  const eyebrow = eyebrowByKind[pane.kind] || 'Credit';
  const title = titleByKind[pane.kind] || 'Credit';
  const sub = pane.kind === 'open'
    ? 'Lock ETH as collateral and mint DFC against it.'
    : pane.position
      ? `Opened ${fmtRel(pane.position.opened)} · ${fmt(pane.position.debtTotal)} DFC owed`
      : null;

  return (
    <div className="df-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="df-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="df-drawer__head">
          <button className="df-icon-btn df-drawer__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          <div className="df-drawer__title">
            <TokenMark symbol="DFC" size={36} />
            <div>
              <div className="df-eyebrow">{eyebrow}</div>
              <h3>{title}</h3>
            </div>
          </div>
        </header>

        <div className="df-drawer__body">
          {sub && <p className="df-muted df-drawer__lede">{sub}</p>}
          {pane.kind === 'open'        && <OpenCreditForm onDone={onDone} />}
          {pane.kind === 'detail'      && <CreditDetail position={pane.position} setPane={setPane} />}
          {pane.kind === 'update'      && <UpdateCreditForm position={pane.position} onDone={onDone} />}
          {pane.kind === 'pay'         && <PayInterestForm position={pane.position} onDone={onDone} />}
          {pane.kind === 'withdrawEth' && <WithdrawEthForm position={pane.position} onDone={onDone} />}
          {pane.kind === 'close'       && <CloseCreditForm position={pane.position} onDone={onDone} />}
        </div>
      </aside>
    </div>
  );
}

/* ── detail ───────────────────────────────────────────── */

function CreditDetail({ position, setPane }) {
  const band = healthBand(position.healthRatio, position.liquidationStatus);
  return (
    <div className="df-detail">
      <div className="df-detail__hero">
        <div className="df-detail__hero-row">
          <span className="df-detail__hero-label">Outstanding debt</span>
          <span className="df-detail__hero-value">{fmt(position.debtTotal)} <small>DFC</small></span>
        </div>
        <div className="df-detail__hero-row">
          <span className="df-detail__hero-label">Collateral</span>
          <span className="df-detail__hero-value">{fmt(position.ethLocked, 4)} <small>ETH</small></span>
        </div>
        <div className={`df-detail__hero-pill df-pill df-pill--${band.tone}`}>
          {band.label} · {Number.isFinite(position.healthRatio) ? `${position.healthRatio.toFixed(2)}×` : '∞'}
        </div>
      </div>

      <dl className="df-detail__grid">
        <dt>DFC minted</dt>            <dd>{fmt(position.coinsMinted)}</dd>
        <dt>Interest accrued</dt>      <dd>{fmt(position.interestAccrued, 4)}</dd>
        <dt>Interest recorded</dt>     <dd>{fmt(position.interestRecorded, 4)}</dd>
        <dt>Collateral USD</dt>        <dd>${fmt(position.collateralUsd)}</dd>
        <dt>Opened</dt>                <dd>{position.opened?.toLocaleDateString() ?? '—'}</dd>
        <dt>Last update</dt>           <dd>{position.updated?.toLocaleDateString() ?? '—'}</dd>
      </dl>

      <div className="df-detail__actions">
        <button className="df-btn df-btn--ghost" onClick={() => setPane({ kind: 'update', position })}>
          <Icon name="edit" size={16} /> Adjust
        </button>
        <button className="df-btn df-btn--ghost" onClick={() => setPane({ kind: 'pay', position })}>
          <Icon name="receipt" size={16} /> Pay interest
        </button>
        <button className="df-btn df-btn--ghost" onClick={() => setPane({ kind: 'withdrawEth', position })}>
          <Icon name="arrow-down-left" size={16} /> Withdraw ETH
        </button>
        <button className="df-btn df-btn--danger" onClick={() => setPane({ kind: 'close', position })}>
          <Icon name="close" size={16} /> Close credit
        </button>
      </div>
    </div>
  );
}
