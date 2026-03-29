import React from "react";
import {dateFromTimestamp, toFloat} from '../utils/utils.js'
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class Commodity extends React.Component{
    constructor(props) {
        super(props);
        this.state = {initialPrice:'', price:'', lastUpdated:'', share:'', id: '', previd:'', loading: true}
    }

    render() {
        if (this.state.loading) {
            return <div align='left'><b>{this.props.title}</b><div>Loading...</div></div>;
        }

        return <div align='left'><b>{this.props.title}</b>
            <div>price: <b>{this.state.price}</b></div>
            <div>initialPrice: <b>{this.state.initialPrice}</b></div>
            <div>change: <b>{(100*(this.state.price - this.state.initialPrice)/this.state.initialPrice).toFixed(2)}%</b></div>
            <div>lastUpdated: <b>{this.state.lastUpdated}</b></div>
            <div>share: <b>{this.state.share}</b></div>
        </div>
    }

    componentDidMount() {
        this.loadCommodityData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.id !== this.props.id) {
            this.loadCommodityData();
        }
    }
    
    async loadCommodityData() {
        const {contracts} = this.props;
        
        if (!contracts || !contracts['basket'] || !contracts['oracle'] || !this.props.id) {
            console.warn('Commodity: contracts not initialized or id is missing');
            this.setState({ loading: false });
            return;
        }
        
        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log(`🔄 Commodity: Loading item ${this.props.id} via Block Watcher API...`);

            const itemRes = await fetch(`${BLOCK_WATCHER_API}/api/call/basket/items?args=[${this.props.id}]`);
            const itemData = await itemRes.json();
            const item = itemData.result;

            const symbol = item.symbol || item[0];
            
            const [priceRes, timestampRes] = await Promise.all([
                fetch(`${BLOCK_WATCHER_API}/api/call/basket/getPrice?args=["${encodeURIComponent(symbol)}"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/oracle/timeStamp?args=["${encodeURIComponent(symbol)}"]`)
            ]);

            const [priceData, timestampData] = await Promise.all([
                priceRes.json(),
                timestampRes.json()
            ]);

            this.setState({
                initialPrice: (toFloat(item.initialPrice || item[2])/10**6).toFixed(5),
                share: item.share || item[1],
                price: (toFloat(priceData.result)/10**6).toFixed(5),
                lastUpdated: dateFromTimestamp(timestampData.result),
                loading: false
            });

            console.log(`✅ Commodity: Item ${this.props.id} loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error(`❌ Commodity: Failed to load item ${this.props.id}:`, error);
            this.setState({ loading: false });
        }
    }
}
