import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Пример данных: OHLC (Open, High, Low, Close) для свечного графика
const data = [
  { date: '15 Mar', open: 1.02, high: 1.05, low: 1.01, close: 1.04, volume: 125000 },
  { date: '16 Mar', open: 1.04, high: 1.06, low: 1.00, close: 1.01, volume: 158000 },
  { date: '17 Mar', open: 1.01, high: 1.04, low: 0.99, close: 1.03, volume: 132000 },
  { date: '18 Mar', open: 1.03, high: 1.05, low: 1.02, close: 1.02, volume: 145000 },
  { date: '19 Mar', open: 1.02, high: 1.07, low: 1.02, close: 1.06, volume: 167000 },
  { date: '20 Mar', open: 1.06, high: 1.08, low: 1.03, close: 1.03, volume: 152000 },
  { date: '21 Mar', open: 1.03, high: 1.06, low: 1.02, close: 1.05, volume: 189000 },
  { date: '22 Mar', open: 1.05, high: 1.07, low: 1.03, close: 1.04, volume: 173000 },
];

// Вычисляем данные для свечей
const candleData = data.map(item => ({
  ...item,
  // Для green candle (close > open)
  candleTop: Math.max(item.open, item.close),
  candleBottom: Math.min(item.open, item.close),
  candleHeight: Math.abs(item.close - item.open),
  // Для wicks (тени)
  wickTop: item.high,
  wickBottom: item.low,
  color: item.close >= item.open ? '#00C49F' : '#FF4444',
}));

export default function CandlestickChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Candlestick Chart - OHLC (Open/High/Low/Close)</h2>
      <p>Свечной график для торговли и анализа ценовых движений</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={candleData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0.95, 1.10]} />
          <Tooltip content={<CandlestickTooltip />} />
          <Legend />
          
          {/* Wicks (тени) */}
          <Bar dataKey="high" fill="transparent" stroke="#666" strokeWidth={1} name="High/Low" />
          
          {/* Candle bodies (тела свечей) */}
          {candleData.map((entry, index) => (
            <Bar
              key={index}
              dataKey={() => entry.candleHeight}
              fill={entry.color}
              stackId={`candle-${index}`}
              name={entry.close >= entry.open ? 'Bullish' : 'Bearish'}
            />
          ))}
          
          <Line type="monotone" dataKey="close" stroke="#8884d8" strokeWidth={1} dot={false} name="Close Price" />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Торговля токенами на DEX (price action)</li>
          <li>Анализ волатильности цены</li>
          <li>Поддержка/сопротивление уровней</li>
          <li>Технический анализ для трейдеров</li>
        </ul>
        <p><strong>Note:</strong> Для полноценного свечного графика лучше использовать специализированные библиотеки типа <code>lightweight-charts</code> от TradingView</p>
      </div>
    </div>
  );
}

function CandlestickTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <p><strong>{data.date}</strong></p>
        <p style={{ color: '#00C49F' }}>Open: ${data.open.toFixed(3)}</p>
        <p style={{ color: '#FF4444' }}>High: ${data.high.toFixed(3)}</p>
        <p style={{ color: '#FF4444' }}>Low: ${data.low.toFixed(3)}</p>
        <p style={{ color: data.close >= data.open ? '#00C49F' : '#FF4444' }}>
          Close: ${data.close.toFixed(3)}
        </p>
        <p>Volume: ${data.volume.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}
