/* global BigInt */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { use0xSwap, ZEROEX_NATIVE_ETH } from '../hooks/use0xSwap';
import Icon from '../components/redesign/Icons';
import TokenMark from '../components/redesign/TokenMark';
import PageHead from '../components/redesign/PageHead';
import '../styles/balances.css';
import '../styles/auctions.css';
import '../styles/pools.css';

/* ── tokens & pairs ──────────────────────────────────────────── */

const TOKENS = {
  ETH: { symbol: 'ETH', name: 'Ether',          decimals: 18, address: ZEROEX_NATIVE_ETH, native: true },
  DFC: { symbol: 'DFC', name: 'DotFlat coin',   decimals: 18, address: '0x1f709cfa0c409e158c68edcd32453809c9eb69ee' },
  RLE: { symbol: 'RLE', name: 'Rule token',     decimals: 18, address: null /* injected from web3 contracts */ },
  GLD: { symbol: 'GOLD', name: 'Gold (planned)',decimals: 18, address: null, comingSoon: true },
};

const PAIRS = [
  { id: 'dfc-eth', from: 'DFC', to: 'ETH', label: 'Dotflat / ETH', sub: 'V4 pool · 0.30% fee' },
  { id: 'rle-dfc', from: 'RLE', to: 'DFC', label: 'Rule / Dotflat', sub: 'V4 pool · 0.30% fee' },
  { id: 'gld-dfc', from: 'GLD', to: 'DFC', label: 'Gold / Dotflat', sub: 'Coming soon' },
];

/* ── tiny formatters ─────────────────────────────────────────── */

const fmt = (n, dp = 4) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return v.toLocaleString(undefined, {
    maximumFractionDigits: dp,
    minimumFractionDigits: v >= 1 ? 2 : 0,
  });
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

/* ── page ────────────────────────────────────────────────────── */

export default function PoolsPage() {
  const { contracts } = useWeb3();
  const [pane, setPane] = useState(null); // { pair }

  // Pull RLE address from contracts at runtime (rule token)
  const tokens = useMemo(() => {
    const t = { ...TOKENS };
    if (contracts?.rule?._address) t.RLE = { ...t.RLE, address: contracts.rule._address };
    return t;
  }, [contracts]);

  return (
    <div className="df-page">
      <PageHead
        title="Trading"
        accent="pools"
        sub="Swap between DotFlat tokens and ETH using on-chain liquidity, routed through 0x for the best price."
      />

      <section className="df-pools-grid">
        {PAIRS.map((p) => (
          <PoolCard
            key={p.id}
            pair={p}
            tokens={tokens}
            onTrade={() => setPane({ pair: p })}
          />
        ))}
      </section>

      <section className="df-pools-note">
        <div className="df-pools-note__icon"><Icon name="info" /></div>
        <div>
          <strong>How swaps work here.</strong> Quotes and routing come from the{' '}
          <a className="df-link" href="https://0x.org/docs/api" target="_blank" rel="noreferrer">0x Swap API</a>.
          0x finds the best price across DEXs (including the V4 pools above) and your wallet
          signs a single transaction. You always remain custodial of your funds.
        </div>
      </section>

      {pane && (
        <SwapDrawer
          pair={pane.pair}
          tokens={tokens}
          onClose={() => setPane(null)}
        />
      )}
    </div>
  );
}

/* ── pool / pair card ─────────────────────────────────────────── */

function PoolCard({ pair, tokens, onTrade }) {
  const a = tokens[pair.from];
  const b = tokens[pair.to];
  const soon = a?.comingSoon || b?.comingSoon;

  return (
    <article className={`df-pool-card-v2 ${soon ? 'is-soon' : ''}`}>
      <header className="df-pool-card-v2__head">
        <PairMark a={a.symbol} b={b.symbol} />
        <div className="df-pool-card-v2__title">
          <h3>{pair.label}</h3>
          <div className="df-eyebrow">{pair.sub}</div>
        </div>
      </header>

      <div className="df-pool-card-v2__body">
        <div className="df-pool-card-v2__row">
          <span className="df-muted">Sell</span>
          <strong>{a.symbol}</strong>
          <span className="df-faint">{a.name}</span>
        </div>
        <div className="df-pool-card-v2__row">
          <span className="df-muted">Buy</span>
          <strong>{b.symbol}</strong>
          <span className="df-faint">{b.name}</span>
        </div>
      </div>

      <footer className="df-pool-card-v2__foot">
        {soon ? (
          <button className="df-btn df-btn--ghost" disabled>
            <Icon name="clock" size={16} /> Coming soon
          </button>
        ) : (
          <button className="df-btn df-btn--primary" onClick={onTrade}>
            <Icon name="swap" size={16} /> Trade
          </button>
        )}
      </footer>
    </article>
  );
}

