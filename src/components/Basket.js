import React from "react";
import BasketItem from "./BasketItem";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default class Basket extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', itemsCount:'',basketItems:[], sharesCount:''}
    }

    async componentDidMount() {
        const { contracts } = this.props;
        
        if (!contracts || !contracts['basket']) {
            console.warn('Basket: contract not initialized yet');
            return;
        }

        try {
            const sharesCount = await contracts['basket'].methods.sharesCount().call();
            this.setState({sharesCount: parseInt(sharesCount)});

            const count = await contracts['basket'].methods.itemsCount().call();
            this.setState({itemsCount: parseInt(count)});

            const itemsPromises = [];
            for (let i = 1; i <= count; i++) {
                itemsPromises.push(contracts['basket'].methods.items(i).call());
            }

            const items = await Promise.all(itemsPromises);
            this.setState({basketItems: items});
            console.log('Basket items loaded:', items);
        } catch (error) {
            console.error('Failed to load basket data:', error);
        }

        this.setState({address: contracts['basket']._address});
    }

    async componentDidUpdate(prevProps) {
        const { contracts } = this.props;

        if (!contracts || !contracts['basket']) {
            return;
        }

        if (prevProps.contracts !== contracts) {
            try {
                const sharesCount = await contracts['basket'].methods.sharesCount().call();
                this.setState({sharesCount: parseInt(sharesCount)});

                const count = await contracts['basket'].methods.itemsCount().call();
                
                if (this.state.itemsCount !== parseInt(count)) {
                    this.setState({itemsCount: parseInt(count)});

                    const itemsPromises = [];
                    for (let i = 1; i <= count; i++) {
                        itemsPromises.push(contracts['basket'].methods.items(i).call());
                    }

                    const items = await Promise.all(itemsPromises);
                    this.setState({basketItems: items});
                }
            } catch (error) {
                console.error('Failed to update basket data:', error);
            }
        }
    }

    render() {
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