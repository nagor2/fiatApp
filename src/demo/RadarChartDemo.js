import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

// Пример данных: метрики протокола
const data = [
  { metric: 'Liquidity', value: 85, fullMark: 100 },
  { metric: 'Security', value: 95, fullMark: 100 },
  { metric: 'Decentralization', value: 78, fullMark: 100 },
  { metric: 'User Activity', value: 65, fullMark: 100 },
  { metric: 'TVL Growth', value: 72, fullMark: 100 },
  { metric: 'Stability', value: 88, fullMark: 100 },
];

export default function RadarChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>RadarChart - Метрики протокола</h2>
      <p>Используется для многомерного сравнения показателей</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar name="DotFlat Protocol" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Метрики здоровья протокола</li>
          <li>Сравнение различных пулов ликвидности</li>
          <li>Risk assessment (liquidity, volatility, etc)</li>
          <li>Сравнение нескольких стратегий инвестирования</li>
        </ul>
      </div>
    </div>
  );
}
