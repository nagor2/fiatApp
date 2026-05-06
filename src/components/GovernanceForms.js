/**
 * Pool / governance action forms — opened from the drawer in PoolPage.
 *
 * Mirrors the AuctionsForms canonical pattern:
 *   try { await tx.send(...); }
 *   catch (e) { setStatus(parseTxError(e)); }
 *   finally   { setBusy(false); }
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { batchCachedContractCalls } from '../utils/cachedContractCall';
import { parseTxError } from '../utils/txError';
import { KNOWN_PARAMS, KNOWN_ADDRESSES, VOTING_TYPES, formatParamValue } from '../hooks/useGovernance';
import Icon from './redesign/Icons';

/* ── tiny formatters (local; matches PoolPage) ──────── */

const fmt = (n, dp = 2) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: dp,
    minimumFractionDigits: dp === 2 ? 2 : 0,
  });
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const isAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(String(a || '').trim());

/* ── status pill (shared) ──────────────────────────── */

function StatusLine({ status }) {
  if (!status) return null;
  return <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>;
}

/* ── shared: live RLE balance + DAO allowance ──────── */

function useRuleContext(pool) {
  const { account, contracts } = useWeb3();
  const [balance, setBalance]     = useState(0);
  const [allowance, setAllowance] = useState(0);

  const reload = async () => {
    if (!account || !contracts?.rule || !pool?.daoAddress) return;
    const res = await batchCachedContractCalls([
      { contractKey: 'rule', methodName: 'balanceOf', args: [account], noCache: true },
      { contractKey: 'rule', methodName: 'allowance', args: [account, pool.daoAddress], noCache: true },
    ]);
    if (res[0]?.success) setBalance(Number(res[0].result) / 1e18);
    if (res[1]?.success) setAllowance(Number(res[1].result) / 1e18);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [account, pool?.daoAddress]);

  return { balance, allowance, reload };
}

/* ── Pool RLE (approve + pool in one button) ───────── */

