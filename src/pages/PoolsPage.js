/* global BigInt */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { ZEROEX_NATIVE_ETH } from '../hooks/use0xSwap';
import Icon from '../components/redesign/Icons';
import TokenMark from '../components/redesign/TokenMark';
import PageHead from '../components/redesign/PageHead';
import TradeWidget from '../components/redesign/TradeWidget';
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
  { id: 'dfc-eth', from: 'DFC', to: 'ETH', label: 'Dotflat / ETH', sub: 'V4 pool · 0.30% fee', uniswap: 'https://app.uniswap.org/explore/tokens/ethereum/0x1f709cfa0c409e158c68edcd32453809c9eb69ee' },
  { id: 'rle-dfc', from: 'RLE', to: 'DFC', label: 'Rule / Dotflat', sub: 'V4 pool · 0.30% fee', uniswap: 'https://app.uniswap.org/explore/pools/ethereum/0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044' },
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

/* ── live price hook ─────────────────────────────────────────── */

function useLivePrice(sellAddr, sellDec, buyAddr, buyDec) {
  const [price, setPrice] = useState(null);
  useEffect(() => {
    if (!sellAddr || !buyAddr) return;
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          chainId: '1',
          sellToken: sellAddr,
          buyToken:  buyAddr,
          sellAmount: toUnits('1', sellDec),
          slippageBps: '50',
        });
        const res = await window.fetch(`/api/0x/swap/allowance-holder/price?${params}`);
        if (!res.ok || cancelled) return;
        const q = await res.json();
        if (cancelled) return;
        const sold   = fromUnits(q.sellAmount, sellDec);
        const bought = fromUnits(q.buyAmount,  buyDec);
        if (sold > 0) setPrice(bought / sold);
      } catch { /* ignore — 0x may be temporarily unavailable */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [sellAddr, buyAddr, sellDec, buyDec]);
  return price;
}

/* ── page ────────────────────────────────────────────────────── */

export default function PoolsPage() {
  const { contracts, ethPriceEtherscan } = useWeb3();
  const [pane, setPane] = useState(null); // { pair }

  // Pull RLE address from contracts at runtime (rule token)
  const tokens = useMemo(() => {
    const t = { ...TOKENS };
    if (contracts?.rule?._address) t.RLE = { ...t.RLE, address: contracts.rule._address };
    return t;
  }, [contracts]);

  // Live quotes matching each pair's natural sell direction
  const ethPerDfc     = useLivePrice(TOKENS.DFC.address, TOKENS.DFC.decimals, TOKENS.ETH.address, TOKENS.ETH.decimals);
  const rlePriceInDfc = useLivePrice(tokens.RLE.address,  tokens.RLE.decimals,  TOKENS.DFC.address, TOKENS.DFC.decimals);

  // DFC price in USD: how much ETH you get per DFC × ETH/USD
  const dfcUsd = ethPerDfc && ethPriceEtherscan ? ethPerDfc * ethPriceEtherscan : null;

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
            quote={
              p.id === 'dfc-eth' ? (dfcUsd != null ? `$${fmt(dfcUsd, 4)}` : null) :
              p.id === 'rle-dfc' ? (rlePriceInDfc != null ? `${fmt(rlePriceInDfc, 6)} DFC` : null) :
              null
            }
            quoteLabel={
              p.id === 'dfc-eth' ? '1 DFC' :
              p.id === 'rle-dfc' ? '1 RLE' :
              null
            }
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
        <TradeWidget
          pair={pane.pair}
          onClose={() => setPane(null)}
        />
      )}
    </div>
  );
}

/* ── pool / pair card ─────────────────────────────────────────── */

function PoolCard({ pair, tokens, onTrade, quote, quoteLabel }) {
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
        {quote && (
          <div className="df-pool-card-v2__quote">
            <span className="df-muted">{quoteLabel} ≈</span>
            <strong className="df-accent">{quote}</strong>
          </div>
        )}
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
