import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: цена + объем торгов
const data = [
  { date: '15 Mar', price: 1.02, volume: 125000, liquidity: 850000 },
  { date: '16 Mar', price: 1.01, volume: 158000, liquidity: 870000 },
  { date: '17 Mar', price: 1.03, volume: 132000, liquidity: 890000 },
  { date: '18 Mar', price: 1.02, volume: 145000, liquidity: 920000 },
  { date: '19 Mar', price: 1.04, volume: 167000, liquidity: 950000 },
  { date: '20 Mar', price: 1.03, volume: 152000, liquidity: 980000 },
  { date: '21 Mar', price: 1.05, volume: 189000, liquidity: 1020000 },
  { date: '22 Mar', price: 1.04, volume: 173000, liquidity: 1050000 },
];

export default function ComposedChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>ComposedChart - Цена + Объем + Ликвидность</h2>
      <p>Комбинация линий и столбцов для отображения нескольких метрик</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Volume/Liquidity ($)', angle: 90, position: 'insideRight' }} />
          <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)} />
          <Legend />
          <Bar yAxisId="right" dataKey="volume" fill="#8884d8" name="Trading Volume" />
          <Line yAxisId="left" type="monotone" dataKey="price" stroke="#ff7300" strokeWidth={2} name="Price" />
          <Line yAxisId="right" type="monotone" dataKey="liquidity" stroke="#82ca9d" strokeWidth={2} name="Liquidity" />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Цена токена + объем торгов одновременно</li>
          <li>Liquidity + swap activity</li>
          <li>Deposits + interest rate</li>
          <li>Collateral ratio + liquidations</li>
        </ul>
      </div>
    </div>
  );
}
