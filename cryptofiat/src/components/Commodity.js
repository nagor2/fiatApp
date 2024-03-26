import React from "react";
import {dateFromTimestamp} from '../utils/utils.js'

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
        const {contracts} = this.props;
        contracts['cart'].methods.items(this.props.id).call().then((item)=>{
            this.setState({initialPrice: parseFloat(item['initialPrice']/10**6).toFixed(5)});
            this.setState({share: item['share']});
            contracts['cart'].methods.getPrice(item['symbol']).call().then((price)=>{
                this.setState({price: parseFloat(price/10**6).toFixed(5)});});
            contracts['oracle'].methods.timeStamp(item['symbol']).call().then((timeStamp)=>{
                this.setState({lastUpdated: dateFromTimestamp(timeStamp)});
            });
        });
    }

    componentDidUpdate() {
        const {contracts} = this.props;
        contracts['cart'].methods.items(this.props.id).call().then((item)=>{
            this.setState({initialPrice: parseFloat(item['initialPrice']/10**6).toFixed(5)});
            this.setState({share: item['share']});
            contracts['cart'].methods.getPrice(item['symbol']).call().then((price)=>{
                this.setState({price: parseFloat(price/10**6).toFixed(5)});});
            contracts['oracle'].methods.timeStamp(item['symbol']).call().then((timeStamp)=>{
                this.setState({lastUpdated: dateFromTimestamp(timeStamp)});
            });
        });
    }
}
