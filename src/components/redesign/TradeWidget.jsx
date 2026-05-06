import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { use0xSwap, ZEROEX_NATIVE_ETH } from '../../hooks/use0xSwap';
import Icon from './Icons';
import TokenMark from './TokenMark';

/**
 * TradeWidget — slide-in right-side trade panel.
 *
 * Props:
 *   token:    'DFC' | 'RLE' | 'ETH' — the token the user wants to acquire
 *             (or sell). The widget chooses the most natural counter-token
 *             based on which V4 pool exists:
 *
 *               DFC ↔ ETH      (DFC/ETH pool)
 *               RLE ↔ DFC      (RLE/DFC pool)
 *               ETH ↔ DFC      (same DFC/ETH pool, opposite side)
 *
 *   onClose:  () => void
 *   uniswapUrl: optional override of the "Open on Uniswap" deep link.
 *
 * This is a thin shell on top of `use0xSwap`. The original SwapDrawer in
 * PoolsPage was inlined; this component pulls the exact same logic out so
 * Balances + Contracts + Pools can all share the experience.
 */

/* ── tokens ──────────────────────────────────────────── */

const ETH_ADDR = ZEROEX_NATIVE_ETH;
const DFC_ADDR = '0x1f709cfa0c409e158c68edcd32453809c9eb69ee';

// Default Uniswap deep links per pair (used when uniswapUrl prop omitted).
const UNISWAP = {
  'DFC-ETH': 'https://app.uniswap.org/explore/tokens/ethereum/0x1f709cfa0c409e158c68edcd32453809c9eb69ee',
  'RLE-DFC': 'https://app.uniswap.org/explore/pools/ethereum/0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044',
};

function pairFor(token) {
  switch (token) {
    case 'ETH': return { from: 'ETH', to: 'DFC', label: 'ETH → DFC', uniswap: UNISWAP['DFC-ETH'] };
    case 'DFC': return { from: 'ETH', to: 'DFC', label: 'Buy DFC',  uniswap: UNISWAP['DFC-ETH'] };
    case 'RLE': return { from: 'DFC', to: 'RLE', label: 'Buy RLE',  uniswap: UNISWAP['RLE-DFC'] };
    default:    return { from: 'ETH', to: 'DFC', label: 'Trade',    uniswap: UNISWAP['DFC-ETH'] };
  }
}

/* ── formatters ──────────────────────────────────────────── */

const fmt = (n, dp = 6) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return v.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: v >= 1 ? 2 : 0 });
};

function toUnits(amount, decimals) {
  if (!amount) return '0';
  const [w = '0', f = ''] = String(amount).split('.');
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(w + frac).toString();
}
function fromUnits(units, decimals) {
  if (units == null) return 0;
  const s = String(units).padStart(decimals + 1, '0');
  const w = s.slice(0, -decimals) || '0';
  const f = s.slice(-decimals).replace(/0+$/, '');
  return Number(f ? `${w}.${f}` : w);
}

/* ── component ──────────────────────────────────────────── */

