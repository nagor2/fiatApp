import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icons';
import { useWeb3 } from '../../contexts/Web3Context';
import { usePrices } from '../../contexts/PricesContext';

/**
 * Topbar — brand, search, ETH price pill (with multi-source popover),
 * theme toggle, wallet.
 *
 * The price pill shows the *contract oracle* price (`ethPrice`) as the
 * headline number, because that's what the protocol actually uses for
 * collateral math. On hover/focus, a popover reveals the two reference
 * prices the old UI showed (Etherscan API, Uniswap V3 pool) so the user
 * can sanity-check the oracle against external sources.
 */
export default function Topbar({ onMenu, theme, setTheme }) {
  const { account, walletConnected, getAccount, disconnectWallet } = useWeb3();
  const prices = usePrices();
  const dfcIndex          = prices?.dfcIndex          ?? null;
  const ethPriceOracle    = prices?.ethUsd             ?? null;
  const ethPriceUniswap   = prices?.ethUsdUniswap      ?? null;
  const ethPriceEtherscan = prices?.ethUsdEtherscan   ?? null;

  const short = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

  return (
    <header className="df-topbar">
      <button className="df-icon-btn df-mobile-menu" onClick={onMenu} aria-label="Menu">
        <Icon name="menu" />
      </button>

      <a className="df-topbar__brand" href="/" aria-label="Home">
        <img src={`${process.env.PUBLIC_URL}/assets/logo.png`} alt="DotFlat" />
        <span>DotFlat</span>
      </a>

      {dfcIndex != null && (
        <div className="df-topbar__dfc-index">
          <span className="df-eth-pill__dot"></span>
          <span className="df-topbar__dfc-label">DFC</span>
          <span className="df-topbar__dfc-value">{dfcIndex.toFixed(4)}</span>
        </div>
      )}

      <div className="df-topbar__right">
        <EthPricePill
          contract={ethPriceOracle}
          etherscan={ethPriceEtherscan}
          uniswap={ethPriceUniswap}
        />
        <button className="df-icon-btn" aria-label="Theme"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>

        {walletConnected ? (
          <button
            className="df-btn df-btn--primary df-btn--sm"
            onClick={disconnectWallet}
            title="Click to disconnect"
          >
            <span className="df-mono" style={{ fontSize: 11 }}>{short(account)}</span>
          </button>
        ) : (
          <button className="df-btn df-btn--primary df-btn--sm" onClick={getAccount}>
            Connect wallet
          </button>
        )}
      </div>
    </header>
  );
}

/* ── ETH price pill with hover popover ───────────────────
   Headline: contract oracle (used by CDP / collateral math).
   Popover : adds Etherscan ref price + Uniswap V3 pool price,
             plus a one-line explainer on what each is and why
             they may differ.
   ─────────────────────────────────────────────────────── */

function EthPricePill({ contract, etherscan, uniswap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeTimer = useRef(null);

  // Click-outside / Esc to close
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!contract && !etherscan && !uniswap) return null;

  // Hover with a small grace period so the popover doesn't flicker
  // when the cursor crosses the gap between trigger and panel.
  const onEnter = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const onLeave = () => { closeTimer.current = setTimeout(() => setOpen(false), 120); };

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—';

  // Highlight if any reference price drifts > 2% from the oracle.
  const drift = (ref) => {
    if (!contract || !ref) return null;
    const d = ((ref - contract) / contract) * 100;
    return Math.abs(d) >= 2 ? d : null;
  };
  const driftEs = drift(etherscan);
  const driftUni = drift(uniswap);
  const anyDrift = driftEs != null || driftUni != null;

  return (
    <div
      className="df-eth-pricewrap"
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        className={`df-eth-pill ${anyDrift ? 'df-eth-pill--drift' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onFocus={onEnter}
        onBlur={onLeave}
      >
        <span className="df-eth-pill__dot"></span>
        ETH <span className="df-tnum">{fmt(contract)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v5h1" />
        </svg>
      </button>

      {open && (
        <div className="df-eth-pop" role="dialog" aria-label="ETH price sources">
          <div className="df-eth-pop__title">ETH price sources</div>
          <p className="df-eth-pop__lead">
            DotFlat protocol uses the on-chain oracle price for collateral
            math. The two reference prices below are independent sanity
            checks &mdash; small differences are normal.
          </p>

          <PriceRow
            label="Contract oracle"
            value={fmt(contract)}
            primary
            help="The exchange-rate contract that powers CDP collateral, liquidations and DFC mint limits. This is the number the protocol actually trusts."
          />
          <PriceRow
            label="Etherscan API"
            value={fmt(etherscan)}
            drift={driftEs}
            help="Off-chain reference from Etherscan&rsquo;s gas-tracker endpoint. Independent of the protocol; useful as a market sanity check."
          />
          <PriceRow
            label="Uniswap V3 pool"
            value={fmt(uniswap)}
            drift={driftUni}
            help="Spot price from the USDC/WETH 0.05% pool. Reflects current AMM market price &mdash; can briefly diverge during volatile blocks."
          />

          {anyDrift && (
            <div className="df-eth-pop__warn">
              One or more sources differ from the oracle by more than 2%.
              The protocol still uses the oracle price.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriceRow({ label, value, primary, drift, help }) {
  return (
    <div className={`df-eth-pop__row${primary ? ' is-primary' : ''}`}>
      <div className="df-eth-pop__row-head">
        <span className="df-eth-pop__row-label">{label}</span>
        <span className="df-eth-pop__row-value df-tnum">
          {value}
          {drift != null && (
            <em className={`df-eth-pop__drift ${drift > 0 ? 'is-up' : 'is-down'}`}>
              {drift > 0 ? '+' : ''}{drift.toFixed(1)}%
            </em>
          )}
        </span>
      </div>
      <div className="df-eth-pop__row-help">{help}</div>
    </div>
  );
}
