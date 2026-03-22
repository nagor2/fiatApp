import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: сравнение нескольких токенов
const data = [
  { date: '15 Mar', dfc: 1.02, rle: 0.45, eth: 3200 },
  { date: '16 Mar', dfc: 1.01, rle: 0.47, eth: 3250 },
  { date: '17 Mar', dfc: 1.03, rle: 0.46, eth: 3180 },
  { date: '18 Mar', dfc: 1.02, rle: 0.48, eth: 3220 },
  { date: '19 Mar', dfc: 1.04, rle: 0.50, eth: 3280 },
  { date: '20 Mar', dfc: 1.03, rle: 0.49, eth: 3240 },
  { date: '21 Mar', dfc: 1.05, rle: 0.52, eth: 3300 },
  { date: '22 Mar', dfc: 1.04, rle: 0.51, eth: 3270 },
];

export default function MultiLineChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Multi-Line Chart - Сравнение токенов</h2>
      <p>Несколько линий на одном графике для сравнения</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'DFC/RLE Price ($)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'ETH Price ($)', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="dfc" stroke="#8884d8" strokeWidth={2} name="DFC Price" />
          <Line yAxisId="left" type="monotone" dataKey="rle" stroke="#82ca9d" strokeWidth={2} name="RLE Price" />
          <Line yAxisId="right" type="monotone" dataKey="eth" stroke="#ffc658" strokeWidth={2} name="ETH Price" />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Сравнение цен нескольких токенов</li>
          <li>Мониторинг различных метрик протокола</li>
          <li>Сравнение APY разных стратегий</li>
          <li>Tracking multiple wallet balances</li>
        </ul>
      </div>
    </div>
  );
}
