import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import {cachedContractCall} from "../utils/cachedContractCall";
import {getContractTransactions} from "../utils/cacheApi";

const INVESTING_COM_URLS = {
    'Gold': 'https://www.investing.com/commodities/gold',
    'XAU/USD': 'https://www.investing.com/currencies/xau-usd',
    'Silver': 'https://www.investing.com/commodities/silver',
    'XAG/USD': 'https://www.investing.com/currencies/xag-usd',
    'Copper': 'https://www.investing.com/commodities/copper',
    'Copper London': 'https://www.investing.com/commodities/copper',
    'Platinum': 'https://www.investing.com/commodities/platinum',
    'Palladium': 'https://www.investing.com/commodities/palladium',
    'Crude Oil WTI': 'https://www.investing.com/commodities/crude-oil',
    'Brent Oil': 'https://www.investing.com/commodities/brent-oil',
    'Natural Gas': 'https://www.investing.com/commodities/natural-gas',
    'Heating Oil': 'https://www.investing.com/commodities/heating-oil',
    'Gasoline RBOB': 'https://www.investing.com/commodities/gasoline-rbob',
    'London Gas Oil': 'https://www.investing.com/commodities/london-gas-oil',
    'Aluminium': 'https://www.investing.com/commodities/aluminum',
    'Zinc': 'https://www.investing.com/commodities/zinc-futures',
    'Nickel': 'https://www.investing.com/commodities/nickel',
    'US Wheat': 'https://www.investing.com/commodities/us-wheat',
    'Rough Rice': 'https://www.investing.com/commodities/rough-rice',
    'US Corn': 'https://www.investing.com/commodities/us-corn',
    'US Soybeans': 'https://www.investing.com/commodities/us-soybeans',
    'US Soybean Oil': 'https://www.investing.com/commodities/us-soybean-oil',
    'US Soybean Meal': 'https://www.investing.com/commodities/us-soybean-meal',
    'US Cotton': 'https://www.investing.com/commodities/us-cotton-no.2',
    'US Cocoa': 'https://www.investing.com/commodities/us-cocoa',
    'Orange Juice': 'https://www.investing.com/commodities/orange-juice',
    'Live Cattle': 'https://www.investing.com/commodities/live-cattle',
    'Lumber': 'https://www.investing.com/commodities/lumber',
    'US Coffee C': 'https://www.investing.com/commodities/us-coffee-c',
    'London Coffee': 'https://www.investing.com/commodities/london-coffee',
    'US Sugar': 'https://www.investing.com/commodities/us-sugar-no11',
    'Lean Hogs': 'https://www.investing.com/commodities/lean-hogs',
    'Feeder Cattle': 'https://www.investing.com/commodities/feed-cattle',
    'Oats': 'https://www.investing.com/commodities/oats'
};

