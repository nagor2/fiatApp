import React, { useMemo, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { usePrices } from '../contexts/PricesContext';
import { ZEROEX_NATIVE_ETH } from '../hooks/use0xSwap';
import Icon from '../components/redesign/Icons';
import TokenMark from '../components/redesign/TokenMark';
import PageHead from '../components/redesign/PageHead';
import TradeWidget from '../components/redesign/TradeWidget';
import PoolHistoryWidget from '../components/redesign/PoolHistoryWidget';
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
  { id: 'dfc-eth', from: 'DFC', to: 'ETH', label: 'Dotflat / ETH', sub: 'V4 pool · 0.30% fee', uniswap: 'https://app.uniswap.org/explore/tokens/ethereum/0x1f709cfa0c409e158c68edcd32453809c9eb69ee', poolId: '0xca0a1a9ab72c583a8ccd487e6d8c75bcc62f9792b4c8c5aedd1707fe2b8bd3cf' },
  { id: 'rle-dfc', from: 'RLE', to: 'DFC', label: 'Rule / Dotflat', sub: 'V4 pool · 0.30% fee', uniswap: 'https://app.uniswap.org/explore/pools/ethereum/0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044', poolId: '0xac5ddf400a6183d7e86b9ab8afa892e8f02d5498ebb9c6e2774c461320f9f044' },
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

/* ── page ────────────────────────────────────────────────────── */

export default function PoolsPage() {
  const { contracts } = useWeb3();
  const prices = usePrices();
  const [pane, setPane]     = useState(null); // { pair }
  const [histPane, setHistPane] = useState(null); // { pair }

  // Pull RLE address from contracts at runtime (rule token)
  const tokens = useMemo(() => {
    const t = { ...TOKENS };
    if (contracts?.rule?._address) t.RLE = { ...t.RLE, address: contracts.rule._address };
    return t;
  }, [contracts]);

  const dfcUsd        = prices?.dfcUsd                   ?? null;
  const rlePriceInDfc = prices?.rleDfc?.priceRleInDfc    ?? null;
  const rleUsd        = (rlePriceInDfc != null && dfcUsd != null) ? rlePriceInDfc * dfcUsd : null;

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
            onHistory={() => setHistPane({ pair: p })}
            quote={
              p.id === 'dfc-eth' ? (dfcUsd != null ? `$${fmt(dfcUsd, 4)}` : null) :
              p.id === 'rle-dfc' ? (rlePriceInDfc != null ? `${fmt(rlePriceInDfc, 6)} DFC${rleUsd != null ? ` ($${fmt(rleUsd, 4)})` : ''}` : null) :
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

      {histPane && (
        <PoolHistoryWidget
          pair={histPane.pair}
          tokens={tokens}
          onClose={() => setHistPane(null)}
        />
      )}
    </div>
  );
}

/* ── pool / pair card ─────────────────────────────────────────── */

function PoolCard({ pair, tokens, onTrade, onHistory, quote, quoteLabel }) {
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
          <>
            <button className="df-btn df-btn--primary" onClick={onTrade}>
              <Icon name="swap" size={16} /> Trade
            </button>
            {pair.poolId && (
              <button className="df-btn df-btn--ghost df-pool-hist-btn" onClick={onHistory} title="Pool transaction history">
                <Icon name="receipt" size={16} />
              </button>
            )}
          </>
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
