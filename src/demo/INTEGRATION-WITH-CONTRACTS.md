# Интеграция Recharts с DotFlat Smart Contracts

Примеры использования реальных данных из контрактов в графиках.

## 1. График цены DFC из Pool контракта

```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPastEventsChunked, getBlockNumberDaysAgo } from '../utils/eventHelpers';

function DFCPriceChart({ contracts, web3 }) {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPriceHistory() {
      try {
        // Получаем события Swap за последние 30 дней
        const fromBlock = await getBlockNumberDaysAgo(web3, 30);
        
        const swapEvents = await getPastEventsChunked(
          contracts.pool,
          'Swap',
          { fromBlock },
          web3
        );

        // Группируем по дням и вычисляем среднюю цену
        const priceByDay = {};
        
        for (const event of swapEvents) {
          const block = await web3.eth.getBlock(event.blockNumber);
          const date = new Date(Number(block.timestamp) * 1000).toISOString().split('T')[0];
          
          // Получаем reserves после swap
          const { amount0In, amount0Out, amount1In, amount1Out } = event.returnValues;
          
          // Вычисляем цену (упрощенно)
          const price = calculatePriceFromSwap(amount0In, amount0Out, amount1In, amount1Out);
          
          if (!priceByDay[date]) {
            priceByDay[date] = { date, prices: [], volume: 0 };
          }
          
          priceByDay[date].prices.push(price);
          priceByDay[date].volume += Math.abs(Number(amount0Out) + Number(amount1Out)) / 1e18;
        }

        // Вычисляем средние значения
        const chartData = Object.values(priceByDay).map(day => ({
          date: day.date,
          price: day.prices.reduce((a, b) => a + b, 0) / day.prices.length,
          volume: day.volume,
        }));

        setPriceData(chartData);
      } catch (error) {
        console.error('Error fetching price history:', error);
      } finally {
        setLoading(false);
      }
    }

    if (contracts.pool && web3) {
      fetchPriceHistory();
    }
  }, [contracts, web3]);

  if (loading) return <div>Loading price chart...</div>;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: 'Volume', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Line yAxisId="left" type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} name="DFC Price" />
        <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#82ca9d" strokeWidth={2} name="Volume" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function calculatePriceFromSwap(amount0In, amount0Out, amount1In, amount1Out) {
  // Упрощенная логика - адаптируйте под вашу пару токенов
  const amount0 = Number(amount0Out) || Number(amount0In);
  const amount1 = Number(amount1Out) || Number(amount1In);
  return amount0 / amount1;
}

export default DFCPriceChart;
```

## 2. TVL Dashboard с реальными данными

```jsx
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function TVLDashboard({ contracts, web3, ethPrice }) {
  const [tvlData, setTvlData] = useState([]);

  useEffect(() => {
    async function fetchTVL() {
      try {
        // Текущие значения
        const ethCollateral = await web3.eth.getBalance(contracts.cdp._address);
        const totalDeposits = await contracts.deposit.methods.totalDeposits().call();
        const poolLiquidity = await contracts.pool.methods.totalSupply().call();

        // Конвертируем в USD
        const ethCollateralUSD = (Number(ethCollateral) / 1e18) * ethPrice;
        const depositsUSD = Number(totalDeposits) / 1e18; // DFC = $1
        const liquidityUSD = Number(poolLiquidity) / 1e18;

        // Для исторических данных можно использовать события
        // или внешний API (The Graph, Dune Analytics)
        
        setTvlData([{
          date: new Date().toISOString().split('T')[0],
          deposits: depositsUSD,
          collateral: ethCollateralUSD,
          liquidity: liquidityUSD,
          total: depositsUSD + ethCollateralUSD + liquidityUSD,
        }]);

      } catch (error) {
        console.error('Error fetching TVL:', error);
      }
    }

    fetchTVL();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchTVL, 30000);
    return () => clearInterval(interval);
    
  }, [contracts, web3, ethPrice]);

  return (
    <div>
      <h3>Total Value Locked: ${tvlData[0]?.total.toLocaleString()}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={tvlData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
          <Legend />
          <Area type="monotone" dataKey="deposits" stackId="1" stroke="#8884d8" fill="#8884d8" name="Deposits" />
          <Area type="monotone" dataKey="collateral" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="ETH Collateral" />
          <Area type="monotone" dataKey="liquidity" stackId="1" stroke="#ffc658" fill="#ffc658" name="Pool Liquidity" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TVLDashboard;
```