export default class ExchangeRateContract extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            address: '',
            instrumentsCount: '',
            priceHistory: [],
            selectedInstrument: 'none',
            instruments: [],
            loading: true,
            currentPricesOpen: false,
            priceHistoryOpen: false
        };
        this.toggleCurrentPrices = this.toggleCurrentPrices.bind(this);
        this.togglePriceHistory = this.togglePriceHistory.bind(this);
    }

    toggleCurrentPrices() {
        this.setState({ currentPricesOpen: !this.state.currentPricesOpen });
    }

    togglePriceHistory() {
        this.setState({ priceHistoryOpen: !this.state.priceHistoryOpen });
    }

    async loadData() {
        const { contracts, web3 } = this.props;
        
        if (!contracts || !contracts['oracle'] || !contracts['basket']) {
            console.warn('Oracle or Basket contract not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });

        try {
            const oracleAddress = contracts['oracle']._address;
            this.setState({ address: oracleAddress });

            const instrumentsCountRaw = await cachedContractCall(
                'oracle', 'instrumentsCount', [], contracts['oracle']
            );
            const instrumentsCount = parseInt(instrumentsCountRaw);
            this.setState({ instrumentsCount });

            console.log('Oracle instrumentsCount:', instrumentsCount);

            const [basketItemsCountRaw, sharesCountRaw] = await Promise.all([
                cachedContractCall('basket', 'itemsCount', [], contracts['basket']),
                cachedContractCall('basket', 'sharesCount', [], contracts['basket']),
            ]);
            const basketItemsCount = parseInt(basketItemsCountRaw);
            const totalShares = parseInt(sharesCountRaw);

            const basketItems = [];
            const basketPromises = [];

            for (let id = 1; id <= basketItemsCount; id++) {
                basketPromises.push(
                    cachedContractCall('basket', 'items', [id], contracts['basket'])
                        .then(item => {
                            basketItems.push({
                                symbol: item.symbol,
                                share: parseInt(item.share),
                                initialPrice: parseFloat(item.initialPrice) / 10**6
                            });
                        })
                        .catch(err => {
                            console.warn(`Failed to load basket item ${id}:`, err);
                        })
                );
            }
            await Promise.all(basketPromises);

            console.log('Basket items loaded:', basketItems);

            const basketSymbolToOracleId = new Map();
            const dictionaryPromises = [];

            for (const item of basketItems) {
                dictionaryPromises.push(
                    cachedContractCall('oracle', 'dictionary', [item.symbol], contracts['oracle'])
                        .then(dict => {
                            const oracleId = parseInt(dict.id);
                            const decimals = parseInt(dict.decimals);
                            if (oracleId > 0) {
                                basketSymbolToOracleId.set(item.symbol, {
                                    oracleId,
                                    decimals,
                                    share: item.share,
                                    initialPrice: item.initialPrice
                                });
                            }
                        })
                        .catch(err => {
                            console.warn(`Failed to load dictionary for ${item.symbol}:`, err);
                        })
                );
            }
            await Promise.all(dictionaryPromises);

            console.log('Symbol to Oracle ID mapping:', Array.from(basketSymbolToOracleId.entries()));

            const instrumentsMap = new Map();
            const oraclePromises = [];

            for (const [symbol, info] of basketSymbolToOracleId) {
                const id = info.oracleId;
                oraclePromises.push(
                    cachedContractCall('oracle', 'instruments', [id], contracts['oracle'])
                        .then(instrument => {
                            const decimals = info.decimals;

                            instrumentsMap.set(id, {
                                id,
                                symbol,
                                decimals,
                                currentPrice: parseFloat(instrument.price) / (10**decimals),
                                timestamp: parseInt(instrument.timeStamp),
                                initialPrice: info.initialPrice
                            });
                        })
                        .catch(err => {
                            console.warn(`Failed to load oracle instrument ${symbol} (ID=${id}):`, err);
                        })
                );
            }

            await Promise.all(oraclePromises);

            // Add ETH from oracle — not a basket commodity but tracked by the oracle.
            // Call contract directly (not via cachedContractCall) so failures here
            // don't trip the shared circuit breaker and break getContractTransactions.
            let ethOracleId = null;
            try {
                const ethDict = await contracts['oracle'].methods.dictionary('eth').call();
                const parsedEthId = parseInt(ethDict.id);
                if (parsedEthId > 0) {
                    const ethInstrument = await contracts['oracle'].methods.instruments(parsedEthId).call();
                    const ethDecimals = parseInt(ethDict.decimals);
                    instrumentsMap.set(parsedEthId, {
                        id: parsedEthId,
                        symbol: 'ETH',
                        decimals: ethDecimals,
                        currentPrice: parseFloat(ethInstrument.price) / (10 ** ethDecimals),
                        timestamp: parseInt(ethInstrument.timeStamp),
                        initialPrice: null
                    });
                    ethOracleId = parsedEthId;
                }
            } catch (err) {
                console.warn('ETH not available in oracle:', err);
            }

            // История транзакций — только через worker'а, без Etherscan-fallback.
            // Если worker недоступен, получим [] и график просто не построится,
            // зато текущие цены из контракта отобразятся.
            const txs = await getContractTransactions(oracleAddress, 100);
            const transactions = txs.filter(tx => tx.method === 'updateSeveralPrices');

            console.log('updateSeveralPrices transactions found:', transactions.length);

            const priceMap = new Map();

            const updateSeveralPricesABI = contracts['oracle']._jsonInterface.find(
                x => x.name === 'updateSeveralPrices' && x.type === 'function'
            );

            for (const tx of transactions) {
                try {
                    const decoded = web3.eth.abi.decodeParameters(
                        updateSeveralPricesABI.inputs,
                        tx.input.slice(10)
                    );

                    const ids = decoded.ids || decoded[0];
                    const prices = decoded.prices || decoded[1];

                    const timestamp = parseInt(tx.blockTimestamp);
                    const blockNumber = parseInt(tx.blockNumber);

                    const key = `${timestamp}-${blockNumber}`;
                    if (!priceMap.has(key)) {
                        priceMap.set(key, {
                            timestamp,
                            blockNumber,
                            date: new Date(timestamp * 1000).toLocaleDateString('ru-RU'),
                            time: new Date(timestamp * 1000).toLocaleTimeString('ru-RU')
                        });
                    }

                    const entry = priceMap.get(key);

                    for (let i = 0; i < ids.length; i++) {
                        const id = parseInt(ids[i]);
                        const instrumentInfo = instrumentsMap.get(id);
                        
                        if (instrumentInfo) {
                            const decimals = instrumentInfo.decimals;
                            const price = parseFloat(prices[i]) / (10**decimals);
                            entry[instrumentInfo.symbol] = price;
                            entry[`${instrumentInfo.symbol}_original`] = price;
                        }
                    }

                    let weightedRatioSum = 0;
                    
                    for (const [symbol, info] of basketSymbolToOracleId) {
                        const currentPrice = entry[symbol];
                        if (currentPrice && info.initialPrice > 0) {
                            const ratio = currentPrice / info.initialPrice;
                            weightedRatioSum += ratio * info.share;
                        }
                    }
                    
                    if (totalShares > 0) {
                        const weightedRatio = weightedRatioSum / totalShares;
                        entry['DFC'] = weightedRatio;
                    }
                } catch (error) {
                    console.error('Failed to decode tx:', tx.hash, error);
                }
            }

            let currentWeightedRatioSum = 0;
            let latestTimestamp = 0;
            
            for (const [, info] of basketSymbolToOracleId) {
                const instrumentData = instrumentsMap.get(info.oracleId);
                if (instrumentData && info.initialPrice > 0) {
                    const ratio = instrumentData.currentPrice / info.initialPrice;
                    currentWeightedRatioSum += ratio * info.share;
                    latestTimestamp = Math.max(latestTimestamp, instrumentData.timestamp);
                }
            }
            
            const currentDfcPrice = totalShares > 0 ? currentWeightedRatioSum / totalShares : 0;
            const dfcTimestamp = latestTimestamp;

            const priceHistory = Array.from(priceMap.values())
                .sort((a, b) => a.timestamp - b.timestamp);

            const firstDFC = priceHistory.length > 0 ? priceHistory[0].DFC : null;
            
            if (firstDFC && firstDFC > 0) {
                priceHistory.forEach(entry => {
                    if (entry.DFC) {
                        entry.DFC = entry.DFC / firstDFC;
                    }
                });
            }

            for (const [symbol, info] of basketSymbolToOracleId) {
                if (info.initialPrice && info.initialPrice > 0) {
                    priceHistory.forEach(entry => {
                        if (entry[symbol]) {
                            entry[symbol] = entry[symbol] / info.initialPrice;
                        }
                    });
                }
            }

            // Normalize ETH by its first historical price (same approach as DFC)
            const firstEthEntry = priceHistory.find(e => e['ETH'] !== undefined);
            const firstETHRaw = firstEthEntry ? firstEthEntry['ETH'] : null;
            if (firstETHRaw && firstETHRaw > 0) {
                priceHistory.forEach(entry => {
                    if (entry['ETH'] !== undefined) {
                        entry['ETH'] = entry['ETH'] / firstETHRaw;
                    }
                });
            }

            console.log('Price history built:', priceHistory.length, 'entries');
            console.log('First DFC (base):', firstDFC);
            console.log('Current DFC from contract:', currentDfcPrice);

            const normalizedCurrentDFC = firstDFC && firstDFC > 0 
                ? currentDfcPrice / firstDFC
                : currentDfcPrice;

            const ethInst = ethOracleId !== null ? instrumentsMap.get(ethOracleId) : null;

            const instruments = [
                {
                    id: 0,
                    symbol: 'DFC',
                    currentPrice: normalizedCurrentDFC,
                    timestamp: dfcTimestamp
                },
                ...(ethInst ? [{
                    id: ethInst.id,
                    symbol: 'ETH',
                    originalPrice: ethInst.currentPrice,
                    currentPrice: firstETHRaw && firstETHRaw > 0
                        ? ethInst.currentPrice / firstETHRaw
                        : ethInst.currentPrice,
                    timestamp: ethInst.timestamp,
                    initialPrice: firstETHRaw || undefined
                }] : []),
                ...Array.from(instrumentsMap.values())
                    .filter(inst => inst.symbol !== 'ETH')
                    .map(inst => ({
                        ...inst,
                        originalPrice: inst.currentPrice,
                        currentPrice: inst.initialPrice && inst.initialPrice > 0
                            ? inst.currentPrice / inst.initialPrice
                            : inst.currentPrice
                    }))
            ];

            console.log('Price history built:', priceHistory.length, 'entries');
            console.log('Instruments:', instruments);

            this.setState({ 
                priceHistory,
                instruments,
                loading: false 
            });

        } catch (error) {
            console.error('Failed to load oracle data:', error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.oracle && this.props.contracts?.oracle) {
            console.log('Contracts initialized, loading data...');
            this.loadData();
        }
    }

    render() {
        const { priceHistory, selectedInstrument, instruments, loading } = this.state;

        if (loading) {
            return <div align='center'>Loading oracle data...</div>;
        }

        const dfcKey = 'DFC';
        const dataKeys = [dfcKey];
        if (selectedInstrument && selectedInstrument !== 'none' && selectedInstrument !== dfcKey) {
            dataKeys.push(selectedInstrument);
        }

        let minValue = Infinity;
        let maxValue = -Infinity;
        
        priceHistory.forEach(entry => {
            dataKeys.forEach(key => {
                const value = entry[key];
                if (value !== undefined && value !== null) {
                    minValue = Math.min(minValue, value);
                    maxValue = Math.max(maxValue, value);
                }
            });
        });

        if (minValue === Infinity) minValue = 0.5;
        if (maxValue === -Infinity) maxValue = 1.5;

        const padding = (maxValue - minValue) * 0.1;
        const domainMin = Math.max(0, Math.floor((minValue - padding) * 2) / 2);
        const domainMax = Math.ceil((maxValue + padding) * 2) / 2;

        const tickStep = 0.5;
        const ticks = [];
        for (let tick = Math.floor(domainMin / tickStep) * tickStep; tick <= domainMax; tick += tickStep) {
            ticks.push(Math.round(tick * 10) / 10);
        }
        
        if (!ticks.includes(1)) {
            ticks.push(1);
            ticks.sort((a, b) => a - b);
        }

        return (
            <div align='center'>
                <b>Exchange Rate Contract (Oracle)</b>
                <div/>
                <div align='left'>
                    <div>instrumentsCount: <b>{this.state.instrumentsCount}</b></div>
                    
                    {/* Instrument Selector */}
                    <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>
                            Additional Instrument:
                        </label>
                        <select
                            value={selectedInstrument}
                            onChange={(e) => this.setState({ selectedInstrument: e.target.value })}
                            style={{
                                padding: '8px 12px',
                                background: '#fff',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        >
                            <option value="none">None</option>
                            {instruments.filter(i => i.symbol !== dfcKey).map(instrument => (
                                <option key={instrument.id} value={instrument.symbol}>
                                    {instrument.symbol}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Line Chart */}
                    {priceHistory.length > 0 && (
                        <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                            <h3 style={{ marginBottom: '15px', color: '#000' }}>Price History</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={priceHistory}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="date" 
                                        label={{ value: 'Date', position: 'insideBottom', offset: -5 }}
                                    />
                                    <YAxis 
                                        label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                                        domain={[domainMin, domainMax]}
                                        ticks={ticks}
                                    />
                                    <ReferenceLine 
                                        y={1} 
                                        stroke="#666" 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                    />
                                    <Tooltip 
                                        formatter={(value, name, props) => {
                                            if (name === 'DFC') {
                                                return [value.toFixed(4), name];
                                            }
                                            const originalPrice = props.payload[`${name}_original`];
                                            if (originalPrice !== undefined) {
                                                return [`$${originalPrice.toFixed(2)}`, name];
                                            }
                                            return [`$${value.toFixed(2)}`, name];
                                        }}
                                        labelFormatter={(label, payload) => {
                                            if (payload && payload.length > 0) {
                                                return `${payload[0].payload.date} ${payload[0].payload.time}`;
                                            }
                                            return label;
                                        }}
                                    />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey={dfcKey}
                                        stroke="#8884d8" 
                                        strokeWidth={2}
                                        dot={false}
                                        name={dfcKey}
                                    />
                                    {selectedInstrument && selectedInstrument !== 'none' && selectedInstrument !== dfcKey && (
                                        <Line 
                                            type="monotone" 
                                            dataKey={selectedInstrument}
                                            stroke="#82ca9d" 
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Price Table */}
                    {priceHistory.length > 0 && (
                        <div style={{ marginTop: '30px' }}>
                            <div className="expander" onClick={this.togglePriceHistory}>
                                <div className="bt-tile__title pointer">
                                    Price Updates History
                                    <svg className={this.state.priceHistoryOpen ? 'rotate-180' : 'rotate-0'} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: '10px', verticalAlign: 'middle' }}>
                                        <g fill="none" fillRule="evenodd" transform="translate(-446 -398)">
                                            <path fill="currentColor" fillRule="nonzero" d="M95.8838835,240.366117 C95.3957281,239.877961 94.6042719,239.877961 94.1161165,240.366117 C93.6279612,240.854272 93.6279612,241.645728 94.1161165,242.133883 L98.6161165,246.633883 C99.1042719,247.122039 99.8957281,247.122039 100.383883,246.633883 L104.883883,242.133883 C105.372039,241.645728 105.372039,240.854272 104.883883,240.366117 C104.395728,239.877961 103.604272,239.877961 103.116117,240.366117 L99.5,243.982233 L95.8838835,240.366117 Z" transform="translate(356.5 164.5)"></path>
                                            <polygon points="446 418 466 418 466 398 446 398"></polygon>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                            <div className={"collapsed" + (this.state.priceHistoryOpen ? ' in' : '')}>
                                <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', marginTop: '15px' }}>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '13px'
                                    }}>
                                        <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                                            <tr style={{ borderBottom: '2px solid #ddd' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Date</th>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Time</th>
                                                <th style={{ padding: '10px', textAlign: 'left', color: '#000' }}>Block</th>
                                                {dataKeys.map(key => (
                                                    <th key={key} style={{ padding: '10px', textAlign: 'right', color: '#000' }}>
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {priceHistory.slice().reverse().map((entry, idx) => (
                                                <tr key={`${entry.timestamp}-${entry.blockNumber}`} style={{
                                                    borderBottom: '1px solid #eee',
                                                    background: idx % 2 === 0 ? '#fff' : '#f9f9f9'
                                                }}>
                                                    <td style={{ padding: '10px', color: '#000' }}>
                                                        {entry.date}
                                                    </td>
                                                    <td style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
                                                        {entry.time}
                                                    </td>
                                                    <td style={{ padding: '10px', color: '#000' }}>
                                                        {entry.blockNumber}
                                                    </td>
                                                    {dataKeys.map(key => {
                                                        const originalKey = `${key}_original`;
                                                        const value = key === 'DFC' ? entry[key] : entry[originalKey];
                                                        
                                                        return (
                                                            <td key={key} style={{ padding: '10px', textAlign: 'right', color: '#000', fontWeight: 'bold' }}>
                                                                {value !== undefined && value !== null
                                                                    ? (key === 'DFC' ? value.toFixed(4) : `$${value.toFixed(2)}`)
                                                                    : '-'
                                                                }
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Prices */}
                    <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                        <div className="expander" onClick={this.toggleCurrentPrices}>
                            <div className="bt-tile__title pointer">
                                Current prices in contract
                                <svg className={this.state.currentPricesOpen ? 'rotate-180' : 'rotate-0'} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: '10px', verticalAlign: 'middle' }}>
                                    <g fill="none" fillRule="evenodd" transform="translate(-446 -398)">
                                        <path fill="currentColor" fillRule="nonzero" d="M95.8838835,240.366117 C95.3957281,239.877961 94.6042719,239.877961 94.1161165,240.366117 C93.6279612,240.854272 93.6279612,241.645728 94.1161165,242.133883 L98.6161165,246.633883 C99.1042719,247.122039 99.8957281,247.122039 100.383883,246.633883 L104.883883,242.133883 C105.372039,241.645728 105.372039,240.854272 104.883883,240.366117 C104.395728,239.877961 103.604272,239.877961 103.116117,240.366117 L99.5,243.982233 L95.8838835,240.366117 Z" transform="translate(356.5 164.5)"></path>
                                        <polygon points="446 418 466 418 466 398 446 398"></polygon>
                                    </g>
                                </svg>
                            </div>
                        </div>
                        <div className={"collapsed" + (this.state.currentPricesOpen ? ' in' : '')}>
                            <div style={{ marginTop: '15px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                    {instruments.map(instrument => {
                                        const investingUrl = INVESTING_COM_URLS[instrument.symbol];
                                        
                                        const displayPrice = instrument.originalPrice || instrument.currentPrice;
                                        
                                        let percentChange = null;
                                        let changeColor = '#666';
                                        if (instrument.initialPrice && instrument.initialPrice > 0 && instrument.originalPrice) {
                                            percentChange = ((instrument.originalPrice - instrument.initialPrice) / instrument.initialPrice) * 100;
                                            changeColor = percentChange >= 0 ? '#4caf50' : '#f44336';
                                        }
                                        
                                        return (
                                            <div key={instrument.id} style={{ padding: '10px', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                        <div style={{ fontWeight: 'bold', color: '#000' }}>
                                            {investingUrl ? (
                                                <a 
                                                    href={investingUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#000', textDecoration: 'none' }}
                                                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                                >
                                                    {instrument.symbol}
                                                </a>
                                            ) : (
                                                instrument.symbol
                                            )}
                                        </div>
                                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginTop: '5px' }}>
                                                    {instrument.symbol === 'DFC' 
                                                        ? (displayPrice ? displayPrice.toFixed(4) : 'N/A')
                                                        : (displayPrice ? `$${displayPrice.toFixed(2)}` : 'N/A')
                                                    }
                                                </div>
                                                
                                                {instrument.initialPrice && instrument.initialPrice > 0 && (
                                                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                                        Initial: ${instrument.initialPrice.toFixed(2)}{' '}
                                                        {percentChange !== null && (
                                                            <span style={{ color: changeColor, fontWeight: 'bold' }}>
                                                                ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                                                    {instrument.timestamp ? new Date(instrument.timestamp * 1000).toLocaleString('ru-RU') : 'N/A'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <div>address: <a target='_blank' rel="noopener noreferrer" href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
                        <div>code: <a target='_blank' rel="noopener noreferrer" href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
                    </div>
                </div>
            </div>
        );
    }
}
