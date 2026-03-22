import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: цена токена по дням
const data = [
  { date: '2026-03-15', price: 1.02, volume: 12500 },
  { date: '2026-03-16', price: 1.01, volume: 15800 },
  { date: '2026-03-17', price: 1.03, volume: 13200 },
  { date: '2026-03-18', price: 1.02, volume: 14500 },
  { date: '2026-03-19', price: 1.04, volume: 16700 },
  { date: '2026-03-20', price: 1.03, volume: 15200 },
  { date: '2026-03-21', price: 1.05, volume: 18900 },
  { date: '2026-03-22', price: 1.04, volume: 17300 },
];

export default function LineChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>LineChart - Цена DFC токена</h2>
      <p>Используется для отображения динамики цены, APY, interest rate</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Volume', angle: 90, position: 'insideRight' }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} name="Price" />
          <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#82ca9d" strokeWidth={2} name="Volume" />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Цена токена (DFC, RLE) во времени</li>
          <li>APY (Annual Percentage Yield) для депозитов</li>
          <li>Interest rate для CDP</li>
          <li>Collateral ratio во времени</li>
        </ul>
      </div>
    </div>
  );
}