## 3. User Portfolio Pie Chart

```jsx
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function UserPortfolio({ contracts, account }) {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    async function fetchBalances() {
      if (!account) return;

      try {
        const [dfcBalance, rleBalance, depositBalance, cdpBalance] = await Promise.all([
          contracts.flatCoin.methods.balanceOf(account).call(),
          contracts.rule.methods.balanceOf(account).call(),
          contracts.deposit.methods.balanceOf(account).call(),
          contracts.cdp.methods.getUserCollateral(account).call(),
        ]);

        const assetsData = [
          { name: 'DFC Balance', value: Number(dfcBalance) / 1e18, color: '#0088FE' },
          { name: 'RLE Balance', value: Number(rleBalance) / 1e18, color: '#00C49F' },
          { name: 'Deposits', value: Number(depositBalance) / 1e18, color: '#FFBB28' },
          { name: 'CDP Collateral', value: Number(cdpBalance) / 1e18, color: '#FF8042' },
        ].filter(asset => asset.value > 0);

        setAssets(assetsData);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      }
    }

    fetchBalances();
  }, [contracts, account]);

  if (assets.length === 0) {
    return <div>Connect wallet to see your portfolio</div>;
  }

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);

  return (
    <div>
      <h3>Your Portfolio: {totalValue.toFixed(2)} USD</h3>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={assets}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
            outerRadius={120}
            dataKey="value"
          >
            {assets.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default UserPortfolio;
```

## 4. Auction Activity Chart

```jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPastEventsChunked, getBlockNumberDaysAgo } from '../utils/eventHelpers';

function AuctionActivityChart({ contracts, web3 }) {
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    async function fetchAuctionActivity() {
      try {
        const fromBlock = await getBlockNumberDaysAgo(web3, 7);
        
        const auctionEvents = await getPastEventsChunked(
          contracts.auction,
          'newAuction',
          { fromBlock },
          web3
        );

        const bidEvents = await getPastEventsChunked(
          contracts.auction,
          'newBid',
          { fromBlock },
          web3
        );

        // Группируем по дням
        const activityByDay = {};
        
        for (const event of [...auctionEvents, ...bidEvents]) {
          const block = await web3.eth.getBlock(event.blockNumber);
          const date = new Date(Number(block.timestamp) * 1000).toISOString().split('T')[0];
          
          if (!activityByDay[date]) {
            activityByDay[date] = { date, auctions: 0, bids: 0 };
          }
          
          if (event.event === 'newAuction') {
            activityByDay[date].auctions += 1;
          } else {
            activityByDay[date].bids += 1;
          }
        }

        setActivityData(Object.values(activityByDay));
      } catch (error) {
        console.error('Error fetching auction activity:', error);
      }
    }

    fetchAuctionActivity();
  }, [contracts, web3]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={activityData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="auctions" fill="#8884d8" name="New Auctions" />
        <Bar dataKey="bids" fill="#82ca9d" name="Bids Placed" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default AuctionActivityChart;
```

## 5. CDP Collateral Ratio Distribution

```jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPastEventsChunked } from '../utils/eventHelpers';

function CollateralRatioDistribution({ contracts, web3 }) {
  const [distribution, setDistribution] = useState([]);

  useEffect(() => {
    async function fetchCDPData() {
      try {
        // Получаем все открытые CDP
        const events = await getPastEventsChunked(
          contracts.cdp,
          'PositionOpened',
          { fromBlock: fromBlock },
          web3
        );

        // Получаем текущий collateral ratio для каждого CDP
        const ratios = await Promise.all(
          events.map(async (event) => {
            const cdpId = event.returnValues.id;
            const cdp = await contracts.cdp.methods.positions(cdpId).call();
            
            if (cdp.active) {
              const collateral = Number(cdp.collateralAmount) / 1e18;
              const debt = Number(cdp.debtAmount) / 1e18;
              const ratio = (collateral / debt) * 100;
              return ratio;
            }
            return null;
          })
        );

        // Группируем по диапазонам (150-175%, 175-200%, etc)
        const ranges = {
          '150-175%': 0,
          '175-200%': 0,
          '200-250%': 0,
          '250-300%': 0,
          '300%+': 0,
        };

        ratios.filter(r => r !== null).forEach(ratio => {
          if (ratio < 175) ranges['150-175%']++;
          else if (ratio < 200) ranges['175-200%']++;
          else if (ratio < 250) ranges['200-250%']++;
          else if (ratio < 300) ranges['250-300%']++;
          else ranges['300%+']++;
        });

        const chartData = Object.entries(ranges).map(([range, count]) => ({
          range,
          count,
        }));

        setDistribution(chartData);
      } catch (error) {
        console.error('Error fetching CDP distribution:', error);
      }
    }

    fetchCDPData();
  }, [contracts, web3]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={distribution}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#8884d8" name="Number of CDPs" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default CollateralRatioDistribution;
```

## 6. DAO Voting History

```jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPastEventsChunked } from '../utils/eventHelpers';

function DAOVotingHistory({ contracts, web3 }) {
  const [votingData, setVotingData] = useState([]);

  useEffect(() => {
    async function fetchVotings() {
      try {
        const events = await getPastEventsChunked(
          contracts.dao,
          'NewVoting',
          { fromBlock: fromBlock },
          web3
        );

        // Получаем результаты каждого голосования
        const votings = await Promise.all(
          events.map(async (event) => {
            const votingId = event.returnValues.id;
            const voting = await contracts.dao.methods.votings(votingId).call();
            
            return {
              id: `Voting #${votingId}`,
              yes: Number(voting.votesYes) / 1e18,
              no: Number(voting.votesNo) / 1e18,
              status: voting.executed ? 'Executed' : 'Pending',
            };
          })
        );

        setVotingData(votings.slice(-10)); // Последние 10
      } catch (error) {
        console.error('Error fetching voting history:', error);
      }
    }

    fetchVotings();
  }, [contracts, web3]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={votingData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="id" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="yes" fill="#00C49F" name="Yes Votes" />
        <Bar dataKey="no" fill="#FF4444" name="No Votes" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default DAOVotingHistory;
```

## 7. Real-time Network Status (с block-watcher WebSocket)

```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function NetworkStatusChart() {
  const [blockData, setBlockData] = useState([]);
  const [workerStatus, setWorkerStatus] = useState('disconnected');

  useEffect(() => {
    // Подключаемся к WebSocket block-watcher
    const ws = new WebSocket('ws://localhost:3003');
    
    ws.onopen = () => {
      setWorkerStatus('connected');
    };
    
    ws.onmessage = (event) => {
      const health = JSON.parse(event.data);
      
      setBlockData(prev => {
        const newData = [...prev, {
          time: new Date(health.lastNetworkBlockTime).toLocaleTimeString(),
          blockNumber: health.lastNetworkBlock,
          relevantBlock: health.lastRelevantBlock,
        }];
        
        // Держим последние 20 точек
        return newData.slice(-20);
      });
    };
    
    ws.onerror = () => {
      setWorkerStatus('error');
    };
    
    ws.onclose = () => {
      setWorkerStatus('disconnected');
    };

    return () => ws.close();
  }, []);

  return (
    <div>
      <h3>
        Network Status: 
        <span style={{ 
          marginLeft: '10px',
          color: workerStatus === 'connected' ? '#00C49F' : '#FF4444' 
        }}>
          {workerStatus}
        </span>
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={blockData}>
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="blockNumber" stroke="#8884d8" dot={false} name="Network Block" />
          <Line type="monotone" dataKey="relevantBlock" stroke="#82ca9d" dot={false} name="Last Update" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default NetworkStatusChart;
```

## 8. Transfer Activity Heatmap

```jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getPastEventsChunked, getBlockNumberDaysAgo } from '../utils/eventHelpers';

function TransferActivityChart({ contracts, web3 }) {
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const fromBlock = await getBlockNumberDaysAgo(web3, 7);
        
        const transferEvents = await getPastEventsChunked(
          contracts.flatCoin,
          'Transfer',
          { fromBlock },
          web3
        );

        // Группируем по дням и часам
        const activityByHour = {};
        
        for (const event of transferEvents) {
          const block = await web3.eth.getBlock(event.blockNumber);
          const date = new Date(Number(block.timestamp) * 1000);
          const hour = date.getHours();
          
          if (!activityByHour[hour]) {
            activityByHour[hour] = { hour: `${hour}:00`, count: 0, volume: 0 };
          }
          
          activityByHour[hour].count += 1;
          activityByHour[hour].volume += Number(event.returnValues.value) / 1e18;
        }

        const chartData = Array.from({ length: 24 }, (_, i) => 
          activityByHour[i] || { hour: `${i}:00`, count: 0, volume: 0 }
        );

        setActivityData(chartData);
      } catch (error) {
        console.error('Error fetching transfer activity:', error);
      }
    }

    fetchActivity();
  }, [contracts, web3]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={activityData}>
        <XAxis dataKey="hour" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#8884d8" name="Transactions" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default TransferActivityChart;
