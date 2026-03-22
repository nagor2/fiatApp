import React from "react";
import {dateFromTimestamp, toFloat} from '../utils/utils.js'

export default class Commodity extends React.Component{
    constructor(props) {
        super(props);
        this.state = {initialPrice:'', price:'', lastUpdated:'', share:'', id: '', previd:''}
    }

    render() {
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
    
    loadCommodityData() {
        const {contracts} = this.props;
        
        if (!contracts || !contracts['basket'] || !contracts['oracle'] || !this.props.id) {
            console.warn('Commodity: contracts not initialized or id is missing');
            return;
        }
        
        contracts['basket'].methods.items(this.props.id).call().then((item)=>{
            this.setState({initialPrice: (toFloat(item['initialPrice'])/10**6).toFixed(5)});
            this.setState({share: item['share']});
            contracts['basket'].methods.getPrice(item['symbol']).call().then((price)=>{
                this.setState({price: (toFloat(price)/10**6).toFixed(5)});
            }).catch(err => console.error('Failed to get price:', err));
            
            contracts['oracle'].methods.timeStamp(item['symbol']).call().then((timeStamp)=>{
                this.setState({lastUpdated: dateFromTimestamp(timeStamp)});
            }).catch(err => console.error('Failed to get timestamp:', err));
        }).catch(err => console.error('Failed to get commodity item:', err));
    }
}
