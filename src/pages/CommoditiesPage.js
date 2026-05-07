import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell,
} from 'recharts';
import PageHead from '../components/redesign/PageHead';
import Icon from '../components/redesign/Icons';
import config from '../utils/config';
import useExchangeRate from '../hooks/useExchangeRate';
import useBasket from '../hooks/useBasket';

const INVESTING_COM_URLS = {
  Gold: 'https://www.investing.com/commodities/gold',
  'XAU/USD': 'https://www.investing.com/currencies/xau-usd',
  Silver: 'https://www.investing.com/commodities/silver',
  'XAG/USD': 'https://www.investing.com/currencies/xag-usd',
  Copper: 'https://www.investing.com/commodities/copper',
  'Copper London': 'https://www.investing.com/commodities/copper',
  Platinum: 'https://www.investing.com/commodities/platinum',
  Palladium: 'https://www.investing.com/commodities/palladium',
  'Crude Oil WTI': 'https://www.investing.com/commodities/crude-oil',
  'Brent Oil': 'https://www.investing.com/commodities/brent-oil',
  'Natural Gas': 'https://www.investing.com/commodities/natural-gas',
  'Heating Oil': 'https://www.investing.com/commodities/heating-oil',
  'Gasoline RBOB': 'https://www.investing.com/commodities/gasoline-rbob',
  'London Gas Oil': 'https://www.investing.com/commodities/london-gas-oil',
  Aluminium: 'https://www.investing.com/commodities/aluminum',
  Zinc: 'https://www.investing.com/commodities/zinc-futures',
  Nickel: 'https://www.investing.com/commodities/nickel',
  'US Wheat': 'https://www.investing.com/commodities/us-wheat',
  'Rough Rice': 'https://www.investing.com/commodities/rough-rice',
  'US Corn': 'https://www.investing.com/commodities/us-corn',
  'US Soybeans': 'https://www.investing.com/commodities/us-soybeans',
  'US Soybean Oil': 'https://www.investing.com/commodities/us-soybean-oil',
  'US Soybean Meal': 'https://www.investing.com/commodities/us-soybean-meal',
  'US Cotton': 'https://www.investing.com/commodities/us-cotton-no.2',
  'US Cocoa': 'https://www.investing.com/commodities/us-cocoa',
  'Orange Juice': 'https://www.investing.com/commodities/orange-juice',
  'Live Cattle': 'https://www.investing.com/commodities/live-cattle',
  Lumber: 'https://www.investing.com/commodities/lumber',
  'US Coffee C': 'https://www.investing.com/commodities/us-coffee-c',
  'London Coffee': 'https://www.investing.com/commodities/london-coffee',
  'US Sugar': 'https://www.investing.com/commodities/us-sugar-no11',
  'Lean Hogs': 'https://www.investing.com/commodities/lean-hogs',
  'Feeder Cattle': 'https://www.investing.com/commodities/feed-cattle',
  Oats: 'https://www.investing.com/commodities/oats',
};

// Brand-aligned palette for pie + chart accents
const BRAND_COLORS = [
  '#3aa86e', '#0e6a44', '#7bc9a3', '#1f8855', '#a9dcc1',
  '#f5a800', '#d97706', '#fbbf24', '#fcd34d', '#fde68a',
  '#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
  '#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe',
  '#dc2626', '#ef4444', '#f87171', '#fca5a5',
  '#0891b2', '#06b6d4', '#67e8f9',
  '#65a30d', '#84cc16', '#a3e635',
  '#ea580c', '#fb923c', '#fdba74',
  '#831843', '#be185d', '#ec4899',
];

export default function CommoditiesPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const explorer = (config.explorer || 'https://etherscan.io/').replace(/\/?$/, '/');
  const initialTab = name === 'basket' ? 'basket' : (name === 'index' || !name) ? 'index' : 'index';
  const [tab, setTab] = useState(initialTab);

  return (
    <>
      <PageHead
        title="Commodities"
        sub="The DFC index and the underlying basket of real commodities."
      />

      <div className="df-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'index'}
          className={'df-tab' + (tab === 'index' ? ' is-active' : '')}
          onClick={() => { setTab('index'); navigate('/commodities/index', { replace: true }); }}
        >
          <Icon name="chart" size={16} /> Index
        </button>
        <button
          role="tab"
          aria-selected={tab === 'basket'}
          className={'df-tab' + (tab === 'basket' ? ' is-active' : '')}
          onClick={() => { setTab('basket'); navigate('/commodities/basket', { replace: true }); }}
        >
          <Icon name="basket" size={16} /> Basket
        </button>
      </div>

      {tab === 'index' ? <IndexTab explorer={explorer} /> : <BasketTab explorer={explorer} />}
    </>
  );
}

