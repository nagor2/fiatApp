import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: TVL (Total Value Locked)
const data = [
  { date: '2026-03-15', tvl: 1250000, deposits: 800000, cdp: 450000 },
  { date: '2026-03-16', tvl: 1320000, deposits: 850000, cdp: 470000 },
  { date: '2026-03-17', tvl: 1380000, deposits: 880000, cdp: 500000 },
  { date: '2026-03-18', tvl: 1420000, deposits: 900000, cdp: 520000 },
  { date: '2026-03-19', tvl: 1550000, deposits: 950000, cdp: 600000 },
  { date: '2026-03-20', tvl: 1600000, deposits: 980000, cdp: 620000 },
  { date: '2026-03-21', tvl: 1680000, deposits: 1020000, cdp: 660000 },
  { date: '2026-03-22', tvl: 1750000, deposits: 1050000, cdp: 700000 },
];

export default function AreaChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>AreaChart - TVL (Total Value Locked)</h2>
      <p>Используется для отображения накопительных значений и долей</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Area type="monotone" dataKey="deposits" stackId="1" stroke="#8884d8" fill="#8884d8" name="Deposits" />
          <Area type="monotone" dataKey="cdp" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="CDP Collateral" />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>TVL (Total Value Locked) с разбивкой по контрактам</li>
          <li>Liquidity depth в пулах</li>
          <li>Cumulative trading volume</li>
          <li>Накопительный доход пользователей</li>
        </ul>
      </div>
    </div>
  );
}
