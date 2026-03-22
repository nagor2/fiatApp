import React, { useState } from 'react';
import LineChartDemo from './LineChartDemo';
import AreaChartDemo from './AreaChartDemo';
import BarChartDemo from './BarChartDemo';
import PieChartDemo from './PieChartDemo';
import RadarChartDemo from './RadarChartDemo';
import ScatterChartDemo from './ScatterChartDemo';
import ComposedChartDemo from './ComposedChartDemo';
import CandlestickChartDemo from './CandlestickChartDemo';
import MultiLineChartDemo from './MultiLineChartDemo';
import StackedBarChartDemo from './StackedBarChartDemo';
import TreemapChartDemo from './TreemapChartDemo';
import AnimatedChartDemo from './AnimatedChartDemo';

const CHARTS = [
  { id: 'line', name: 'Line Chart', component: LineChartDemo, description: 'Цены, APY, метрики' },
  { id: 'area', name: 'Area Chart', component: AreaChartDemo, description: 'TVL, накопительные данные' },
  { id: 'bar', name: 'Bar Chart', component: BarChartDemo, description: 'Объемы, сравнения' },
  { id: 'stacked-bar', name: 'Stacked Bar', component: StackedBarChartDemo, description: 'Состав collateral' },
  { id: 'pie', name: 'Pie Chart', component: PieChartDemo, description: 'Доли и пропорции' },
  { id: 'composed', name: 'Composed Chart', component: ComposedChartDemo, description: 'Цена + объем' },
  { id: 'multi-line', name: 'Multi-Line', component: MultiLineChartDemo, description: 'Сравнение токенов' },
  { id: 'candlestick', name: 'Candlestick', component: CandlestickChartDemo, description: 'OHLC для трейдинга' },
  { id: 'scatter', name: 'Scatter Chart', component: ScatterChartDemo, description: 'APY vs Risk' },
  { id: 'radar', name: 'Radar Chart', component: RadarChartDemo, description: 'Метрики протокола' },
  { id: 'treemap', name: 'Treemap', component: TreemapChartDemo, description: 'Иерархия активов' },
  { id: 'animated', name: 'Animated Chart', component: AnimatedChartDemo, description: 'Real-time обновления' },
];

export default function ChartsDemo() {
  const [selectedChart, setSelectedChart] = useState('line');

  const SelectedComponent = CHARTS.find(c => c.id === selectedChart)?.component || LineChartDemo;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>📊 Recharts Demo Gallery</h1>
      <p>Примеры всех типов графиков из библиотеки Recharts для DotFlat проекта</p>

      {/* Navigation */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '10px', 
        marginBottom: '30px',
        padding: '20px',
        background: '#f9f9f9',
        borderRadius: '10px'
      }}>
        {CHARTS.map(chart => (
          <button
            key={chart.id}
            onClick={() => setSelectedChart(chart.id)}
            style={{
              padding: '10px 20px',
              background: selectedChart === chart.id ? '#8884d8' : 'white',
              color: selectedChart === chart.id ? 'white' : '#333',
              border: '2px solid #8884d8',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: selectedChart === chart.id ? 'bold' : 'normal',
              transition: 'all 0.3s',
              minWidth: '150px',
              textAlign: 'left'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{chart.name}</div>
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '3px' }}>{chart.description}</div>
          </button>
        ))}
      </div>

      {/* Selected Chart */}
      <div style={{ 
        background: 'white', 
        borderRadius: '10px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '20px'
      }}>
        <SelectedComponent />
      </div>

      {/* Info Section */}
      <div style={{ marginTop: '30px', padding: '20px', background: '#e8f4f8', borderRadius: '10px' }}>
        <h3>📚 О библиотеке Recharts</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <h4>Преимущества</h4>
            <ul>
              <li>Простой декларативный API</li>
              <li>Композиция React компонентов</li>
              <li>TypeScript support</li>
              <li>Responsive по умолчанию</li>
              <li>Легковесная (~150 KB)</li>
            </ul>
          </div>
          <div>
            <h4>Установка</h4>
            <pre style={{ background: '#333', color: '#0f0', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
              npm install recharts
            </pre>
            <p style={{ fontSize: '12px', marginTop: '10px' }}>
              Уже установлена в этом проекте (v2.13.3)
            </p>
          </div>
          <div>
            <h4>Ссылки</h4>
            <ul>
              <li><a href="https://recharts.org/" target="_blank" rel="noopener noreferrer">Официальная документация</a></li>
              <li><a href="https://recharts.org/en-US/api" target="_blank" rel="noopener noreferrer">API Reference</a></li>
              <li><a href="https://recharts.org/en-US/examples" target="_blank" rel="noopener noreferrer">Больше примеров</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Integration Guide */}
      <div style={{ marginTop: '20px', padding: '20px', background: '#fff', border: '2px solid #8884d8', borderRadius: '10px' }}>
        <h3>🚀 Быстрая интеграция в DotFlat</h3>
        <p>Пример использования графика цены токена:</p>
        <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
{`import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

function TokenPriceChart({ priceHistory }) {
  return (
    <LineChart width={600} height={300} data={priceHistory}>
      <XAxis dataKey="timestamp" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="price" stroke="#8884d8" />
    </LineChart>
  );
}`}
        </pre>
      </div>
    </div>
  );
}
