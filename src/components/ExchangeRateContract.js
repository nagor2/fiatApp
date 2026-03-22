import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class ExchangeRateContract extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            address: '',
            instrumentsCount: '',
            priceHistory: [],
            selectedInstrument: 'none',
            instruments: [],
            loading: true
        }
    }

    async componentDidMount() {
        const { contracts } = this.props;
        
        if (!contracts || !contracts['oracle']) {
            console.warn('Oracle contract not initialized yet');
            return;
        }

        try {
            const oracleAddress = contracts['oracle']._address;
            this.setState({ address: oracleAddress });

            const instrumentsCountResponse = await fetch(
                `${BLOCK_WATCHER_API}/api/call/oracle/instrumentsCount`
            );
            const instrumentsCountData = await instrumentsCountResponse.json();
            const instrumentsCount = parseInt(instrumentsCountData.result);
            
            this.setState({ instrumentsCount });

            const instrumentsMap = new Map();
            const instrumentPromises = [];
            
            for (let id = 1; id <= instrumentsCount; id++) {
                instrumentPromises.push(
                    fetch(`${BLOCK_WATCHER_API}/api/call/oracle/instruments?args=[${id}]`)
                        .then(res => res.json())
                        .then(data => {
                            const instrument = data.result;
                            const price = parseFloat(instrument.price) / 10**18;
                            const timestamp = parseInt(instrument.timeStamp);
                            
                            instrumentsMap.set(id, {
                                id,
                                name: `Instrument #${id}`,
                                price,
                                timestamp
                            });
                        })
                );
            }
            
            await Promise.all(instrumentPromises);

            const eventsResponse = await fetch(
                `${BLOCK_WATCHER_API}/api/events/${oracleAddress}?event=priceUpdated&limit=100`
            );
            const eventsData = await eventsResponse.json();
            const events = eventsData.events || [];

            console.log('Oracle events loaded:', events.length);

            const priceMap = new Map();
            const eventInstrumentRequests = new Map();

            for (const event of events) {
                const id = parseInt(event.returnValues.id);
                const blockNumber = parseInt(event.blockNumber);
                const timestamp = parseInt(event.blockTimestamp);
                const price = parseFloat(event.returnValues.price) / 10**18;

                const instrumentName = instrumentsMap.get(id)?.name || `Instrument #${id}`;

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
                entry[instrumentName] = price;
            }

            const priceHistory = Array.from(priceMap.values())
                .sort((a, b) => a.timestamp - b.timestamp);

            const instruments = Array.from(instrumentsMap.values());

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

    render() {
        const { priceHistory, selectedInstrument, instruments, loading } = this.state;

        if (loading) {
            return <div align='center'>Loading oracle data...</div>;
        }

        const dfcKey = 'Instrument #1';
        const dataKeys = [dfcKey];
        if (selectedInstrument && selectedInstrument !== 'none' && selectedInstrument !== dfcKey) {
            dataKeys.push(selectedInstrument);
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
                            {instruments.filter(i => i.name !== dfcKey).map(instrument => (
                                <option key={instrument.id} value={instrument.name}>
                                    {instrument.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Current Prices */}
                    <div style={{ marginTop: '20px', marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <h4 style={{ marginTop: 0, color: '#000' }}>Current Prices:</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                            {instruments.map(instrument => (
                                <div key={instrument.id} style={{ padding: '10px', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    <div style={{ fontWeight: 'bold', color: '#2196f3' }}>{instrument.name}</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginTop: '5px' }}>
                                        ${instrument.price.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                                        {new Date(instrument.timestamp * 1000).toLocaleString('ru-RU')}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                        label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip 
                                        formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
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
                                        name="DFC/USD"
                                    />
                                    {selectedInstrument && selectedInstrument !== dfcKey && (
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
                            <h3 style={{ marginBottom: '15px', color: '#000' }}>Price Updates History</h3>
                            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
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
                                                    {key === dfcKey ? 'DFC/USD' : key}
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
                                                {dataKeys.map(key => (
                                                    <td key={key} style={{ padding: '10px', textAlign: 'right', color: '#000', fontWeight: 'bold' }}>
                                                        {entry[key] ? `$${entry[key].toFixed(2)}` : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '20px' }}>
                        <div>address: <a target='_blank' rel="noopener noreferrer" href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
                        <div>code: <a target='_blank' rel="noopener noreferrer" href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
                    </div>
                </div>
            </div>
        );
    }
}
