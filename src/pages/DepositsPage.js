import React, { useEffect, useMemo, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useDeposits } from '../hooks/useDeposits';
import PageHead from '../components/redesign/PageHead';
import Icon from '../components/redesign/Icons';
import TokenMark from '../components/redesign/TokenMark';
import { cachedContractCall } from '../utils/cachedContractCall';
import { parseTxError } from '../utils/txError';

const fmt = (n, dp = 2) => {
  if (n == null || Number.isNaN(n)) return '—';
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

export default function DepositsPage() {
  const { account, walletConnected, getAccount } = useWeb3();
  const { rows, stats, totals, loading, refresh } = useDeposits();
  const [pane, setPane] = useState(null); // {kind:'open'|'detail'|'topup'|'withdraw', deposit?:row}

  if (!walletConnected) {
    return (
      <>
        <PageHead title="Yield" accent="deposits" sub="Earn interest by locking DFC into the protocol." />
        <div className="df-empty">
          <div className="df-empty__icon"><Icon name="deposit" /></div>
          <h3>Connect a wallet to manage deposits</h3>
          <p>You'll need a connected wallet to open new deposits, top up, or claim interest.</p>
          <button className="df-btn df-btn--primary" onClick={getAccount}>Connect wallet</button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Yield"
        accent="deposits"
        sub="Earn interest by locking DFC into the protocol."
        actions={
          <>
            <button className="df-btn df-btn--ghost" onClick={refresh} disabled={loading}>
              <Icon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="df-btn df-btn--primary" onClick={() => setPane({ kind: 'open' })}>
              <Icon name="plus" size={16} /> New deposit
            </button>
          </>
        }
      />

      <section className="df-stat-row df-stat-row--3">
        <div className="df-stat">
          <div className="df-stat__label">Your principal</div>
          <div className="df-stat__value">{fmt(totals.principal)} <span className="df-stat__unit">DFC</span></div>
          <div className="df-stat__sub">{rows.length} active deposit{rows.length === 1 ? '' : 's'}</div>
        </div>
        <div className="df-stat">
          <div className="df-stat__label">Claimable interest</div>
          <div className="df-stat__value df-accent-text">+{fmt(totals.interest, 4)} <span className="df-stat__unit">DFC</span></div>
          <div className="df-stat__sub">accrues every block</div>
        </div>
        <div className="df-stat">
          <div className="df-stat__label">Current rate</div>
          <div className="df-stat__value">{stats.rate != null ? `${stats.rate}%` : '—'}</div>
          <div className="df-stat__sub">{stats.totalCount != null ? `${stats.totalCount} protocol deposits` : 'set by INTDAO'}</div>
        </div>
      </section>

      {loading && rows.length === 0 ? (
        <div className="df-loading">Loading deposits…</div>
      ) : rows.length === 0 ? (
        <div className="df-empty">
          <div className="df-empty__icon"><Icon name="deposit" /></div>
          <h3>No active deposits yet</h3>
          <p>Lock DFC into a deposit to start earning interest at the current rate.</p>
          <button className="df-btn df-btn--primary" onClick={() => setPane({ kind: 'open' })}>
            <Icon name="plus" size={16} /> Open your first deposit
          </button>
        </div>
      ) : (
        <section className="df-cards">
          {rows.map(r => (
            <DepositCard
              key={r.id}
              row={r}
              onOpen={() => setPane({ kind: 'detail', deposit: r })}
              onTopUp={() => setPane({ kind: 'topup', deposit: r })}
              onWithdraw={() => setPane({ kind: 'withdraw', deposit: r })}
            />
          ))}
        </section>
      )}

      {pane && (
        <DepositDrawer
          pane={pane}
          onClose={() => setPane(null)}
          onDone={() => { setPane(null); refresh(); }}
        />
      )}
    </>
  );
}

function DepositCard({ row, onOpen, onTopUp, onWithdraw }) {
  return (
    <article className="df-card df-deposit-card">
      <header className="df-card__head">
        <TokenMark symbol="DFC" size={44} />
        <div className="df-card__title-block">
          <h3 className="df-card__title">Deposit #{row.id}</h3>
          <div className="df-card__sub">opened {fmtRel(row.opened)}</div>
        </div>
        <button className="df-icon-btn" onClick={onOpen} aria-label="View details">
          <Icon name="arrow-up-right" size={16} />
        </button>
      </header>

      <div className="df-deposit-card__body">
        <div className="df-pos-grid">
          <dt>Principal</dt>
          <dd>{fmt(row.coinsDeposited)} DFC</dd>
          <dt>Interest accrued</dt>
          <dd className="df-accent-text">+{fmt(row.accumulatedInterest, 4)} DFC</dd>
          <dt>Last update</dt>
          <dd>{fmtRel(row.updated || row.opened)}</dd>
        </div>
      </div>

      <footer className="df-card__foot">
        <button className="df-btn df-btn--ghost df-btn--sm" onClick={onTopUp}>
          <Icon name="plus" size={16} /> Top up
        </button>
        <button className="df-btn df-btn--ghost df-btn--sm" onClick={onWithdraw}>
          <Icon name="arrow-down-left" size={16} /> Withdraw
        </button>
      </footer>
    </article>
  );
}

function DepositDrawer({ pane, onClose, onDone }) {
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

  const titles = {
    open:     ['Open new', 'deposit', 'Lock DFC to start earning interest at the current rate.'],
    topup:    ['Top up', `deposit #${pane.deposit?.id}`, 'Add more DFC to an existing deposit.'],
    withdraw: ['Withdraw from', `deposit #${pane.deposit?.id}`, 'Withdraw all or part of your principal.'],
    detail:   ['Deposit', `#${pane.deposit?.id}`, 'Detail and on-chain actions.'],
  };
  const [eyebrow, title, sub] = titles[pane.kind] || [];

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
          {pane.kind === 'open' && <OpenDepositForm onDone={onDone} />}
          {pane.kind === 'topup' && <TopUpForm depositId={pane.deposit.id} onDone={onDone} />}
          {pane.kind === 'withdraw' && <WithdrawForm deposit={pane.deposit} onDone={onDone} />}
          {pane.kind === 'detail' && <DepositDetail deposit={pane.deposit} onDone={onDone} />}
        </div>
      </aside>
    </div>
  );
}

/* ── Forms ────────────────────────────────────────────── */

function useDfcBalanceAndAllowance() {
  const { web3, contracts, account } = useWeb3();
  const [bal, setBal] = useState(null);
  const [allowance, setAllowance] = useState(null);

  const reload = async () => {
    if (!contracts?.flatCoin || !account) return;
    try {
      const [b, a] = await Promise.all([
        // noCache: live read after approve/transfer; cached values lag.
        cachedContractCall('flatCoin', 'balanceOf', [account], contracts.flatCoin, { noCache: true }),
        cachedContractCall(
          'flatCoin', 'allowance',
          [account, contracts.deposit?._address],
          contracts.flatCoin,
          { noCache: true },
        ).catch(() => '0'),
      ]);
      setBal(Number(b) / 1e18);
      setAllowance(Number(a) / 1e18);
    } catch (e) { console.warn(e); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [account, contracts]);
  return { web3, contracts, account, bal, allowance, reload };
}

function OpenDepositForm({ onDone }) {
  const { web3, contracts, account, bal, allowance, reload } = useDfcBalanceAndAllowance();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const num = Number(amount);
  // The deposit contract pulls `allowance`, not a passed amount — so allowance
  // must EXACTLY match what the user wants to lock. If they approved more last
  // session, we still re-approve so the deposit reflects the typed amount.
  const needsApproval = num > 0 && (allowance == null || Math.abs(num - allowance) > 1e-9);
  const valid = num > 0 && bal != null && num <= bal && contracts?.deposit && contracts?.flatCoin;
  const staleApproval = num > 0 && allowance > 0 && allowance !== num;
  const overBalance = num > 0 && bal != null && num > bal;

  async function approve() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Approving DFC…' });
    try {
      await contracts.flatCoin.methods
        .approve(contracts.deposit._address, web3.utils.toWei(String(amount), 'ether'))
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Approved' });
      reload();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  async function deposit() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Opening deposit…' });
    try {
      await contracts.deposit.methods.deposit().send({ from: account });
      setStatus({ kind: 'ok', msg: 'Deposit opened' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <AmountField symbol="DFC" balance={bal} value={amount} onChange={setAmount} />
      {overBalance && (
        <div className="df-hint df-hint--warn">
          You’re trying to deposit <b>{fmt(num)} DFC</b> but only have <b>{fmt(bal)} DFC</b> in your wallet.
        </div>
      )}
      {staleApproval && needsApproval && !overBalance && (
        <div className="df-hint">
          You previously approved <b>{fmt(allowance)} DFC</b>. We’ll re-approve to match the new amount before depositing.
        </div>
      )}
      {status && <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>}
      <div className="df-form__actions">
        {needsApproval ? (
          <button className="df-btn df-btn--primary df-btn--block" disabled={!valid || busy} onClick={approve}>
            {busy ? 'Approving…' : `Step 1 of 2 · Approve ${amount || 0} DFC`}
          </button>
        ) : (
          <button className="df-btn df-btn--primary df-btn--block" disabled={!valid || busy} onClick={deposit}>
            {busy ? 'Opening…' : <><Icon name="deposit" size={16} /> Lock {fmt(num)} DFC into deposit</>}
          </button>
        )}
      </div>
      <p className="df-fineprint">
        DFC moves from your wallet to the deposit contract. Withdraw any time.
      </p>
    </div>
  );
}

function TopUpForm({ depositId, onDone }) {
  const { web3, contracts, account, bal, allowance, reload } = useDfcBalanceAndAllowance();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const num = Number(amount);
  const needsApproval = num > 0 && (allowance == null || Math.abs(num - allowance) > 1e-9);
  const valid = num > 0 && bal != null && num <= bal && contracts?.deposit;
  const staleApproval = num > 0 && allowance > 0 && allowance !== num;
  const overBalance = num > 0 && bal != null && num > bal;

  async function approve() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Approving DFC…' });
    try {
      await contracts.flatCoin.methods
        .approve(contracts.deposit._address, web3.utils.toWei(String(amount), 'ether'))
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Approved' });
      reload();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  async function topUp() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Topping up…' });
    try {
      await contracts.deposit.methods.topUp(depositId).send({ from: account });
      setStatus({ kind: 'ok', msg: 'Top-up confirmed' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <AmountField symbol="DFC" balance={bal} value={amount} onChange={setAmount} />
      {overBalance && (
        <div className="df-hint df-hint--warn">
          You’re trying to add <b>{fmt(num)} DFC</b> but only have <b>{fmt(bal)} DFC</b> in your wallet.
        </div>
      )}
      {staleApproval && needsApproval && !overBalance && (
        <div className="df-hint">
          You previously approved <b>{fmt(allowance)} DFC</b>. We’ll re-approve to match the new amount before topping up.
        </div>
      )}
      {status && <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>}
      {needsApproval ? (
        <button className="df-btn df-btn--primary df-btn--block" disabled={!valid || busy} onClick={approve}>
          {busy ? 'Approving…' : `Step 1 of 2 · Approve ${amount || 0} DFC`}
        </button>
      ) : (
        <button className="df-btn df-btn--primary df-btn--block" disabled={!valid || busy} onClick={topUp}>
          {busy ? 'Topping up…' : <><Icon name="plus" size={16} /> Add {fmt(num)} DFC to deposit</>}
        </button>
      )}
    </div>
  );
}

function WithdrawForm({ deposit, onDone }) {
  const { web3, contracts, account } = useWeb3();
  const [amount, setAmount] = useState(String(deposit.coinsDeposited));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const num = Number(amount);
  const valid = num > 0 && num <= deposit.coinsDeposited;

  async function withdraw() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Withdrawing…' });
    try {
      await contracts.deposit.methods
        .withdraw(deposit.id, web3.utils.toWei(String(amount), 'ether'))
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Withdrawn' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <AmountField symbol="DFC" balance={deposit.coinsDeposited} balanceLabel="In deposit" value={amount} onChange={setAmount} />
      {status && <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>}
      <button className="df-btn df-btn--primary df-btn--block" disabled={!valid || busy} onClick={withdraw}>
        {busy ? 'Withdrawing…' : <><Icon name="arrow-down-left" size={16} /> Withdraw {fmt(num)} DFC</>}
      </button>
      <p className="df-fineprint">
        Interest accrued so far ({fmt(deposit.accumulatedInterest, 4)} DFC) is paid out separately — use Claim interest from the detail view.
      </p>
    </div>
  );
}

function DepositDetail({ deposit, onDone }) {
  const { web3, contracts, account } = useWeb3();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function claim() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Claiming interest…' });
    try {
      await contracts.deposit.methods.claimInterest(deposit.id).send({ from: account });
      setStatus({ kind: 'ok', msg: 'Claimed' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <dl className="df-pos-grid df-pos-grid--big">
        <dt>Principal</dt><dd>{fmt(deposit.coinsDeposited)} DFC</dd>
        <dt>Accrued interest</dt><dd className="df-accent-text">+{fmt(deposit.accumulatedInterest, 4)} DFC</dd>
        <dt>Opened</dt><dd>{deposit.opened?.toLocaleDateString() || '—'}</dd>
        <dt>Last updated</dt><dd>{deposit.updated?.toLocaleDateString() || '—'}</dd>
      </dl>
      {status && <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>}
      <button className="df-btn df-btn--primary df-btn--block" disabled={busy || deposit.accumulatedInterest <= 0} onClick={claim}>
        {busy ? 'Claiming…' : <><Icon name="send" size={16} /> Claim {fmt(deposit.accumulatedInterest, 4)} DFC interest</>}
      </button>
    </>
  );
}

function AmountField({ symbol, balance, balanceLabel = 'Balance', value, onChange }) {
  const fillMax = () => balance != null && onChange(String(balance));
  return (
    <div className="df-field">
      <div className="df-field__row">
        <label>Amount</label>
        {balance != null && (
          <button type="button" className="df-link" onClick={fillMax}>
            {balanceLabel}: {fmt(balance)} {symbol}
          </button>
        )}
      </div>
      <div className="df-field__amount">
        <input
          type="number" min="0" step="any" placeholder="0.0"
          value={value} onChange={e => onChange(e.target.value)}
        />
        <span className="df-field__unit">{symbol}</span>
      </div>
    </div>
  );
}
