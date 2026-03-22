import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Симуляция real-time данных
const initialData = [
  { time: '10:00', price: 1.02, txCount: 45 },
  { time: '10:05', price: 1.03, txCount: 52 },
  { time: '10:10', price: 1.02, txCount: 48 },
  { time: '10:15', price: 1.04, txCount: 61 },
  { time: '10:20', price: 1.03, txCount: 55 },
];

export default function AnimatedChartDemo() {
  const [data, setData] = useState(initialData);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData];
        
        // Генерируем новую точку данных
        const lastPoint = newData[newData.length - 1];
        const timeparts = lastPoint.time.split(':');
        const newMinutes = parseInt(timeparts[1]) + 5;
        const newTime = `${timeparts[0]}:${newMinutes.toString().padStart(2, '0')}`;
        
        const priceChange = (Math.random() - 0.5) * 0.04;
        const newPrice = Math.max(0.98, Math.min(1.06, lastPoint.price + priceChange));
        const newTxCount = Math.floor(40 + Math.random() * 30);
        
        newData.push({
          time: newTime,
          price: parseFloat(newPrice.toFixed(3)),
          txCount: newTxCount,
        });
        
        // Держим только последние 10 точек
        if (newData.length > 10) {
          newData.shift();
        }
        
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Animated Chart - Real-time Updates</h2>
      <p>График с анимированным обновлением данных (симуляция real-time)</p>
      
      <button 
        onClick={() => setIsLive(!isLive)}
        style={{
          padding: '10px 20px',
          marginBottom: '20px',
          background: isLive ? '#ff4444' : '#00C49F',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        {isLive ? '⏸ Stop Live Updates' : '▶ Start Live Updates'}
      </button>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis yAxisId="left" domain={[0.98, 1.06]} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="price" 
            stroke="#8884d8" 
            strokeWidth={2} 
            dot={{ r: 4 }}
            animationDuration={500}
            name="Price ($)"
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="txCount" 
            stroke="#82ca9d" 
            strokeWidth={2}
            dot={{ r: 4 }}
            animationDuration={500}
            name="Tx/5min"
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Real-time price monitoring</li>
          <li>Live transaction activity</li>
          <li>Gas price tracking</li>
          <li>Pool reserves real-time updates</li>
          <li>Auction bidding activity live feed</li>
        </ul>
        <p><strong>Integration:</strong> Подключается к WebSocket от block-watcher для получения real-time обновлений</p>
      </div>
    </div>
  );
}
