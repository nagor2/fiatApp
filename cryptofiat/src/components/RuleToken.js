import React from "react";
import {getHolders, getTransfers} from "../utils/utils";

export default class RuleToken extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', supply:'', transfers:'', holders:''}
    }

    componentWillReceiveProps () {
        this.props.contract.methods.totalSupply().call().then((supply)=>{this.setState({supply: (supply/10**18).toFixed(2)});});
        getTransfers(this.props.contract).then((result)=>{this.setState({transfers: result.length})});
        getHolders(this.props.contract).then((result)=>{this.setState({holders: result.length})});
        this.setState({address: this.props.contract._address});
    }
    componentDidMount() {
        this.props.contract.methods.totalSupply().call().then((supply)=>{this.setState({supply: (supply/10**18).toFixed(2)});});
        getTransfers(this.props.contract).then((result)=>{this.setState({transfers: result.length})});
        getHolders(this.props.contract).then((result)=>{this.setState({holders: result.length})});
        this.setState({address: this.props.contract._address});
    }



    render() {
        return <div align='left'><b>Rule token</b>
            <div>total supply:         <b>{this.state.supply}</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>

            <div>price in stableCoins (from pool):</div>

            <div>marketCap:</div>

            <div>pool volume:</div>

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>

        </div>
    }
}