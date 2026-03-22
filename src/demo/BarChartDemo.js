import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: объемы торгов по дням
const data = [
  { date: '15 Mar', volume: 125000, transactions: 234 },
  { date: '16 Mar', volume: 158000, transactions: 312 },
  { date: '17 Mar', volume: 132000, transactions: 276 },
  { date: '18 Mar', volume: 145000, transactions: 298 },
  { date: '19 Mar', volume: 167000, transactions: 345 },
  { date: '20 Mar', volume: 152000, transactions: 301 },
  { date: '21 Mar', volume: 189000, transactions: 389 },
  { date: '22 Mar', volume: 173000, transactions: 356 },
];

export default function BarChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>BarChart - Объемы торгов</h2>
      <p>Используется для сравнения значений по периодам</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="volume" fill="#8884d8" name="Volume ($)" />
          <Bar yAxisId="right" dataKey="transactions" fill="#82ca9d" name="Transactions" />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Объем торгов в DEX пуле</li>
          <li>Количество транзакций по дням</li>
          <li>Активность аукционов</li>
          <li>Сравнение доходности разных стратегий</li>
        </ul>
      </div>
    </div>
  );
}