export function PoolTokensForm({ pool, onDone }) {
  const { account, contracts, web3 } = useWeb3();
  const { balance, allowance, reload } = useRuleContext(pool);
  const [amount, setAmount] = useState('');
  const [busy, setBusy]     = useState(false);
  const [status, setStatus] = useState(null);

  const num = Number(amount) || 0;
  const enough = num <= balance + 1e-9;
  const canSubmit = !busy && num > 0 && enough;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Preparing transaction…' });
    try {
      const wei = web3.utils.toWei(String(num));
      if (allowance + 1e-12 < num) {
        setStatus({ kind: 'pending', msg: `Approving ${fmt(num, 4)} RLE…` });
        await contracts.rule.methods
          .approve(pool.daoAddress, wei)
          .send({ from: account });
      }
      setStatus({ kind: 'pending', msg: 'Pooling tokens…' });
      await contracts.dao.methods.poolTokens().send({ from: account });
      setStatus({ kind: 'ok', msg: 'Tokens pooled.' });
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
      <p className="df-muted df-drawer__lede">
        Pool RLE into the DAO to vote on proposals and claim rewards from
        protocol fees. You can return your tokens at any time when no vote
        is active.
      </p>

      <dl className="df-detail__grid">
        <dt>Currently pooled</dt><dd>{fmt(pool.userPooled, 4)} RLE</dd>
        <dt>Wallet balance</dt><dd>{fmt(balance, 4)} RLE</dd>
        <dt>Approved</dt><dd>{fmt(allowance, 4)} RLE</dd>
      </dl>

      <div className="df-field df-field__amount">
        <label>Amount to pool</label>
        <input
          type="number" min={0} step="0.0001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <span className="df-field__unit">RLE</span>
      </div>

      <div className="df-form__row" style={{ gap: 8 }}>
        <button type="button" className="df-btn df-btn--ghost df-btn--sm"
                disabled={busy || balance <= 0}
                onClick={() => setAmount(String(balance))}>
          Max ({fmt(balance, 4)})
        </button>
        <button type="button" className="df-btn df-btn--ghost df-btn--sm"
                disabled={busy || balance <= 0}
                onClick={() => setAmount(String(balance / 2))}>
          Half
        </button>
      </div>

      <button type="button" className="df-btn df-btn--primary df-btn--block"
              disabled={!canSubmit} onClick={submit}>
        {busy
          ? 'Working…'
          : !enough
            ? 'Insufficient RLE'
            : allowance + 1e-12 < num
              ? `Approve & pool ${fmt(num, 4)} RLE`
              : `Pool ${fmt(num, 4)} RLE`}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── Return RLE ────────────────────────────────────── */

export function ReturnTokensForm({ pool, onDone }) {
  const { account, contracts } = useWeb3();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const submit = async () => {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Returning tokens…' });
    try {
      await contracts.dao.methods.returnTokens().send({ from: account });
      setStatus({ kind: 'ok', msg: 'Tokens returned.' });
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <p className="df-muted df-drawer__lede">
        Withdraw your pooled RLE back to your wallet. You\u2019ll lose the
        ability to vote on the next proposal until you re-pool.
      </p>

      <dl className="df-detail__grid">
        <dt>Pooled</dt><dd>{fmt(pool.userPooled, 4)} RLE</dd>
        <dt>Active voting?</dt>
        <dd>{pool.activeVoting
          ? <span className="df-pill df-pill--warn">Yes — return may be blocked</span>
          : <span className="df-pill df-pill--ok">No — safe to return</span>}
        </dd>
      </dl>

      <button type="button" className="df-btn df-btn--primary df-btn--block"
              disabled={busy || pool.userPooled <= 0}
              onClick={submit}>
        {busy ? 'Working…' : `Return ${fmt(pool.userPooled, 4)} RLE`}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── Vote on the active proposal ───────────────────── */

export function VoteForm({ pool, onDone }) {
  const { account, contracts } = useWeb3();
  const [decision, setDecision] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const v = pool.voting;

  const submit = async () => {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Casting vote…' });
    try {
      await contracts.dao.methods.vote(decision).send({ from: account });
      setStatus({ kind: 'ok', msg: 'Vote cast.' });
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <p className="df-muted df-drawer__lede">
        Cast your vote on proposal #{v?.id}. Your weight equals the RLE you
        currently have pooled ({fmt(pool.userPooled, 4)} RLE).
      </p>

      <ProposalSummary voting={v} />

      <div className="df-vote-choice">
        <button type="button"
                className={`df-vote-btn ${decision ? 'is-active is-yes' : ''}`}
                onClick={() => setDecision(true)}
                disabled={busy}>
          <Icon name="check" size={18} />
          <strong>For</strong>
          <small>Apply this change</small>
        </button>
        <button type="button"
                className={`df-vote-btn ${!decision ? 'is-active is-no' : ''}`}
                onClick={() => setDecision(false)}
                disabled={busy}>
          <Icon name="close" size={18} />
          <strong>Against</strong>
          <small>Keep things as they are</small>
        </button>
      </div>

      <button type="button" className="df-btn df-btn--primary df-btn--block"
              disabled={busy || pool.userPooled <= 0}
              onClick={submit}>
        {busy
          ? 'Working…'
          : pool.userPooled <= 0
            ? 'Pool RLE first to vote'
            : `Vote ${decision ? 'For' : 'Against'}`}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── Claim to finalize ────────────────────────────── */

export function ClaimToFinalizeForm({ pool, onDone }) {
  const { account, contracts } = useWeb3();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const v = pool.voting;

  const submit = async () => {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Finalizing…' });
    try {
      await contracts.dao.methods.claimToFinalizeCurrentVoting().send({ from: account });
      setStatus({ kind: 'ok', msg: 'Voting finalized.' });
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <p className="df-muted df-drawer__lede">
        Close out the current voting. If the &ldquo;For&rdquo; weight passes
        threshold the change is applied; otherwise it\u2019s discarded. Anyone
        can call this once the voting window has elapsed.
      </p>

      <ProposalSummary voting={v} />

      <button type="button" className="df-btn df-btn--primary df-btn--block"
              disabled={busy} onClick={submit}>
        {busy ? 'Working…' : 'Claim & finalize'}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── New voting (Param / Address / Pause / Authorize) ─ */

export function NewVotingForm({ pool, onDone }) {
  const { account, contracts } = useWeb3();
  const [type, setType] = useState(1);
  const [paramName,   setParamName]   = useState(KNOWN_PARAMS[0].name);
  const [paramValue,  setParamValue]  = useState('');
  const [addrName,    setAddrName]    = useState(KNOWN_ADDRESSES[0].name);
  const [addrValue,   setAddrValue]   = useState('');
  const [decision,    setDecision]    = useState(true);
  const [authName,    setAuthName]    = useState('');
  const [busy, setBusy]   = useState(false);
  const [status, setStatus] = useState(null);

  const currentParamMeta = useMemo(
    () => KNOWN_PARAMS.find((p) => p.name === paramName),
    [paramName],
  );
  const currentParam = useMemo(
    () => pool.params.find((p) => p.name === paramName),
    [pool.params, paramName],
  );
  const currentAddrMeta = useMemo(
    () => KNOWN_ADDRESSES.find((a) => a.name === addrName),
    [addrName],
  );
  const currentAddr = useMemo(
    () => pool.addresses.find((a) => a.name === addrName),
    [pool.addresses, addrName],
  );

  /* ── per-type validation ─────────────────────────── */
  let valid = false;
  let validationMsg = null;

  if (type === 1) {
    const n = Number(paramValue);
    valid = paramName.length > 0 && Number.isFinite(n) && n >= 0;
    if (!valid) validationMsg = 'Enter a non-negative number.';
    if (valid && currentParamMeta?.unit === 'percent' && n > 100) {
      validationMsg = `Heads up: ${currentParamMeta.label} above 100% is unusual.`;
    }
  } else if (type === 2) {
    valid = addrName.length > 0 && isAddress(addrValue);
    if (!valid) validationMsg = 'Address must be a 0x-prefixed 40-character hex string.';
  } else if (type === 3) {
    valid = true;
  } else if (type === 4) {
    valid = authName.trim().length > 0;
    if (!valid) validationMsg = 'Enter the contract key (e.g. cdp, deposit, basket).';
  }

  const canSubmit = !busy && pool.userPooled > 0 && !pool.activeVoting && valid;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Submitting proposal…' });
    try {
      let votingType, name, value, address, dec;
      if (type === 1) {
        votingType = 1;
        name = paramName;
        value = String(Math.trunc(Number(paramValue)));
        address = ZERO_ADDRESS;
        dec = false;
      } else if (type === 2) {
        votingType = 2;
        name = addrName;
        value = '0';
        address = addrValue.trim();
        dec = false;
      } else if (type === 3) {
        votingType = 3;
        name = 'paused';
        value = '0';
        address = ZERO_ADDRESS;
        dec = decision;
      } else { // 4
        votingType = 4;
        name = authName.trim();
        value = '0';
        address = ZERO_ADDRESS;
        dec = decision;
      }

      await contracts.dao.methods
        .addVoting(votingType, name, value, address, dec)
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Proposal submitted.' });
      onDone?.();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="df-form">
      <p className="df-muted df-drawer__lede">
        Open a new governance vote. Only callable while no other voting is
        active. Your proposal goes live the moment this transaction is mined.
      </p>

      {pool.activeVoting && (
        <div className="df-callout df-callout--warn">
          A voting is already active — finalize it before submitting a new one.
        </div>
      )}
      {pool.userPooled <= 0 && (
        <div className="df-callout df-callout--warn">
          Pool RLE first — only pooled holders can submit proposals.
        </div>
      )}

      <div className="df-field">
        <label>Proposal type</label>
        <div className="df-radio-row">
          {Object.values(VOTING_TYPES).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`df-radio-btn ${type === t.id ? 'is-active' : ''}`}
              onClick={() => setType(t.id)}
              disabled={busy}
            >
              <strong>{t.short}</strong>
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
      </div>

      {type === 1 && (
        <>
          <div className="df-field">
            <label>Parameter</label>
            <select value={paramName} onChange={(e) => setParamName(e.target.value)} disabled={busy}>
              {KNOWN_PARAMS.map((p) => (
                <option key={p.name} value={p.name}>{p.label} · current {currentParam?.display || '—'}</option>
              ))}
            </select>
            {currentParamMeta?.hint && <small className="df-field__hint">{currentParamMeta.hint}</small>}
          </div>
          <div className="df-field df-field__amount">
            <label>New value</label>
            <input type="number" min={0} step={1}
                   value={paramValue}
                   onChange={(e) => setParamValue(e.target.value)}
                   disabled={busy} />
            <span className="df-field__unit">
              {currentParamMeta?.unit === 'percent' ? '%' : currentParamMeta?.unit === 'seconds' ? 'sec' : ''}
            </span>
          </div>
          {paramValue !== '' && currentParam && (
            <div className="df-diff">
              <span>Current</span>
              <strong>{currentParam.display}</strong>
              <span className="df-diff__arrow">→</span>
              <strong>{formatParamValue(Number(paramValue), currentParamMeta?.unit)}</strong>
            </div>
          )}
        </>
      )}

      {type === 2 && (
        <>
          <div className="df-field">
            <label>Contract slot</label>
            <select value={addrName} onChange={(e) => setAddrName(e.target.value)} disabled={busy}>
              {KNOWN_ADDRESSES.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.label} · current {currentAddr?.value
                    ? `${currentAddr.value.slice(0, 6)}…${currentAddr.value.slice(-4)}`
                    : '—'}
                </option>
              ))}
            </select>
            {currentAddrMeta?.hint && <small className="df-field__hint">{currentAddrMeta.hint}</small>}
          </div>
          <div className="df-field">
            <label>New address</label>
            <input type="text"
                   placeholder="0x…"
                   value={addrValue}
                   onChange={(e) => setAddrValue(e.target.value)}
                   disabled={busy}
                   spellCheck={false} />
          </div>
        </>
      )}

      {type === 3 && (
        <div className="df-field">
          <label>Pause state</label>
          <div className="df-radio-row">
            <button type="button"
                    className={`df-radio-btn ${decision ? 'is-active' : ''}`}
                    onClick={() => setDecision(true)} disabled={busy}>
              <strong>Pause</strong>
              <small>Halt user-facing actions until next vote.</small>
            </button>
            <button type="button"
                    className={`df-radio-btn ${!decision ? 'is-active' : ''}`}
                    onClick={() => setDecision(false)} disabled={busy}>
              <strong>Resume</strong>
              <small>Lift the pause.</small>
            </button>
          </div>
        </div>
      )}

      {type === 4 && (
        <>
          <div className="df-field">
            <label>Contract key</label>
            <input type="text" placeholder="e.g. cdp, deposit, basket"
                   value={authName} onChange={(e) => setAuthName(e.target.value)}
                   disabled={busy} spellCheck={false} />
            <small className="df-field__hint">
              The string used by the protocol to identify the authorized contract.
            </small>
          </div>
          <div className="df-field">
            <label>Authorize?</label>
            <div className="df-radio-row">
              <button type="button"
                      className={`df-radio-btn ${decision ? 'is-active' : ''}`}
                      onClick={() => setDecision(true)} disabled={busy}>
                <strong>Authorize</strong>
                <small>Grant admin permission.</small>
              </button>
              <button type="button"
                      className={`df-radio-btn ${!decision ? 'is-active' : ''}`}
                      onClick={() => setDecision(false)} disabled={busy}>
                <strong>Revoke</strong>
                <small>Remove admin permission.</small>
              </button>
            </div>
          </div>
        </>
      )}

      {validationMsg && <div className="df-callout df-callout--info">{validationMsg}</div>}

      <button type="button" className="df-btn df-btn--primary df-btn--block"
              disabled={!canSubmit} onClick={submit}>
        {busy ? 'Working…' : 'Submit proposal'}
      </button>

      {status && <StatusLine status={status} />}
    </div>
  );
}

/* ── shared: proposal summary card ─────────────────── */

export function ProposalSummary({ voting: v }) {
  if (!v) return null;
  const t = v.typeMeta;
  let body = null;

  if (v.type === 1) {
    const meta = KNOWN_PARAMS.find((p) => p.name === v.name);
    body = (
      <>
        <dt>Parameter</dt>
        <dd>{meta?.label || v.name} <code>{v.name}</code></dd>
        <dt>New value</dt>
        <dd>{formatParamValue(v.value, meta?.unit)}</dd>
      </>
    );
  } else if (v.type === 2) {
    const meta = KNOWN_ADDRESSES.find((a) => a.name === v.name);
    body = (
      <>
        <dt>Slot</dt>
        <dd>{meta?.label || v.name} <code>{v.name}</code></dd>
        <dt>New address</dt>
        <dd>
          <code>
            {v.address?.slice(0, 8)}…{v.address?.slice(-6)}
          </code>
        </dd>
      </>
    );
  } else if (v.type === 3) {
    body = (
      <>
        <dt>Action</dt>
        <dd>{v.decision ? 'Pause protocol' : 'Resume protocol'}</dd>
      </>
    );
  } else if (v.type === 4) {
    body = (
      <>
        <dt>Contract</dt>
        <dd><code>{v.name || '—'}</code></dd>
        <dt>Action</dt>
        <dd>{v.decision ? 'Authorize' : 'Revoke'}</dd>
      </>
    );
  }

  return (
    <dl className="df-detail__grid">
      <dt>Proposal</dt>
      <dd>#{v.id} · {t.label}</dd>
      {body}
      <dt>Opened</dt>
      <dd>{v.startTime ? v.startTime.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
      }) : '—'}</dd>
      <dt>Tally (For)</dt>
      <dd>{fmt(v.totalPositive, 4)} RLE</dd>
    </dl>
  );
}