function PairMark({ a, b }) {
  return (
    <div className="df-pair-mark">
      <TokenMark symbol={a} size={36} />
      <TokenMark symbol={b} size={36} />
    </div>
  );
}

/* ── swap drawer ──────────────────────────────────────────────── */

function SwapDrawer({ pair, tokens, onClose }) {
  const { account, walletConnected, getAccount, ethPriceEtherscan } = useWeb3();
  const [from, setFrom] = useState(pair.from);
  const [to,   setTo]   = useState(pair.to);
  const [sellAmount, setSellAmount] = useState('');
  const [buyInput,   setBuyInput]   = useState('');   // user-typed buy amount
  const [inputSide,  setInputSide]  = useState('sell'); // 'sell' | 'buy'
  const [slippage,   setSlippage]   = useState(0.5); // %
  const [quote,      setQuote]      = useState(null);
  const [quoting,    setQuoting]    = useState(false);
  const [quoteErr,   setQuoteErr]   = useState(null);
  const [doneTx,     setDoneTx]     = useState(null);

  const swap0x = use0xSwap();

  // Lock body scroll while open
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

  const tFrom = tokens[from];
  const tTo   = tokens[to];

  const flip = () => {
    setFrom(to); setTo(from);
    setSellAmount(''); setBuyInput(''); setQuote(null); setQuoteErr(null); setInputSide('sell');
  };

  const requestQuote = useCallback(async () => {
    setQuoteErr(null); setQuote(null);
    const activeAmount = inputSide === 'sell' ? sellAmount : buyInput;
    if (!activeAmount || Number(activeAmount) <= 0) return;
    if (!tFrom?.address || !tTo?.address) {
      setQuoteErr('Token address unavailable.'); return;
    }
    setQuoting(true);
    try {
      const q = await swap0x.quote({
        sellToken: tFrom.address,
        buyToken:  tTo.address,
        ...(inputSide === 'sell'
          ? { sellAmount: toUnits(sellAmount, tFrom.decimals) }
          : { buyAmount:  toUnits(buyInput,   tTo.decimals)   }),
        taker: account,
        slippageBps: Math.round(slippage * 100),
      });
      setQuote(q);
    } catch (e) {
      setQuoteErr(e.message || String(e));
    } finally {
      setQuoting(false);
    }
  }, [sellAmount, buyInput, inputSide, tFrom, tTo, account, slippage, swap0x.quote]);

  // Auto-quote on amount change (debounced)
  useEffect(() => {
    const active = inputSide === 'sell' ? sellAmount : buyInput;
    if (!active) { setQuote(null); return; }
    const t = setTimeout(requestQuote, 350);
    return () => clearTimeout(t);
  }, [sellAmount, buyInput, inputSide, from, to, slippage, requestQuote]);

  // Derived display values from quote
  const computedBuy  = quote && tTo   ? fromUnits(quote.buyAmount,  tTo.decimals)   : null;
  const computedSell = quote && tFrom ? fromUnits(quote.sellAmount, tFrom.decimals) : null;

  const displaySell = inputSide === 'sell' ? sellAmount : (computedSell != null ? fmt(computedSell, 6) : '');
  const displayBuy  = inputSide === 'buy'  ? buyInput   : (computedBuy  != null ? fmt(computedBuy,  6) : '');

  const price = computedBuy != null && computedSell != null && Number(computedSell) > 0
    ? computedBuy / Number(computedSell)
    : null;

  const onConfirm = async () => {
    if (!walletConnected) { await getAccount(); return; }
    if (!tFrom?.address || !tTo?.address) return;
    setDoneTx(null);
    try {
      // For buy-side quotes the firm swap still needs a sellAmount;
      // use the computed one from the price quote.
      const effectiveSell = inputSide === 'sell'
        ? sellAmount
        : (computedSell != null ? String(computedSell) : sellAmount);
      const sellUnits = toUnits(effectiveSell, tFrom.decimals);
      const { receipt } = await swap0x.swap({
        sellToken: tFrom.address,
        buyToken:  tTo.address,
        sellAmount: sellUnits,
        taker: account,
        slippageBps: Math.round(slippage * 100),
      });
      setDoneTx(receipt.transactionHash);
    } catch (e) {
      // error surfaced via swap0x.error
    }
  };

  return (
    <div className="df-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="df-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="df-drawer__head">
          <button className="df-icon-btn df-drawer__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
          <div className="df-drawer__title">
            <PairMark a={tFrom.symbol} b={tTo.symbol} />
            <div>
              <div className="df-eyebrow">Swap · routed via 0x</div>
              <h3>{pair.label}</h3>
            </div>
          </div>
        </header>

        <div className="df-drawer__body">
          {doneTx ? (
            <div className="df-empty" style={{ padding: '20px 0' }}>
              <div className="df-empty__icon"><Icon name="check" /></div>
              <h3>Swap submitted</h3>
              <p className="df-mono" style={{ wordBreak: 'break-all' }}>{doneTx}</p>
              <a className="df-btn df-btn--ghost df-btn--sm"
                 href={`https://etherscan.io/tx/${doneTx}`}
                 target="_blank" rel="noreferrer">
                <Icon name="external" size={16} /> View on Etherscan
              </a>
              <button className="df-btn df-btn--primary" style={{ marginLeft: 8 }}
                      onClick={() => { setDoneTx(null); setSellAmount(''); setQuote(null); }}>
                Trade again
              </button>
            </div>
          ) : (
            <>
              <SwapField
                label="You sell"
                token={tFrom}
                value={displaySell}
                onChange={(v) => { setSellAmount(v); setInputSide('sell'); setBuyInput(''); }}
                muted={inputSide === 'buy' && quoting}
              />

              <div className="df-swap-flip">
                <button type="button" className="df-icon-btn" onClick={flip} aria-label="Flip direction">
                  <Icon name="swap" />
                </button>
              </div>

              <SwapField
                label="You receive (estimate)"
                token={tTo}
                value={displayBuy}
                onChange={(v) => { setBuyInput(v); setInputSide('buy'); setSellAmount(''); }}
                muted={inputSide === 'sell' && quoting}
              />

              <div className="df-swap-meta">
                {quoting && <span className="df-muted">Fetching best price…</span>}
                {!quoting && price != null && (
                  <span>
                    1 {tFrom.symbol} ≈ <strong>{fmt(price, 6)}</strong> {tTo.symbol}
                    {ethPriceEtherscan && (
                      <span className="df-muted" style={{ marginLeft: 8 }}>
                        (≈ ${fmt(price * ethPriceEtherscan, 4)})
                      </span>
                    )}
                  </span>
                )}
                {quoteErr && <span className="df-error">{quoteErr}</span>}
              </div>

              <div className="df-swap-slippage">
                <span className="df-muted">Max slippage</span>
                {[0.1, 0.5, 1, 2].map((s) => (
                  <button key={s}
                          type="button"
                          className={`df-chip ${slippage === s ? 'is-on' : ''}`}
                          onClick={() => setSlippage(s)}>
                    {s}%
                  </button>
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
                      ? `Swap ${fmt(computedSell, 6)} ${tFrom.symbol} → ${fmt(computedBuy, 6)} ${tTo.symbol}`
                      : 'Enter an amount'}
                </button>
              )}

              {swap0x.error && <p className="df-error" style={{ marginTop: 12 }}>{swap0x.error}</p>}

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

function SwapField({ label, token, value, onChange, readOnly, muted }) {
  return (
    <label className={`df-swap-field ${muted ? 'is-muted' : ''}`}>
      <div className="df-swap-field__label">{label}</div>
      <div className="df-swap-field__row">
        <input
          className="df-swap-field__input"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value.replace(/[^\d.]/g, ''))}
        />
        <div className="df-swap-field__token">
          <TokenMark symbol={token.symbol} size={28} />
          <strong>{token.symbol}</strong>
        </div>
      </div>
    </label>
  );
}
