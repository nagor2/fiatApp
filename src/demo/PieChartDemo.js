import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: распределение активов
const data = [
  { name: 'ETH Collateral', value: 700000 },
  { name: 'Deposits', value: 1050000 },
  { name: 'Liquidity Pool', value: 450000 },
  { name: 'DAO Treasury', value: 250000 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PieChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>PieChart - Распределение активов</h2>
      <p>Используется для отображения долей и пропорций</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Распределение активов в протоколе</li>
          <li>Collateral composition (ETH, WBTC, etc)</li>
          <li>Portfolio allocation пользователя</li>
          <li>Распределение голосов в DAO</li>
        </ul>
      </div>
    </div>
  );
}
