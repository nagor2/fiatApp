import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: распределение collateral по типам
const data = [
  { month: 'Jan', eth: 400000, wbtc: 150000, usdc: 80000 },
  { month: 'Feb', eth: 450000, wbtc: 180000, usdc: 95000 },
  { month: 'Mar', eth: 520000, wbtc: 200000, usdc: 110000 },
  { month: 'Apr', eth: 580000, wbtc: 220000, usdc: 125000 },
  { month: 'May', eth: 630000, wbtc: 250000, usdc: 140000 },
  { month: 'Jun', eth: 700000, wbtc: 280000, usdc: 160000 },
];

export default function StackedBarChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Stacked BarChart - Collateral Composition</h2>
      <p>Столбчатая диаграмма с накоплением для показа состава</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="eth" stackId="a" fill="#627eea" name="ETH Collateral" />
          <Bar dataKey="wbtc" stackId="a" fill="#f7931a" name="WBTC Collateral" />
          <Bar dataKey="usdc" stackId="a" fill="#2775ca" name="USDC Deposits" />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Состав collateral в CDP (ETH, WBTC, etc)</li>
          <li>Распределение deposits по типам</li>
          <li>Breakdown протокольных доходов</li>
          <li>Активность пользователей по категориям</li>
        </ul>
      </div>
    </div>
  );
}