/* ───────────────────────── Index tab ───────────────────────── */

function IndexTab({ explorer }) {
  const { loading, error, oracleAddress, instrumentsCount, instruments, priceHistory } = useExchangeRate();
  const [selected, setSelected] = useState('none');
  const [showHist, setShowHist] = useState(false);
  const [historicalData, setHistoricalData] = useState(null);
  const [historicalDepPrices, setHistoricalDepPrices] = useState(null);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const toggleHistorical = async () => {
    const next = !showHist;
    if (next && !historicalData) {
      try {
        const res = await fetch('/historical-index.json');
        const { deploymentPrices, data } = await res.json();
        const formatted = data.map(({ date, index, ...c }) => ({ date, DFC_pre: index, ...c }));
        setHistoricalData(formatted);
        setHistoricalDepPrices(deploymentPrices);
        setShowHist(true);
      } catch (err) { console.error('historical fetch failed', err); }
    } else {
      setShowHist(next);
    }
  };

  const chartData = useMemo(() => (
    showHist && historicalData ? [...historicalData, ...priceHistory] : priceHistory
  ), [showHist, historicalData, priceHistory]);

  const dataKeys = ['DFC'];
  if (selected !== 'none' && selected !== 'DFC') dataKeys.push(selected);

  // y-axis domain
  let minV = Infinity, maxV = -Infinity;
  chartData.forEach((e) => {
    [...dataKeys, ...(showHist ? ['DFC_pre'] : [])].forEach((k) => {
      const v = e[k];
      if (v !== undefined && v !== null) {
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      }
    });
  });
  if (minV === Infinity) minV = 0.5;
  if (maxV === -Infinity) maxV = 1.5;
  const pad = (maxV - minV) * 0.1;
  const dMin = Math.max(0, Math.floor((minV - pad) * 2) / 2);
  const dMax = Math.ceil((maxV + pad) * 2) / 2;
  const ticks = [];
  for (let t = Math.floor(dMin / 0.5) * 0.5; t <= dMax; t += 0.5) ticks.push(Math.round(t * 10) / 10);
  if (!ticks.includes(1)) { ticks.push(1); ticks.sort((a, b) => a - b); }

  if (loading) return <div className="df-empty"><div className="df-empty__title">Loading oracle data…</div></div>;
  if (error)   return <div className="df-empty"><div className="df-empty__title">Failed to load</div><div className="df-empty__sub">{error}</div></div>;

  return (
    <div className="df-stack">
      {/* Controls + chart */}
      <section className="df-card df-card--chart">
        <div className="df-chart-controls">
          <label className="df-field">
            <span>Overlay commodity</span>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="none">None</option>
              {instruments.filter((i) => i.symbol !== 'DFC' && i.symbol !== 'ETH').map((i) => (
                <option key={i.id} value={i.symbol}>{i.symbol}</option>
              ))}
            </select>
          </label>
          <label className="df-checkbox">
            <input type="checkbox" checked={showHist} onChange={toggleHistorical} />
            <span>Show pre-launch historical index</span>
          </label>
        </div>

        <h3 className="df-card__title">Price History</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--df-border)" />
            <XAxis dataKey="date" interval="preserveStartEnd" tick={{ fill: 'var(--df-muted)', fontSize: 12 }} />
            <YAxis
              domain={[dMin, dMax]} ticks={ticks}
              tick={{ fill: 'var(--df-muted)', fontSize: 12 }}
              label={{ value: 'Value (×deploy)', angle: -90, position: 'insideLeft', fill: 'var(--df-muted)', fontSize: 12 }}
            />
            <ReferenceLine y={1} stroke="var(--df-muted)" strokeWidth={1.5} strokeDasharray="5 5" />
            <Tooltip
              wrapperStyle={{ outline: 'none' }}
              contentStyle={{
                background: 'var(--df-card)',
                border: '1px solid var(--df-border)',
                borderRadius: 10,
                color: 'var(--df-fg)',
                boxShadow: '0 8px 24px rgba(0,0,0,.18)',
                padding: '10px 12px',
              }}
              labelStyle={{ color: 'var(--df-muted)', fontSize: 12, marginBottom: 4 }}
              itemStyle={{ color: 'var(--df-fg)', fontSize: 13, padding: 0 }}
              cursor={{ stroke: 'var(--df-muted)', strokeDasharray: '3 3' }}
              formatter={(value, n, props) => {
                if (n === 'DFC' || n === 'DFC (pre-launch)') return [Number(value).toFixed(4), n];
                const orig = props.payload[`${n}_original`];
                if (orig !== undefined) return [`$${Number(orig).toFixed(2)}`, n];
                if (historicalDepPrices && historicalDepPrices[n]) {
                  return [`$${(Number(value) * historicalDepPrices[n]).toFixed(2)}`, n];
                }
                return [`$${Number(value).toFixed(2)}`, n];
              }}
              labelFormatter={(label, p) => p && p.length > 0 && p[0].payload.time ? `${p[0].payload.date} ${p[0].payload.time}` : label}
            />
            <Legend />
            {showHist && (
              <Line type="monotone" dataKey="DFC_pre" stroke="#f5a800" strokeWidth={2} strokeDasharray="5 3" dot={false} name="DFC (pre-launch)" connectNulls={false} />
            )}
            <Line type="monotone" dataKey="DFC" stroke="var(--df-accent)" strokeWidth={2.5} dot={false} />
            {selected !== 'none' && selected !== 'DFC' && (
              <Line type="monotone" dataKey={selected} stroke="#3b82f6" strokeWidth={2} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Collapsibles */}
      <Collapse open={historyOpen} onToggle={() => setHistoryOpen(!historyOpen)} title="Price updates history" subtitle={`${priceHistory.length} blocks`}>
        <div className="df-table-wrap">
          <table className="df-table">
            <thead>
              <tr>
                <th>Date</th><th>Time</th><th>Block</th>
                {dataKeys.map((k) => <th key={k} style={{ textAlign: 'right' }}>{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {priceHistory.slice().reverse().map((e) => (
                <tr key={`${e.timestamp}-${e.blockNumber}`}>
                  <td>{e.date}</td>
                  <td className="df-muted">{e.time}</td>
                  <td>{e.blockNumber}</td>
                  {dataKeys.map((k) => {
                    const v = k === 'DFC' ? e.DFC : e[`${k}_original`];
                    return (
                      <td key={k} style={{ textAlign: 'right', fontWeight: 700 }}>
                        {v !== undefined && v !== null ? (k === 'DFC' ? Number(v).toFixed(4) : `$${Number(v).toFixed(2)}`) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapse>

      <Collapse open={pricesOpen} onToggle={() => setPricesOpen(!pricesOpen)} title="Current prices in contract" subtitle={`${instruments.length} instruments`}>
        <div className="df-price-grid">
          {instruments.map((i) => {
            const url = INVESTING_COM_URLS[i.symbol];
            const display = i.originalPrice || i.currentPrice;
            let pct = null;
            if (i.initialPrice && i.initialPrice > 0 && i.originalPrice) {
              pct = ((i.originalPrice - i.initialPrice) / i.initialPrice) * 100;
            }
            return (
              <div className="df-price-card" key={i.id || i.symbol}>
                <div className="df-price-card__sym">
                  {url ? <a href={url} target="_blank" rel="noopener noreferrer">{i.symbol}</a> : i.symbol}
                </div>
                <div className="df-price-card__val">
                  {i.symbol === 'DFC' ? (display ? Number(display).toFixed(4) : '—') : (display ? `$${Number(display).toFixed(2)}` : '—')}
                </div>
                {i.initialPrice > 0 && (
                  <div className="df-price-card__meta">
                    Initial ${i.initialPrice.toFixed(2)}{' '}
                    {pct !== null && (
                      <span className={pct >= 0 ? 'df-pos' : 'df-neg'}>
                        ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                )}
                <div className="df-price-card__ts">
                  {i.timestamp ? new Date(i.timestamp * 1000).toLocaleString('ru-RU') : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </Collapse>

      {/* Address footer */}
      <div className="df-address-row">
        <div>
          <div className="df-muted">Oracle address</div>
          <a href={`${explorer}address/${oracleAddress}`} target="_blank" rel="noopener noreferrer" className="df-mono">{oracleAddress}</a>
        </div>
        <a href={`${explorer}address/${oracleAddress}#code`} target="_blank" rel="noopener noreferrer" className="df-btn df-btn--ghost">View code</a>
      </div>
    </div>
  );
}

/* ───────────────────────── Basket tab ───────────────────────── */

function BasketTab({ explorer }) {
  const { loading, error, basketAddress, itemsCount, sharesCount, items } = useBasket();
  const [hover, setHover] = useState(null);
  const [itemsOpen, setItemsOpen] = useState(false);

  const chartData = items.map((i) => ({ ...i, name: i.symbol, value: i.share || 0 }));
  const total = chartData.reduce((s, x) => s + x.value, 0);

  if (loading) return <div className="df-empty"><div className="df-empty__title">Loading basket data…</div></div>;
  if (error)   return <div className="df-empty"><div className="df-empty__title">Failed to load</div><div className="df-empty__sub">{error}</div></div>;

  return (
    <div className="df-stack">
      <section className="df-card df-card--chart">
        <h3 className="df-card__title">Commodities Distribution</h3>
        <div className="df-pie-wrap">
          <ResponsiveContainer width="100%" height={420}>
            <PieChart>
              <Pie
                data={chartData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={70} outerRadius={150}
                paddingAngle={1.5} stroke="var(--df-card)" strokeWidth={2}
                onMouseEnter={(_, idx) => setHover(idx)}
                onMouseLeave={() => setHover(null)}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={BRAND_COLORS[i % BRAND_COLORS.length]}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                ))}
              </Pie>
              <Tooltip
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{
                  background: 'var(--df-card)',
                  border: '1px solid var(--df-border)',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,.18)',
                  padding: '10px 12px',
                  color: 'var(--df-fg)',
                }}
                labelStyle={{ color: 'var(--df-muted)', fontSize: 12 }}
                itemStyle={{ color: 'var(--df-fg)', fontSize: 13, padding: 0 }}
                formatter={(value, n, props) => {
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  const ip = props.payload.initialPrice;
                  return [`${value} shares (${pct}%) • initial $${ip ? ip.toFixed(2) : 'N/A'}`, n];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="df-pie-center">
            <div className="df-pie-center__big">{itemsCount}</div>
            <div className="df-pie-center__sub">commodities</div>
          </div>
        </div>
      </section>

      <Collapse open={itemsOpen} onToggle={() => setItemsOpen(!itemsOpen)} title="Basket items" subtitle={`${itemsCount} commodities, ranked by weight`}>
        <div className="df-basket-list">
          {chartData
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((item) => {
              const orig = chartData.findIndex((x) => x.name === item.name);
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div className="df-basket-row" key={item.name}>
                  <div className="df-basket-row__swatch" style={{ background: BRAND_COLORS[orig % BRAND_COLORS.length] }} />
                  <div className="df-basket-row__name">
                    <div className="df-basket-row__symbol">{item.symbol}</div>
                    {item.name && item.name !== item.symbol && (
                      <div className="df-muted">{item.name}</div>
                    )}
                  </div>
                  <div className="df-basket-row__bar-wrap">
                    <div className="df-basket-row__bar" style={{ width: `${pct}%`, background: BRAND_COLORS[orig % BRAND_COLORS.length] }} />
                  </div>
                  <div className="df-basket-row__weight">
                    <div style={{ fontWeight: 700 }}>{pct.toFixed(1)}%</div>
                    <div className="df-muted" style={{ fontSize: 12 }}>{item.value} shares</div>
                  </div>
                  <div className="df-basket-row__price">
                    <div style={{ fontWeight: 600 }}>${item.initialPrice ? item.initialPrice.toFixed(2) : '—'}</div>
                    <div className="df-muted" style={{ fontSize: 12 }}>initial</div>
                  </div>
                </div>
              );
            })}
        </div>
      </Collapse>

      <div className="df-address-row">
        <div>
          <div className="df-muted">Basket contract</div>
          <a href={`${explorer}address/${basketAddress}`} target="_blank" rel="noopener noreferrer" className="df-mono">{basketAddress}</a>
        </div>
        <a href={`${explorer}address/${basketAddress}#code`} target="_blank" rel="noopener noreferrer" className="df-btn df-btn--ghost">View code</a>
      </div>
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function Stat({ label, value, sub, accent }) {
  return (
    <div className={'df-stat' + (accent ? ' df-stat--accent' : '')}>
      <div className="df-stat__label">{label}</div>
      <div className="df-stat__value">{value}</div>
      {sub && <div className="df-stat__sub">{sub}</div>}
    </div>
  );
}

function Collapse({ open, onToggle, title, subtitle, children }) {
  return (
    <section className={'df-collapse' + (open ? ' is-open' : '')}>
      <button className="df-collapse__head" onClick={onToggle} type="button">
        <div>
          <div className="df-collapse__title">{title}</div>
          {subtitle && <div className="df-muted" style={{ fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <Icon name="chevron-down" size={20} className={open ? 'df-rot-180' : ''} />
      </button>
      {open && <div className="df-collapse__body">{children}</div>}
    </section>
  );
}
