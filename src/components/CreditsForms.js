/**
 * Credit-position action forms — opened from the drawer in CreditsPage.
 *
 * All transactions follow the canonical async/await + parseTxError shape:
 *   try { await tx.send(...); // success
 *   } catch (e) { setStatus(parseTxError(e));
 *   } finally { setBusy(false); }
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Icon from './redesign/Icons';
import { cachedContractCall, cachedEthBalance } from '../utils/cachedContractCall';
import { parseTxError } from '../utils/txError';
/* global BigInt */

const fmt = (n, dp = 2) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp === 2 ? 2 : 0 });
};

/* ── Reusable bits ────────────────────────────────────── */

function StatusBar({ status }) {
  if (!status) return null;
  return <div className={`df-status df-status--${status.kind}`}>{status.msg}</div>;
}

function HealthPreview({ ratio, label = 'Projected ratio' }) {
  if (!Number.isFinite(ratio)) return null;
  const tone = ratio < 1.2 ? 'danger' : ratio < 1.5 ? 'warn' : ratio < 2.0 ? 'ok' : 'safe';
  return (
    <div className={`df-health-preview df-health-preview--${tone}`}>
      <span>{label}</span>
      <b>{ratio.toFixed(2)}×</b>
    </div>
  );
}

function AmountInput({ label, symbol, value, onChange, max, maxLabel, step = '0.01', min = '0' }) {
  return (
    <label className="df-field">
      <div className="df-field__row">
        <span className="df-field__label">{label}</span>
        {max != null && (
          <button
            type="button"
            className="df-field__max"
            onClick={() => onChange(String(max))}
          >
            {maxLabel || `Max: ${fmt(max, 4)}`}
          </button>
        )}
      </div>
      <div className="df-field__input">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          placeholder="0.00"
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="df-field__unit">{symbol}</span>
      </div>
    </label>
  );
}

/* ── 1. Open new credit ───────────────────────────────── */

