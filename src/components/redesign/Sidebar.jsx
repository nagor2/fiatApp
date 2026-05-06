import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icons';
import { useWeb3 } from '../../contexts/Web3Context';

const NAV = [
  { id: 'home',        path: '/',            label: 'Overview',       icon: 'home',      group: 'Workspace' },
  { id: 'balances',    path: '/balances',    label: 'Balances',       icon: 'wallet',    group: 'My positions' },
  { id: 'credits',     path: '/credits',     label: 'Credits',        icon: 'credit',    group: 'My positions' },
  { id: 'deposits',    path: '/deposits',    label: 'Deposits',       icon: 'deposit',   group: 'My positions' },
  { id: 'auctions',    path: '/auctions',    label: 'Auctions',       icon: 'auction',   group: 'My positions' },
  { id: 'pools',       path: '/pools',       label: 'Trading pools',  icon: 'swap',      group: 'Markets' },
  { id: 'governance',  path: '/governance',  label: 'Governance',     icon: 'pool',      group: 'Markets' },
  { id: 'commodities', path: '/commodities', label: 'Commodities',    icon: 'commodity', group: 'Markets' },
  { id: 'contracts',   path: '/contracts',   label: 'Contracts',      icon: 'contract',  group: 'System' },
  { id: 'watcher',     path: '/block-watcher', label: 'Block watcher', icon: 'watcher',  group: 'System' },
];

export default function Sidebar({ onNavigate }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { account, walletConnected, disconnectWallet } = useWeb3();

  const isActive = (item) => {
    if (item.path === '/') return loc.pathname === '/';
    return loc.pathname === item.path || loc.pathname.startsWith(item.path + '/');
  };

  const go = (path) => { nav(path); if (onNavigate) onNavigate(); };

  const groups = ['Workspace', 'My positions', 'Markets', 'System'];

  return (
    <aside className="df-side">
      {groups.map((g) => (
        <React.Fragment key={g}>
          <div className="df-side__group df-section-title">{g}</div>
          {NAV.filter(n => n.group === g).map(it => (
            <a
              key={it.id}
              className={`df-nav ${isActive(it) ? 'is-active' : ''}`}
              onClick={() => go(it.path)}
            >
              <Icon name={it.icon} className="df-nav__icon" />
              <span className="df-nav__label">{it.label}</span>
            </a>
          ))}
        </React.Fragment>
      ))}

      {walletConnected && (
        <div className="df-wallet-card">
          <div className="df-section-title" style={{ marginBottom: 6 }}>Connected</div>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
            {account?.slice(0,6)}…{account?.slice(-4)}
          </div>
          <div className="df-faint" style={{ fontSize: 11 }}>Mainnet · Ethereum</div>
          <button className="df-btn df-btn--ghost df-btn--sm"
                  style={{ marginTop: 10, width: '100%' }}
                  onClick={disconnectWallet}>
            Disconnect
          </button>
        </div>
      )}
    </aside>
  );
}
