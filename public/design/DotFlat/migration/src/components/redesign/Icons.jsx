import React from 'react';

/**
 * DotFlat icon set. Use as <Icon name="home" size={20} />.
 */
export default function Icon({ name, size = 20, ...rest }) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round', strokeLinejoin: 'round', ...rest,
  };
  switch (name) {
    case 'home':     return <svg {...props}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>;
    case 'wallet':   return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 13.5h2"/></svg>;
    case 'credit':   return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>;
    case 'deposit':  return <svg {...props}><rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M4 9h16"/></svg>;
    case 'auction':  return <svg {...props}><path d="m4 17 4-4 4 4"/><path d="M14 11 9 6"/><path d="m12 4 8 8"/><path d="M3 21h12"/></svg>;
    case 'pool':     return <svg {...props}><path d="M3 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/><path d="M3 13c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/><path d="M3 9c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0"/></svg>;
    case 'commodity':return <svg {...props}><path d="M3 21V8.5l9-5 9 5V21"/><path d="M3 21h18"/><path d="M9 21V13h6v8"/></svg>;
    case 'contract': return <svg {...props}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>;
    case 'watcher':  return <svg {...props}><circle cx="11" cy="11" r="6"/><path d="m20 20-4.3-4.3"/></svg>;
    case 'search':   return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'bell':     return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>;
    case 'sun':      return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>;
    case 'moon':     return <svg {...props}><path d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>;
    case 'plus':     return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'arrow-up-right': return <svg {...props}><path d="M7 17 17 7"/><path d="M9 7h8v8"/></svg>;
    case 'menu':     return <svg {...props}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'close':    return <svg {...props}><path d="M6 6l12 12M6 18 18 6"/></svg>;
    case 'chevron':  return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'send':     return <svg {...props}><path d="M3 11 21 4l-7 17-3-7-8-3Z"/></svg>;
    case 'swap':     return <svg {...props}><path d="M7 4v14"/><path d="m3 8 4-4 4 4"/><path d="M17 20V6"/><path d="m21 16-4 4-4-4"/></svg>;
    case 'gauge':    return <svg {...props}><path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-4"/></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="8"/></svg>;
  }
}

export function IsoCube({ size = 32, color = 'var(--df-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 6 58 19v26L32 58 6 45V19Z" stroke={color} strokeWidth="2" opacity=".4"/>
      <path d="M32 6 58 19 32 32 6 19Z" fill={color} opacity=".15"/>
      <path d="M32 32v26L6 45V19Z" fill={color} opacity=".25"/>
      <path d="M32 32v26l26-13V19Z" fill={color} opacity=".4"/>
    </svg>
  );
}

export function Sparkline({ points, color = 'var(--df-accent)', height = 36, fill = true }) {
  if (!points || points.length < 2) return null;
  const w = 100, h = 36;
  const max = Math.max(...points), min = Math.min(...points);
  const dx = w / (points.length - 1);
  const norm = (v) => h - 4 - ((v - min) / Math.max(0.0001, max - min)) * (h - 8);
  const d = points.map((v, i) => `${i ? 'L' : 'M'} ${(i * dx).toFixed(1)} ${norm(v).toFixed(1)}`).join(' ');
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {fill && <path d={area} fill={color} opacity=".12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TokenIcon({ symbol, kind = 'mint', size = 36 }) {
  return (
    <span className={`df-token-icon df-token-icon--${kind}`} style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {String(symbol).slice(0, 3)}
    </span>
  );
}