export default function TradeWidget({ token, onClose, uniswapUrl }) {
  const { account, walletConnected, getAccount, contracts } = useWeb3();

  const initialPair = useMemo(() => pairFor(token), [token]);

  // Build the token registry — RLE address comes from contracts at runtime.
  const tokens = useMemo(() => ({
    ETH: { symbol: 'ETH', name: 'Ether',        decimals: 18, address: ETH_ADDR, native: true },
    DFC: { symbol: 'DFC', name: 'DotFlat coin', decimals: 18, address: DFC_ADDR },
    RLE: { symbol: 'RLE', name: 'Rule token',   decimals: 18, address: contracts?.rule?._address || null },
  }), [contracts]);

  const [from, setFrom] = useState(initialPair.from);
  const [to,   setTo]   = useState(initialPair.to);
  const [sellAmount, setSellAmount] = useState('');
  const [slippage,   setSlippage]   = useState(0.5);
  const [quote,      setQuote]      = useState(null);
  const [quoting,    setQuoting]    = useState(false);
  const [quoteErr,   setQuoteErr]   = useState(null);
  const [doneTx,     setDoneTx]     = useState(null);

  const swap0x = use0xSwap();

  // Lock body scroll while open + close on Escape
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const tFrom = tokens[from];
  const tTo   = tokens[to];

  const flip = () => {
    setFrom(to); setTo(from);
    setSellAmount(''); setQuote(null); setQuoteErr(null);
  };

  const requestQuote = useCallback(async () => {
    setQuoteErr(null); setQuote(null);
    if (!sellAmount || Number(sellAmount) <= 0) return;
    if (!tFrom?.address || !tTo?.address) {
      setQuoteErr('Token address unavailable.'); return;
    }
    setQuoting(true);
    try {
      const sellUnits = toUnits(sellAmount, tFrom.decimals);
      const q = await swap0x.quote({
        sellToken: tFrom.address,
        buyToken:  tTo.address,
        sellAmount: sellUnits,
        taker: account,
        slippageBps: Math.round(slippage * 100),
      });
      setQuote(q);
    } catch (e) {
      setQuoteErr(e.message || String(e));
    } finally {
      setQuoting(false);
    }
  }, [sellAmount, tFrom, tTo, account, slippage, swap0x]);

  // Auto-quote on amount change (debounced)
  useEffect(() => {
    if (!sellAmount) { setQuote(null); return; }
    const t = setTimeout(requestQuote, 350);
    return () => clearTimeout(t);
  }, [sellAmount, from, to, slippage, requestQuote]);

  const buyAmount = quote && tTo ? fromUnits(quote.buyAmount, tTo.decimals) : null;
  const price = quote && buyAmount && Number(sellAmount) ? buyAmount / Number(sellAmount) : null;
  const link = uniswapUrl || initialPair.uniswap;

  const onConfirm = async () => {
    if (!walletConnected) { await getAccount(); return; }
    if (!tFrom?.address || !tTo?.address) return;
    setDoneTx(null);
    try {
      const sellUnits = toUnits(sellAmount, tFrom.decimals);
      const { receipt } = await swap0x.swap({
        sellToken: tFrom.address,
        buyToken:  tTo.address,
        sellAmount: sellUnits,
        taker: account,
        slippageBps: Math.round(slippage * 100),
      });
      setDoneTx(receipt.transactionHash);
    } catch (_) {}
  };

  return (
    <div className="df-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="df-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="df-drawer__head">
          <button className="df-icon-btn df-drawer__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          <div className="df-drawer__title">
            <div className="df-pair-mark">
              <TokenMark symbol={tFrom.symbol} size={36} />
              <TokenMark symbol={tTo.symbol} size={36} />
            </div>
            <div>
              <div className="df-eyebrow">Swap · routed via 0x</div>
              <h3>{initialPair.label}</h3>
            </div>
          </div>
        </header>

        <div className="df-drawer__body">
          {doneTx ? (
            <div className="df-empty" style={{ padding: '20px 0' }}>
              <div className="df-empty__icon"><Icon name="check" /></div>
              <h3>Swap submitted</h3>
              <p className="df-mono" style={{ wordBreak: 'break-all' }}>{doneTx}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                <a className="df-btn df-btn--ghost df-btn--sm"
                   href={`https://etherscan.io/tx/${doneTx}`}
                   target="_blank" rel="noreferrer">
                  <Icon name="external" size={16} /> View on Etherscan
                </a>
                <button className="df-btn df-btn--primary df-btn--sm"
                        onClick={() => { setDoneTx(null); setSellAmount(''); setQuote(null); }}>
                  Trade again
                </button>
              </div>
            </div>
          ) : (
            <>
              <Field label="You sell" token={tFrom} value={sellAmount} onChange={setSellAmount} />

              <div className="df-swap-flip">
                <button type="button" className="df-icon-btn" onClick={flip} aria-label="Flip direction">
                  <Icon name="swap" />
                </button>
              </div>

              <Field label="You receive (estimate)" token={tTo}
                     value={buyAmount != null ? fmt(buyAmount, 6) : ''}
                     readOnly muted={quoting} />

              <div className="df-swap-meta">
                {quoting && <span className="df-muted">Fetching best price…</span>}
                {!quoting && price != null && (
                  <span>1 {tFrom.symbol} ≈ <strong>{fmt(price, 6)}</strong> {tTo.symbol}</span>
                )}
                {quoteErr && <span className="df-error">{quoteErr}</span>}
              </div>

              <div className="df-swap-slippage">
                <span className="df-muted">Max slippage</span>
                {[0.1, 0.5, 1, 2].map((s) => (
                  <button key={s} type="button"
                          className={`df-chip ${slippage === s ? 'is-on' : ''}`}
                          onClick={() => setSlippage(s)}>{s}%</button>
                ))}
              </div>

              {!walletConnected ? (
                <button className="df-btn df-btn--primary df-btn--block" onClick={getAccount}>
                  Connect wallet to swap
                </button>
              ) : (
                <button className="df-btn df-btn--primary df-btn--block"
                        disabled={!quote || swap0x.busy}
                        onClick={onConfirm}>
                  {swap0x.busy
                    ? 'Confirming in wallet…'
                    : quote
                      ? `Swap ${fmt(sellAmount, 6)} ${tFrom.symbol} → ${fmt(buyAmount, 6)} ${tTo.symbol}`
                      : 'Enter an amount'}
                </button>
              )}

              {swap0x.error && <p className="df-error" style={{ marginTop: 12 }}>{swap0x.error}</p>}

              {/* Open-on-Uniswap escape hatch — replaces the old "pair card"
                  on Balances. Even if our 0x route fails, users can swap. */}
              {link && (
                <a className="df-btn df-btn--ghost df-btn--block" href={link} target="_blank" rel="noreferrer"
                   style={{ marginTop: 10 }}>
                  <Icon name="external" size={16} /> Open on Uniswap
                </a>
              )}

              <p className="df-faint" style={{ marginTop: 16 }}>
                You'll be asked to approve {tFrom.symbol} (one-time) before the swap, unless you're selling ETH.
              </p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, token, value, onChange, readOnly, muted }) {
  return (
    <label className={`df-swap-field ${muted ? 'is-muted' : ''}`}>
      <div className="df-swap-field__label">{label}</div>
      <div className="df-swap-field__row">
        <input className="df-swap-field__input" type="text" inputMode="decimal" placeholder="0.0"
               value={value} readOnly={readOnly}
               onChange={(e) => onChange?.(e.target.value.replace(/[^\d.]/g, ''))} />
        <div className="df-swap-field__token">
          <TokenMark symbol={token.symbol} size={28} />
          <strong>{token.symbol}</strong>
        </div>
      </div>
    </label>
  );
}
