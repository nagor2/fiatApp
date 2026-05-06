import React from 'react';
import Icon from './Icons';
import { useWeb3 } from '../../contexts/Web3Context';

/**
 * Topbar — brand, search, ETH price pill, theme toggle, wallet.
 *
 * Props:
 *   onMenu       — () => void, for mobile drawer
 *   theme        — 'light' | 'dark'
 *   setTheme     — (next) => void
 */
export default function Topbar({ onMenu, theme, setTheme }) {
  const {
    ethPrice,
    account,
    walletConnected,
    getAccount,
    disconnectWallet,
  } = useWeb3();

  const short = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';

  return (
    <header className="df-topbar">
      <button className="df-icon-btn df-mobile-menu" onClick={onMenu} aria-label="Menu">
        <Icon name="menu" />
      </button>

      <div className="df-topbar__brand">
        <img src={`${process.env.PUBLIC_URL}/assets/logo.png`} alt="DotFlat" />
        <span>DotFlat</span>
      </div>

      <div className="df-topbar__searchwrap">
        <Icon name="search" size={16} />
        <input className="df-topbar__search" placeholder="Search address, tx, position…" />
      </div>

      <div className="df-topbar__right">
        {ethPrice && (
          <span className="df-eth-pill" title="Live ETH price">
            <span className="df-eth-pill__dot"></span>
            ETH <span className="df-tnum">${Number(ethPrice).toLocaleString()}</span>
          </span>
        )}
        <button className="df-icon-btn" aria-label="Theme"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="df-icon-btn" aria-label="Notifications"><Icon name="bell" /></button>

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
