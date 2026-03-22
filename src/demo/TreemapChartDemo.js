import React from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

// Пример данных: распределение ликвидности по пулам
const data = [
  {
    name: 'Liquidity Pools',
    children: [
      { name: 'DFC/ETH Pool', size: 850000, color: '#8884d8' },
      { name: 'RLE/DFC Pool', size: 620000, color: '#82ca9d' },
      { name: 'DFC/USDC Pool', size: 450000, color: '#ffc658' },
      { name: 'RLE/ETH Pool', size: 380000, color: '#ff8042' },
    ],
  },
  {
    name: 'Collateral',
    children: [
      { name: 'ETH Locked', size: 1200000, color: '#627eea' },
      { name: 'WBTC Locked', size: 450000, color: '#f7931a' },
    ],
  },
  {
    name: 'Deposits',
    children: [
      { name: 'Active Deposits', size: 980000, color: '#00C49F' },
      { name: 'Pending Withdrawals', size: 120000, color: '#FFBB28' },
    ],
  },
];

const COLORS = ['#8889DD', '#9597E4', '#8DC77B', '#A5D297', '#E2CF45', '#F8C12D'];

export default function TreemapChartDemo() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Treemap - Иерархическое распределение активов</h2>
      <p>Визуализация иерархических данных с пропорциональными размерами</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <Treemap
          data={data}
          dataKey="size"
          stroke="#fff"
          fill="#8884d8"
          content={<CustomizedContent />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
        <h4>DeFi Use Cases:</h4>
        <ul>
          <li>Распределение TVL по пулам и контрактам</li>
          <li>Portfolio composition с подкатегориями</li>
          <li>Иерархия доходов (fees, interest, rewards)</li>
          <li>Структура активов протокола</li>
        </ul>
      </div>
    </div>
  );
}

function CustomizedContent(props) {
  const { x, y, width, height, name, size, color } = props;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: color || '#8884d8',
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {width > 100 && height > 40 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="bold">
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={12}>
            ${(size / 1000).toFixed(0)}k
          </text>
        </>
      )}
    </g>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <p><strong>{data.name}</strong></p>
        <p>Value: ${data.size?.toLocaleString() || data.value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}
