import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: корреляция между APY и риском
const data = [
  { apy: 5.2, risk: 12, pool: 'Stable Pool A' },
  { apy: 8.5, risk: 25, pool: 'Stable Pool B' },
  { apy: 12.3, risk: 45, pool: 'Volatile Pool A' },
  { apy: 15.7, risk: 62, pool: 'Volatile Pool B' },
  { apy: 3.8, risk: 8, pool: 'Safe Pool' },
  { apy: 22.5, risk: 85, pool: 'High Risk Pool' },
  { apy: 10.2, risk: 35, pool: 'Medium Pool A' },
  { apy: 7.8, risk: 20, pool: 'Medium Pool B' },
];

export default function ScatterChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>ScatterChart - APY vs Risk</h2>
      <p>Используется для отображения корреляций между двумя метриками</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey="apy" name="APY" unit="%" label={{ value: 'APY (%)', position: 'insideBottom', offset: -5 }} />
          <YAxis type="number" dataKey="risk" name="Risk Score" label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          <Legend />
          <Scatter name="Liquidity Pools" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>APY vs Risk для разных пулов</li>
          <li>Price vs Volume корреляция</li>
          <li>Collateral Ratio vs Liquidation Price</li>
          <li>Gas price vs Transaction speed</li>
        </ul>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <p><strong>{payload[0].payload.pool}</strong></p>
        <p>APY: {payload[0].value}%</p>
        <p>Risk Score: {payload[1].value}</p>
      </div>
    );
  }
  return null;
}
