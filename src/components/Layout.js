import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './redesign/Topbar';
import Sidebar from './redesign/Sidebar';
import BottomNav from './redesign/BottomNav';

import '../styles/tokens.css';
import '../styles/shell.css';
import '../styles/pages.css';
import '../styles/eth-price-pill.css';


/**
 * New DotFlat shell. Wraps every route via <Outlet />.
 *
 * Replaces the old Layout.js + MainLayout.js.
 */
export default function Layout() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('df-theme') || 'light';
  });
  const [cardStyle] = useState(() => {
    return localStorage.getItem('df-cardstyle') || 'soft';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('df-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-cardstyle', cardStyle);
  }, [cardStyle]);

  return (
    <>
      <div
        className="df-app"
        data-sidebar="full"
        data-mobile-open={mobileOpen ? 'true' : 'false'}
      >
        <Topbar onMenu={() => setMobileOpen(o => !o)} theme={theme} setTheme={setTheme} />
        <Sidebar onNavigate={() => setMobileOpen(false)} />
        <main className="df-main">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <div
        className={`df-drawer-bg ${mobileOpen ? 'is-open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
    </>
  );
}