```

## Tips для работы с contract данными

### 1. Кэширование для оптимизации

```jsx
// Сохраняем в localStorage
const cacheKey = `chart_${contractAddress}_${fromBlock}_${toBlock}`;
const cached = localStorage.getItem(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchChartData();
localStorage.setItem(cacheKey, JSON.stringify(data));
```

### 2. Обработка ошибок

```jsx
try {
  const data = await fetchData();
  setChartData(data);
} catch (error) {
  console.error('Chart data error:', error);
  setError('Failed to load chart data');
}
```

### 3. Loading состояния

```jsx
{loading ? (
  <div>Loading chart...</div>
) : error ? (
  <div>Error: {error}</div>
) : (
  <ResponsiveContainer>
    <LineChart data={chartData}>...</LineChart>
  </ResponsiveContainer>
)}
```

### 4. Автообновление с block-watcher

```jsx
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3003');
  
  ws.onmessage = (event) => {
    const health = JSON.parse(event.data);
    
    // Обновляем данные только если был релевантный блок
    if (health.lastRelevantBlock > lastProcessedBlock) {
      refreshChartData();
      setLastProcessedBlock(health.lastRelevantBlock);
    }
  };
  
  return () => ws.close();
}, []);
```

## Performance Best Practices

1. **Используйте мемоизацию**:
```jsx
const chartData = useMemo(() => {
  return processContractEvents(events);
}, [events]);
```

2. **Ограничивайте данные**:
```jsx
// Показываем только последние 30 дней
const recentData = allData.slice(-30);
```

3. **Batch запросы**:
```jsx
const [balance1, balance2, balance3] = await Promise.all([
  contract1.methods.balanceOf(account).call(),
  contract2.methods.balanceOf(account).call(),
  contract3.methods.balanceOf(account).call(),
]);
```

4. **Debounce обновления**:
```jsx
const debouncedUpdate = useCallback(
  debounce(() => fetchChartData(), 1000),
  []
);
```

---

📚 **См. также:**
- `USAGE-EXAMPLES.md` - Базовые примеры кода
- `src/utils/cacheApi.js` - Cache API для работы с block-watcher
- `workers/block-watcher/DUAL-CACHE.md` - Архитектура кэширования
