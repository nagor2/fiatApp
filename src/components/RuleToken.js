import React from "react";
import {getHolders, getTransfers, toFloat} from "../utils/utils";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class RuleToken extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', supply:'', transfers:'', holders:'', loading: true}
    }

    componentWillReceiveProps () {
        this.loadContractData();
    }
    
    componentDidMount() {
        this.loadContractData();
    }
    
    async loadContractData() {
        if (!this.props.contract || !this.props.contract.methods) {
            console.warn('RuleToken: contract is not initialized yet');
            this.setState({ loading: false });
            return;
        }
        
        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 RuleToken: Starting data load via Block Watcher API...');

            const supplyRes = await fetch(`${BLOCK_WATCHER_API}/api/call/rule/totalSupply`);
            const supplyData = await supplyRes.json();
            this.setState({supply: (toFloat(supplyData.result)/10**18).toFixed(2)});

            const [transfers, holders] = await Promise.all([
                getTransfers(this.props.contract, this.props.web3),
                getHolders(this.props.contract, this.props.web3)
            ]);

            this.setState({
                transfers: transfers.length,
                holders: holders.length,
                address: this.props.contract._address,
                loading: false
            });

            console.log(`✅ RuleToken: Total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (err) {
            console.error('Failed to load RuleToken data:', err);
            this.setState({ loading: false });
        }
    }



    render() {
        if (this.state.loading) {
            return <div align='center'>Loading rule token data...</div>;
        }

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