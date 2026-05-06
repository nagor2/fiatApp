import React from 'react';

/**
 * Token logo marks. Inline SVG so they're sharp, theme-aware, and zero-load.
 * Use as <TokenMark symbol="DFC" size={44} />.
 */
export default function TokenMark({ symbol, size = 44 }) {
  const s = String(symbol || '').toUpperCase();
  const style = { width: size, height: size };

  if (s === 'ETH') {
    return (
      <span className="df-mark df-mark--eth" style={style}>
        <svg viewBox="0 0 32 32" width="62%" height="62%" aria-hidden="true">
          <g fill="none" fillRule="evenodd">
            <path fill="#fff" fillOpacity=".95" d="M16 4 8 16.4l8 4.7 8-4.7L16 4Z"/>
            <path fill="#fff" fillOpacity=".7"  d="M8 16.4 16 21l8-4.6L16 13Z"/>
            <path fill="#fff" fillOpacity=".95" d="M8 18.1 16 28v-5.4Z"/>
            <path fill="#fff" fillOpacity=".7"  d="M16 22.6V28l8-9.9Z"/>
          </g>
        </svg>
      </span>
    );
  }

  if (s === 'DFC') {
    // Dotflat coin — bold "ꟷD" mark with a flat baseline, mint gradient
    return (
      <span className="df-mark df-mark--dfc" style={style}>
        <svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id="dfc-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#5fd29a"/>
              <stop offset="100%" stopColor="#1f8a50"/>
            </linearGradient>
          </defs>
          <circle cx="22" cy="22" r="21" fill="url(#dfc-g)"/>
          <path d="M14 13h9.5c4.5 0 7.5 3.4 7.5 8.5v.5c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1V21c0-2.5-1.6-4-4-4H18v8.5c0 .55.45 1 1 1h2.5c1.7 0 3-.9 3-2.6 0-.55.45-1 1-1h2.7c.7 0 1.2.7 1 1.4-.9 3.5-3.8 5.7-7.7 5.7H14a1 1 0 0 1-1-1V14a1 1 0 0 1 1-1Z" fill="#fff"/>
          <rect x="11" y="22" width="22" height="2.2" rx="1.1" fill="#fff" opacity=".4"/>
        </svg>
      </span>
    );
  }

  if (s === 'RLE' || s === 'RULE') {
    // Rule token — bold "R" with an underline rule, gold gradient
    return (
      <span className="df-mark df-mark--rle" style={style}>
        <svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id="rle-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#f5cb55"/>
              <stop offset="100%" stopColor="#a07a14"/>
            </linearGradient>
          </defs>
          <circle cx="22" cy="22" r="21" fill="url(#rle-g)"/>
          <path d="M14 12h9.6c4 0 6.9 2.7 6.9 6.4 0 2.6-1.4 4.7-3.7 5.7L31 30.5c.3.6-.2 1.5-.9 1.5h-3.4c-.4 0-.8-.2-1-.6l-3.6-6.4H18V31a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V13a1 1 0 0 1 1-1Zm4 8h5.1c1.6 0 2.7-1 2.7-2.5s-1.1-2.5-2.7-2.5H18V20Z" fill="#fff"/>
          <rect x="11" y="34.5" width="22" height="2.2" rx="1.1" fill="#fff" opacity=".5"/>
        </svg>
      </span>
    );
  }

  if (s === 'GOLD' || s === 'XAU') {
    return (
      <span className="df-mark df-mark--gold" style={style}>
        <svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true">
          <defs>
            <linearGradient id="au-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#ffe07a"/>
              <stop offset="100%" stopColor="#b8861a"/>
            </linearGradient>
          </defs>
          <circle cx="22" cy="22" r="21" fill="url(#au-g)"/>
          <text x="22" y="28" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="system-ui">Au</text>
        </svg>
      </span>
    );
  }

  // Fallback monogram
  return (
    <span className="df-mark df-mark--fallback" style={style}>
      <svg viewBox="0 0 44 44" width="100%" height="100%" aria-hidden="true">
        <circle cx="22" cy="22" r="21" fill="var(--df-accent)"/>
        <text x="22" y="27" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="system-ui">{s.slice(0, 3)}</text>
      </svg>
    </span>
  );
}

/** Stacked pair of token marks for liquidity-pair cards. */
export function TokenPair({ a, b, size = 44 }) {
  const small = Math.round(size * 0.78);
  return (
    <span className="df-pair" style={{ width: size + small * 0.55, height: size }}>
      <span style={{ position: 'absolute', left: 0, top: 0 }}>
        <TokenMark symbol={a} size={size} />
      </span>
      <span style={{ position: 'absolute', right: 0, top: (size - small) / 2 }}>
        <TokenMark symbol={b} size={small} />
      </span>
    </span>
  );
}
