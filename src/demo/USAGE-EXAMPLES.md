# Recharts Usage Examples for DotFlat

Готовые примеры кода для интеграции графиков в DotFlat компоненты.

## 1. График цены токена в компоненте

```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function TokenPrice({ contract, web3 }) {
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    async function fetchPriceHistory() {
      // Получаем события swap из пула
      const events = await getPastEventsCached(
        contract,
        'Swap',
        { fromBlock: fromBlock },
        web3
      );

      // Группируем по дням и вычисляем среднюю цену
      const history = events.reduce((acc, event) => {
        const timestamp = new Date(event.block.timestamp * 1000);
        const date = timestamp.toISOString().split('T')[0];
        
        if (!acc[date]) {
          acc[date] = { date, prices: [] };
        }
        
        const price = calculatePrice(event.returnValues);
        acc[date].prices.push(price);
        
        return acc;
      }, {});

      const chartData = Object.values(history).map(day => ({
        date: day.date,
        price: day.prices.reduce((a, b) => a + b) / day.prices.length,
      }));

      setPriceHistory(chartData);
    }

    fetchPriceHistory();
  }, [contract, web3]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={priceHistory}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## 2. TVL Dashboard

```jsx
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function TVLDashboard({ contracts, web3 }) {
  const [tvlData, setTvlData] = useState([]);

  useEffect(() => {
    async function calculateTVL() {
      const ethBalance = await web3.eth.getBalance(contracts.cdp._address);
      const depositsTotal = await contracts.deposit.methods.totalDeposits().call();
      const poolLiquidity = await contracts.pool.methods.totalSupply().call();

      // Здесь логика для исторических данных...
      // Можно получать через события или external API

      setTvlData([
        { date: 'Today', deposits: depositsTotal, collateral: ethBalance, liquidity: poolLiquidity }
      ]);
    }

    calculateTVL();
  }, [contracts, web3]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={tvlData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
        <Area type="monotone" dataKey="deposits" stackId="1" fill="#8884d8" />
        <Area type="monotone" dataKey="collateral" stackId="1" fill="#82ca9d" />
        <Area type="monotone" dataKey="liquidity" stackId="1" fill="#ffc658" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

## 3. Portfolio Pie Chart

```jsx
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function UserPortfolio({ contracts, account }) {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    async function fetchBalances() {
      const dfcBalance = await contracts.flatCoin.methods.balanceOf(account).call();
      const rleBalance = await contracts.rule.methods.balanceOf(account).call();
      const depositBalance = await contracts.deposit.methods.getUserDeposits(account).call();

      setAssets([
        { name: 'DFC', value: parseFloat(dfcBalance) / 1e18 },
        { name: 'RLE', value: parseFloat(rleBalance) / 1e18 },
        { name: 'Deposits', value: parseFloat(depositBalance) / 1e18 },
      ]);
    }

    if (account) {
      fetchBalances();
    }
  }, [contracts, account]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={assets}
          cx="50%"
          cy="50%"
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, value }) => `${name}: ${value.toFixed(2)}`}
        >
          {assets.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

## 4. Trading Volume Bar Chart

```jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function TradingVolumeChart({ poolContract, web3 }) {
  const [volumeData, setVolumeData] = useState([]);

  useEffect(() => {
    async function fetchVolume() {
      // Получаем Swap события за последние 7 дней
      const fromBlockNumber = await getBlockNumberDaysAgo(web3, 7);
      
      const swapEvents = await getPastEventsCached(
        poolContract,
        'Swap',
        { fromBlock: fromBlockNumber },
        web3
      );

      // Группируем по дням
      const volumeByDay = swapEvents.reduce((acc, event) => {
        const date = new Date(event.block.timestamp * 1000).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, volume: 0, count: 0 };
        }
        acc[date].volume += calculateSwapVolume(event.returnValues);
        acc[date].count += 1;
        return acc;
      }, {});

      setVolumeData(Object.values(volumeByDay));
    }

    fetchVolume();
  }, [poolContract, web3]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={volumeData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="volume" fill="#8884d8" name="Volume ($)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## 5. Real-time Price (с WebSocket от block-watcher)

```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function RealTimePriceChart({ poolContract }) {
  const [priceData, setPriceData] = useState([]);

  useEffect(() => {
    // Подключаемся к WebSocket block-watcher
    const ws = new WebSocket('ws://localhost:3003');
    
    ws.onmessage = async (event) => {
      const health = JSON.parse(event.data);
      
      // При новом релевантном блоке - обновляем цену
      if (health.lastRelevantBlock) {
        const reserves = await poolContract.methods.getReserves().call();
        const price = reserves[0] / reserves[1];
        
        setPriceData(prev => {
          const newData = [...prev, {
            time: new Date(health.lastNetworkBlockTime).toLocaleTimeString(),
            price: price,
          }];
          
          // Храним последние 20 точек
          return newData.slice(-20);
        });
      }
    };

    return () => ws.close();
  }, [poolContract]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={priceData}>
        <XAxis dataKey="time" />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#82ca9d" dot={false} isAnimationActive={true} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## 6. Composed Chart (Price + Volume)

```jsx
import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function PriceVolumeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="right" dataKey="volume" fill="#8884d8" name="Volume" />
        <Line yAxisId="left" type="monotone" dataKey="price" stroke="#ff7300" name="Price" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

## Tips & Best Practices

### 1. Responsive Design
Всегда используйте `ResponsiveContainer`:
```jsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    {/* ... */}
  </LineChart>
</ResponsiveContainer>
```

### 2. Custom Tooltips
Создавайте кастомные tooltips для лучшего UX:
```jsx
function CustomTooltip({ active, payload }) {
  if (active && payload) {
    return (
      <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc' }}>
        <p>Price: ${payload[0].value}</p>
        <p>Volume: {payload[1].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

<Tooltip content={<CustomTooltip />} />
```

### 3. Форматирование значений
```jsx
<Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
<YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
```

### 4. Цвета для DeFi
```javascript
const DEFI_COLORS = {
  primary: '#8884d8',
  success: '#00C49F',
  warning: '#FFBB28',
  danger: '#FF4444',
  eth: '#627eea',
  btc: '#f7931a',
  usdc: '#2775ca',
};
```

### 5. Loading State
```jsx
{!data ? (
  <div>Loading chart...</div>
) : (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={data}>
      {/* ... */}
    </LineChart>
  </ResponsiveContainer>
)}
```

## Performance Tips

1. **Мемоизация данных**: используйте `useMemo` для тяжелых вычислений
2. **Ограничивайте точки**: для больших датасетов показывайте последние N точек
3. **Debounce для real-time**: не обновляйте чаще чем нужно
4. **Lazy loading**: загружайте исторические данные постранично

## Интеграция с Redux

```jsx
import { useSelector } from 'react-redux';

function ChartFromRedux() {
  const priceHistory = useSelector(state => state.tokens.priceHistory);
  
  return (
    <LineChart data={priceHistory}>
      {/* ... */}
    </LineChart>
  );
}
```
