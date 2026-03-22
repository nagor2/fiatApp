import React from "react";
import {getHolders, getTransfers, toFloat} from "../utils/utils";

export default class RuleToken extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', supply:'', transfers:'', holders:''}
    }

    componentWillReceiveProps () {
        this.loadContractData();
    }
    
    componentDidMount() {
        this.loadContractData();
    }
    
    loadContractData() {
        if (!this.props.contract || !this.props.contract.methods) {
            console.warn('RuleToken: contract is not initialized yet');
            return;
        }
        
        this.props.contract.methods.totalSupply().call().then((supply)=>{
            this.setState({supply: (toFloat(supply)/10**18).toFixed(2)});
        }).catch(err => console.error('Failed to get totalSupply:', err));
        
        getTransfers(this.props.contract, this.props.web3).then((result)=>{
            this.setState({transfers: result.length});
        }).catch(err => console.error('Failed to get transfers:', err));
        
        getHolders(this.props.contract, this.props.web3).then((result)=>{
            this.setState({holders: result.length});
        }).catch(err => console.error('Failed to get holders:', err));
        
        this.setState({address: this.props.contract._address});
    }



    render() {
        return <div align='left'>
            <div align='center'><b>Rule token</b></div>
            <div>total supply:         <b>{this.state.supply}</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>

            <div>price in stableCoins (from pool): <b>coming soon</b></div>

            <div>marketCap:  <b>coming soon</b></div>

            <div>pool volume:  <b>coming soon</b></div>

            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>

        </div>
    }
}