export function OpenCreditForm({ onDone }) {
  const { web3, contracts, account, ethPrice } = useWeb3();
  const [collateral, setCollateral] = useState('');
  const [amount, setAmount] = useState('');
  const [maxMintable, setMaxMintable] = useState(null);
  const [ethBalance, setEthBalance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const debounceRef = useRef(null);

  // Fetch ETH balance once.
  useEffect(() => {
    if (!web3 || !account) return;
    cachedEthBalance(account, web3)
      .then(b => setEthBalance(Number(b) / 1e18))
      .catch(() => setEthBalance(null));
  }, [web3, account]);

  // Recompute max-mintable when collateral changes (debounced).
  useEffect(() => {
    if (!contracts?.cdp || !collateral || Number(collateral) <= 0) {
      setMaxMintable(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const wei = web3.utils.toWei(String(collateral), 'ether');
        const max = await cachedContractCall('cdp', 'getMaxFlatCoinsToMint', [wei], contracts.cdp);
        setMaxMintable(Number(max) / 1e18);
      } catch (e) {
        console.debug('[OpenCreditForm] live preview reverted (expected during typing):', e?.message || e);
        setMaxMintable(null);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [collateral, contracts, web3]);

  const collNum = Number(collateral) || 0;
  const amtNum = Number(amount) || 0;
  const ethPriceNum = Number(ethPrice) || 0;

  const projectedRatio = amtNum > 0 ? (collNum * ethPriceNum) / amtNum : Infinity;

  const overBalance = ethBalance != null && collNum > ethBalance - 0.005; // leave gas headroom
  const overMintable = maxMintable != null && amtNum > maxMintable;
  const tooSmall = amtNum > 0 && amtNum < 1; // contract requires ≥ 1 DFC
  const valid = collNum > 0 && amtNum >= 1 && !overBalance && !overMintable && contracts?.cdp;

  const setMax = () => {
    if (ethBalance == null) return;
    const safe = Math.max(0, ethBalance - 0.01); // keep ETH for gas
    setCollateral(safe.toFixed(4));
  };
  const fillMaxMint = () => {
    if (maxMintable != null) setAmount(maxMintable.toFixed(2));
  };

  async function open() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Opening credit position…' });
    try {
      await contracts.cdp.methods
        .openCDP(web3.utils.toWei(String(amount), 'ether'))
        .send({
          from: account,
          value: web3.utils.toWei(String(collateral), 'ether'),
        });
      setStatus({ kind: 'ok', msg: 'Credit opened' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <AmountInput
        label="ETH collateral"
        symbol="ETH"
        value={collateral}
        onChange={setCollateral}
        max={ethBalance != null ? Math.max(0, ethBalance - 0.01) : undefined}
        maxLabel={ethBalance != null ? `Max: ${fmt(Math.max(0, ethBalance - 0.01), 4)} ETH` : undefined}
        step="0.001"
      />
      <AmountInput
        label="DFC to mint"
        symbol="DFC"
        value={amount}
        onChange={setAmount}
        max={maxMintable ?? undefined}
        maxLabel={maxMintable != null ? `Mint max: ${fmt(maxMintable)} DFC` : undefined}
      />

      {collNum > 0 && (
        <div className="df-fineprint">
          ≈ ${fmt(collNum * ethPriceNum)} of collateral at ${fmt(ethPriceNum)} / ETH
        </div>
      )}

      {amtNum > 0 && Number.isFinite(projectedRatio) && (
        <HealthPreview ratio={projectedRatio} label="Initial collateralization" />
      )}

      {tooSmall && (
        <div className="df-hint df-hint--warn">
          The CDP contract requires at least <b>1 DFC</b> minted per position.
        </div>
      )}
      {overBalance && (
        <div className="df-hint df-hint--warn">
          You're providing <b>{fmt(collNum, 4)} ETH</b> but only have <b>{fmt(ethBalance, 4)} ETH</b> (≈0.01 reserved for gas).
        </div>
      )}
      {overMintable && (
        <div className="df-hint df-hint--warn">
          With <b>{fmt(collNum, 4)} ETH</b> of collateral you can mint at most <b>{fmt(maxMintable)} DFC</b>.
        </div>
      )}

      <StatusBar status={status} />

      <button
        type="button"
        className="df-btn df-btn--primary df-btn--block"
        disabled={!valid || busy}
        onClick={open}
      >
        {busy ? 'Opening…' : <><Icon name="loan" size={16} /> Lock ETH and mint {fmt(amtNum)} DFC</>}
      </button>

      <p className="df-fineprint">
        Your ETH stays as collateral until you close the position. Watch the health ratio — if ETH drops, you may need to top up to avoid liquidation.
      </p>
    </div>
  );
}

/* ── 2. Update / adjust position ──────────────────────── */

export function UpdateCreditForm({ position, onDone }) {
  const { web3, contracts, account, ethPrice } = useWeb3();
  const [collateral, setCollateral] = useState(String(position.ethLocked.toFixed(6)));
  const [amount, setAmount] = useState(String(position.coinsMinted.toFixed(2)));
  const [maxMintable, setMaxMintable] = useState(null);
  const [ethBalance, setEthBalance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!web3 || !account) return;
    cachedEthBalance(account, web3)
      .then(b => setEthBalance(Number(b) / 1e18))
      .catch(() => setEthBalance(null));
  }, [web3, account]);

  // Recompute max-mintable for the proposed collateral level (not just the current).
  useEffect(() => {
    if (!contracts?.cdp || !collateral || Number(collateral) <= 0) {
      setMaxMintable(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const wei = web3.utils.toWei(String(collateral), 'ether');
        const max = await cachedContractCall('cdp', 'getMaxFlatCoinsToMint', [wei], contracts.cdp);
        setMaxMintable(Number(max) / 1e18);
      } catch (e) {
        console.debug('[OpenCreditForm] live preview reverted (expected during typing):', e?.message || e);
        setMaxMintable(null);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [collateral, contracts, web3]);

  const collNum = Number(collateral) || 0;
  const amtNum = Number(amount) || 0;
  const ethPriceNum = Number(ethPrice) || 0;

  // Collateral can only INCREASE through this method (the contract pulls msg.value).
  // To withdraw collateral, use the dedicated WithdrawEth flow.
  const collDelta = collNum - position.ethLocked;
  const tryingToReduceCollateral = collDelta < -1e-9;
  const overBalance = collDelta > 0 && ethBalance != null && collDelta > ethBalance - 0.005;
  const overMintable = maxMintable != null && amtNum > maxMintable;
  const tooSmall = amtNum < 1;
  const projectedRatio = amtNum > 0 ? (collNum * ethPriceNum) / amtNum : Infinity;

  const valid = !tryingToReduceCollateral && !overBalance && !overMintable && !tooSmall && contracts?.cdp;

  async function update() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Updating position…' });
    try {
      const amountWei = web3.utils.toWei(String(amount), 'ether');
      const collateralWei = web3.utils.toWei(String(collateral), 'ether');
      const lockedWei = position._ethAmountLockedRaw;
      // BigInt arithmetic — never use Number for wei diffs.
      const value = BigInt(collateralWei) - BigInt(lockedWei);
      await contracts.cdp.methods
        .updateCDP(position.id, amountWei)
        .send({ from: account, value: value < 0n ? '0' : value.toString() });
      setStatus({ kind: 'ok', msg: 'Position updated' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <AmountInput
        label="ETH collateral (total)"
        symbol="ETH"
        value={collateral}
        onChange={setCollateral}
        min={String(position.ethLocked)}
        step="0.001"
      />
      <AmountInput
        label="DFC outstanding (total)"
        symbol="DFC"
        value={amount}
        onChange={setAmount}
        max={maxMintable ?? undefined}
        maxLabel={maxMintable != null ? `Mint max: ${fmt(maxMintable)} DFC` : undefined}
      />

      {Number.isFinite(projectedRatio) && (
        <HealthPreview ratio={projectedRatio} label="Updated ratio" />
      )}

      {tryingToReduceCollateral && (
        <div className="df-hint df-hint--warn">
          To reduce collateral, use the <b>Withdraw ETH</b> action instead. This form can only add ETH.
        </div>
      )}
      {overBalance && (
        <div className="df-hint df-hint--warn">
          You'd need <b>{fmt(collDelta, 4)} ETH</b> more, but only have <b>{fmt(ethBalance, 4)} ETH</b> available.
        </div>
      )}
      {overMintable && (
        <div className="df-hint df-hint--warn">
          With <b>{fmt(collNum, 4)} ETH</b> you can mint at most <b>{fmt(maxMintable)} DFC</b>.
        </div>
      )}
      {tooSmall && (
        <div className="df-hint df-hint--warn">
          Position must keep at least <b>1 DFC</b> minted.
        </div>
      )}

      <StatusBar status={status} />

      <button
        type="button"
        className="df-btn df-btn--primary df-btn--block"
        disabled={!valid || busy}
        onClick={update}
      >
        {busy ? 'Updating…'
          : collDelta > 1e-9 ? <><Icon name="plus" size={16} /> Add {fmt(collDelta, 4)} ETH and update</>
          : <><Icon name="edit" size={16} /> Update position</>}
      </button>
    </div>
  );
}

/* ── 3. Pay interest ──────────────────────────────────── */

export function PayInterestForm({ position, onDone }) {
  const { web3, contracts, account } = useWeb3();
  const [bal, setBal] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  // We need a small buffer above accrued — interest keeps ticking between
  // approve and pay. 0.1% pad matches the legacy form.
  const required = position.interestAccrued * 1.001;

  const reload = async () => {
    if (!contracts?.flatCoin || !account) return;
    try {
      const [b, a] = await Promise.all([
        cachedContractCall('flatCoin', 'balanceOf', [account], contracts.flatCoin, { noCache: true }),
        cachedContractCall('flatCoin', 'allowance', [account, contracts.cdp._address], contracts.flatCoin, { noCache: true }),
      ]);
      setBal(Number(b) / 1e18);
      setAllowance(Number(a) / 1e18);
    } catch (e) { console.warn(e); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [account, contracts]);

  const enoughAllowance = allowance != null && allowance + 1e-9 >= position.interestAccrued;
  const enoughBalance = bal != null && bal + 1e-9 >= required;

  async function approve() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Approving DFC for interest…' });
    try {
      await contracts.flatCoin.methods
        .approve(contracts.cdp._address, web3.utils.toWei(String(required.toFixed(6)), 'ether'))
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Approved' });
      reload();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Transferring interest…' });
    try {
      await contracts.cdp.methods.transferInterest(position.id).send({ from: account });
      setStatus({ kind: 'ok', msg: 'Interest paid' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <dl className="df-detail__grid">
        <dt>Interest accrued</dt> <dd>{fmt(position.interestAccrued, 4)} DFC</dd>
        <dt>Need to approve</dt>  <dd>{fmt(required, 4)} DFC</dd>
        <dt>Your DFC balance</dt> <dd>{fmt(bal, 4)} DFC</dd>
        <dt>Current allowance</dt><dd>{fmt(allowance, 4)} DFC</dd>
      </dl>

      {!enoughBalance && bal != null && (
        <div className="df-hint df-hint--warn">
          You need <b>{fmt(required, 4)} DFC</b> but only have <b>{fmt(bal, 4)} DFC</b>.
        </div>
      )}

      <StatusBar status={status} />

      {!enoughAllowance ? (
        <button
          type="button"
          className="df-btn df-btn--primary df-btn--block"
          disabled={!enoughBalance || busy}
          onClick={approve}
        >
          {busy ? 'Approving…' : `Step 1 of 2 · Approve ${fmt(required, 4)} DFC`}
        </button>
      ) : (
        <button
          type="button"
          className="df-btn df-btn--primary df-btn--block"
          disabled={!enoughBalance || busy || position.interestAccrued <= 0}
          onClick={pay}
        >
          {busy ? 'Paying…' : <><Icon name="receipt" size={16} /> Pay {fmt(position.interestAccrued, 4)} DFC interest</>}
        </button>
      )}

      <p className="df-fineprint">
        Interest is computed per block. Paying brings the position fully current; you can keep borrowing afterward.
      </p>
    </div>
  );
}

/* ── 4. Withdraw ETH ──────────────────────────────────── */

export function WithdrawEthForm({ position, onDone }) {
  const { web3, contracts, account, ethPrice } = useWeb3();
  const [maxOut, setMaxOut] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  // Re-compute the safe max ETH that can be withdrawn while still keeping
  // coinsMinted ≤ getMaxFlatCoinsToMintForPos. We over-shrink by 0.001 ETH
  // because price moves between read and tx.
  useEffect(() => {
    if (!contracts?.cdp) return;
    let cancelled = false;
    (async () => {
      try {
        // Probe with 1 ETH — small enough not to hit user-balance limits in the
        // mint formula, large enough that the contract's internal divisions
        // don't underflow / revert (a 0.000001 ETH probe reverts on some
        // oracle states).
        const [maxCoinsRaw, perEthRaw] = await Promise.all([
          cachedContractCall('cdp', 'getMaxFlatCoinsToMintForPos', [position.id], contracts.cdp),
          cachedContractCall('cdp', 'getMaxFlatCoinsToMint',
            [web3.utils.toWei('1', 'ether')], contracts.cdp),
        ]);
        const maxCoins = Number(maxCoinsRaw);
        const dfcPerEth = Number(perEthRaw);  // DFC × 1e18 per 1 ETH
        if (!dfcPerEth) { setMaxOut(0); return; }
        const coinsHeadroom = maxCoins - Number(position.coinsMinted) * 1e18;
        // coinsHeadroom is in DFC × 1e18; dfcPerEth is also DFC × 1e18 per ETH.
        const ethOut = coinsHeadroom / dfcPerEth - 0.001;
        if (!cancelled) setMaxOut(Math.max(0, ethOut));
      } catch (e) {
        console.debug('[WithdrawEthForm] safe-max calc reverted:', e?.message || e);
        if (!cancelled) setMaxOut(0);
      }
    })();
    return () => { cancelled = true; };
  }, [position, contracts, web3]);

  const num = Number(amount) || 0;
  const overMax = maxOut != null && num > maxOut + 1e-9;
  const projectedColl = position.ethLocked - num;
  const ethPriceNum = Number(ethPrice) || 0;
  const projectedRatio = position.debtTotal > 0
    ? (projectedColl * ethPriceNum) / position.debtTotal
    : Infinity;

  const valid = num > 0 && !overMax && contracts?.cdp;

  async function withdraw() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Withdrawing ETH…' });
    try {
      await contracts.cdp.methods
        .withdrawEther(position.id, web3.utils.toWei(String(amount), 'ether'))
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'ETH withdrawn' });
      setTimeout(onDone, 800);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <AmountInput
        label="ETH to withdraw"
        symbol="ETH"
        value={amount}
        onChange={setAmount}
        max={maxOut ?? undefined}
        maxLabel={maxOut != null ? `Safe max: ${fmt(maxOut, 4)} ETH` : 'Calculating…'}
        step="0.001"
      />

      {Number.isFinite(projectedRatio) && num > 0 && (
        <HealthPreview ratio={projectedRatio} label="Ratio after withdrawal" />
      )}

      {overMax && (
        <div className="df-hint df-hint--warn">
          You can withdraw at most <b>{fmt(maxOut, 4)} ETH</b> while keeping the position safely collateralized.
        </div>
      )}

      <StatusBar status={status} />

      <button
        type="button"
        className="df-btn df-btn--primary df-btn--block"
        disabled={!valid || busy}
        onClick={withdraw}
      >
        {busy ? 'Withdrawing…' : <><Icon name="arrow-down-left" size={16} /> Withdraw {fmt(num, 4)} ETH</>}
      </button>

      <p className="df-fineprint">
        We leave a small margin (0.001 ETH) to absorb price movement between read and confirmation.
      </p>
    </div>
  );
}

/* ── 5. Close credit ──────────────────────────────────── */

export function CloseCreditForm({ position, onDone }) {
  const { web3, contracts, account } = useWeb3();
  const [bal, setBal] = useState(null);
  const [allowance, setAllowance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  // Need to approve principal + 1.2× fee buffer (matches legacy CloseCDP).
  const required = position.coinsMinted + position.interestAccrued * 1.2;

  const reload = async () => {
    if (!contracts?.flatCoin || !account) return;
    try {
      const [b, a] = await Promise.all([
        cachedContractCall('flatCoin', 'balanceOf', [account], contracts.flatCoin, { noCache: true }),
        cachedContractCall('flatCoin', 'allowance', [account, contracts.cdp._address], contracts.flatCoin, { noCache: true }),
      ]);
      setBal(Number(b) / 1e18);
      setAllowance(Number(a) / 1e18);
    } catch (e) { console.warn(e); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [account, contracts]);

  const enoughAllowance = allowance != null && allowance + 1e-9 >= position.coinsMinted + position.interestAccrued;
  const enoughBalance = bal != null && bal + 1e-9 >= required;

  async function approve() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: `Approving ${fmt(required)} DFC…` });
    try {
      await contracts.flatCoin.methods
        .approve(contracts.cdp._address, web3.utils.toWei(String(required.toFixed(6)), 'ether'))
        .send({ from: account });
      setStatus({ kind: 'ok', msg: 'Approved' });
      reload();
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    setBusy(true);
    setStatus({ kind: 'pending', msg: 'Closing position…' });
    try {
      await contracts.cdp.methods.closeCDP(position.id).send({ from: account });
      setStatus({ kind: 'ok', msg: 'Position closed. ETH returned.' });
      setTimeout(onDone, 1200);
    } catch (e) {
      setStatus(parseTxError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="df-form">
      <dl className="df-detail__grid">
        <dt>Principal to repay</dt>     <dd>{fmt(position.coinsMinted)} DFC</dd>
        <dt>Interest to repay</dt>      <dd>{fmt(position.interestAccrued, 4)} DFC</dd>
        <dt>Approval needed (×1.2)</dt> <dd><b>{fmt(required)} DFC</b></dd>
        <dt>Your DFC balance</dt>       <dd>{fmt(bal)} DFC</dd>
        <dt>Current allowance</dt>      <dd>{fmt(allowance)} DFC</dd>
        <dt>ETH returned on close</dt>  <dd><b>{fmt(position.ethLocked, 4)} ETH</b></dd>
      </dl>

      {!enoughBalance && bal != null && (
        <div className="df-hint df-hint--warn">
          You need <b>{fmt(required)} DFC</b> to close this position but only have <b>{fmt(bal)} DFC</b>.
        </div>
      )}

      <StatusBar status={status} />

      {!enoughAllowance ? (
        <button
          type="button"
          className="df-btn df-btn--primary df-btn--block"
          disabled={!enoughBalance || busy}
          onClick={approve}
        >
          {busy ? 'Approving…' : `Step 1 of 2 · Approve ${fmt(required)} DFC`}
        </button>
      ) : (
        <button
          type="button"
          className="df-btn df-btn--danger df-btn--block"
          disabled={!enoughBalance || busy}
          onClick={close}
        >
          {busy ? 'Closing…' : <><Icon name="close" size={16} /> Repay {fmt(position.debtTotal)} DFC and close</>}
        </button>
      )}

      <p className="df-fineprint">
        On close: your DFC debt + accrued interest is burned, the contract returns <b>{fmt(position.ethLocked, 4)} ETH</b> to your wallet, and the position is permanently closed.
      </p>
    </div>
  );
}
