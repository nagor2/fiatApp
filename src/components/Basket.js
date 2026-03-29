import React from "react";
import BasketItem from "./BasketItem";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class Basket extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', itemsCount:'',basketItems:[], sharesCount:'', loading: true}
    }

    async loadData() {
        const { contracts } = this.props;
        
        if (!contracts || !contracts['basket']) {
            console.warn('Basket: contract not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 Basket: Starting data load via Block Watcher API...');
            
            const t1 = performance.now();
            const sharesCountRes = await fetch(`${BLOCK_WATCHER_API}/api/call/basket/sharesCount`);
            const sharesCountData = await sharesCountRes.json();
            const sharesCount = parseInt(sharesCountData.result);
            console.log(`✅ Basket: sharesCount loaded in ${(performance.now() - t1).toFixed(0)}ms`);
            this.setState({sharesCount});

            const t2 = performance.now();
            const itemsCountRes = await fetch(`${BLOCK_WATCHER_API}/api/call/basket/itemsCount`);
            const itemsCountData = await itemsCountRes.json();
            const count = parseInt(itemsCountData.result);
            console.log(`✅ Basket: itemsCount=${count} loaded in ${(performance.now() - t2).toFixed(0)}ms`);
            this.setState({itemsCount: count});

            const t3 = performance.now();
            const itemsPromises = [];
            for (let i = 1; i <= count; i++) {
                itemsPromises.push(
                    fetch(`${BLOCK_WATCHER_API}/api/call/basket/items?args=[${i}]`)
                        .then(res => res.json())
                        .then(data => data.result)
                        .catch(err => {
                            console.warn(`Failed to load basket item ${i}:`, err);
                            return null;
                        })
                );
            }

            const items = (await Promise.all(itemsPromises)).filter(item => item !== null);
            console.log(`✅ Basket: ${items.length} items loaded in ${(performance.now() - t3).toFixed(0)}ms`);
            
            this.setState({basketItems: items, loading: false});
            
            const totalTime = performance.now() - startTime;
            console.log(`✅ Basket: Total load time: ${totalTime.toFixed(0)}ms`);
        } catch (error) {
            console.error('❌ Basket: Failed to load basket data:', error);
            this.setState({ loading: false });
        }

        this.setState({address: contracts['basket']._address});
    }

    componentDidMount() {
        this.loadData();
    }

    async componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.basket && this.props.contracts?.basket) {
            console.log('Basket: Contracts initialized, loading data...');
            this.loadData();
        }
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading basket data...</div>;
        }

        let items = this.state.basketItems?this.state.basketItems.map(product =><BasketItem key={product.symbol} symbol={product.symbol} initialPrice={product.initialPrice} share={product.share} balance={product.balance} name = {product.name}/>):'';
        
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];
        
        const chartData = this.state.basketItems.map(item => ({
            name: item.symbol || item.name,
            value: parseInt(item.share) || 0
        }));
        
        const totalShares = chartData.reduce((sum, item) => sum + item.value, 0);
        
        return <div align='center'><b>Basket contract</b><div/>
            <div align='left'>
                <div>itemsCount:         <b>{this.state.itemsCount}</b></div>
                <div>total shares:         <b>{this.state.sharesCount}</b></div>

                {/* Pie Chart */}
                {this.state.basketItems && this.state.basketItems.length > 0 && (
                    <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                        <h3 style={{ marginBottom: '15px', color: '#000' }}>Commodities Distribution</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value, name) => {
                                        const percent = totalShares > 0 ? ((value / totalShares) * 100).toFixed(1) : 0;
                                        const item = this.state.basketItems.find(i => (i.symbol || i.name) === name);
                                        const initialPrice = item ? (parseInt(item.initialPrice) / 10**6).toFixed(2) : 'N/A';
                                        return [`${value} shares (${percent}%), initial price: $${initialPrice}`, name];
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}


                <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
                <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
            </div>
        </div>
    }
}