import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icons';

const ITEMS = [
  { id: 'home',     path: '/',           label: 'Home',     icon: 'home' },
  { id: 'balances', path: '/balances',   label: 'Wallet',   icon: 'wallet' },
  { id: 'auctions', path: '/auctions',   label: 'Auctions', icon: 'auction' },
  { id: 'pools',    path: '/pools',      label: 'Pools',    icon: 'pool' },
  { id: 'watcher',  path: '/block-watcher', label: 'Watch', icon: 'watcher' },
];

export default function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const isActive = (it) => it.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(it.path);
  return (
    <nav className="df-bottom">
      <div className="df-bottom__inner">
        {ITEMS.map(it => (
          <button key={it.id}
                  className={`df-bottom__item ${isActive(it) ? 'is-active' : ''}`}
                  onClick={() => nav(it.path)}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
