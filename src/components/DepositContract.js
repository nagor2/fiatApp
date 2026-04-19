import React from "react";
import {toFloat} from "../utils/utils";
import {cachedContractCall} from "../utils/cachedContractCall";

export default class DepositContract extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            id: 0,
            allowanceToDeposit: 0,
            approvedFromCDP: 1,
            depositsCount: 0,
            overallVolume: 0,
            overallFee: 0,
            depositRate: 0,
            loading: true
        };
    }

    async loadData() {
        const { contracts, account } = this.props;
        
        if (!contracts || !contracts['deposit'] || !contracts['flatCoin'] || !contracts['dao'] || !contracts['cdp']) {
            console.warn('DepositContract: contracts not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 DepositContract: Starting data load via Block Watcher API...');

            const depositAddress = contracts['deposit']._address;
            const cdpAddress = contracts['cdp']._address;

            const promises = [
                cachedContractCall('deposit', 'depositsCounter', [], contracts['deposit']),
                cachedContractCall('flatCoin', 'balanceOf', [depositAddress], contracts['flatCoin']),
                cachedContractCall('dao', 'params', ['depositRate'], contracts['dao']),
            ];

            if (account) {
                promises.push(
                    cachedContractCall('flatCoin', 'allowance', [account, depositAddress], contracts['flatCoin']),
                    cachedContractCall('flatCoin', 'allowance', [cdpAddress, account], contracts['flatCoin']),
                );
            }

            const results = await Promise.all(promises);

            const newState = {
                depositsCount: results[0],
                overallVolume: (toFloat(results[1])/10**18).toFixed(2),
                depositRate: results[2],
                address: depositAddress,
                loading: false
            };

            if (account) {
                newState.allowanceToDeposit = (toFloat(results[3])/10**18).toFixed(5);
                newState.approvedFromCDP = (toFloat(results[4])/10**18).toFixed(5);
            }

            this.setState(newState);

            console.log(`✅ DepositContract: Total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('❌ DepositContract: Failed to load data:', error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.deposit && this.props.contracts?.deposit) {
            console.log('DepositContract: Contracts initialized, loading data...');
            this.loadData();
        }
        
        if (prevProps.account !== this.props.account) {
            console.log('DepositContract: Account changed, reloading data...');
            this.loadData();
        }
    }

//TODO: implement overall fee
    render() {
        if (this.state.loading) {
            return <div align='center'>Loading deposit data...</div>;
        }

        return  <div align='left'>
            <div align='center'><b>Deposit contract</b></div>
            {this.props.account!==''?<button type="button" className={"button pointer green right"} onClick={()=>this.props.emitter.emit('change-state', [,'openDeposit',])}>Open deposit</button>:''}
            {this.props.account!==''?<div>your stable coin allowance to Deposit contract: <b>{this.state.allowanceToDeposit}</b></div>:''}
            {this.props.account!==''?<div>you are approved to withdraw from CDP: <b>{this.state.approvedFromCDP}</b></div>:''}
            {this.state.approvedFromCDP>0 && this.props.account!=''?<input type='button' value='transferFrom' onClick={this.transferFrom}/>:''}
            <div>N of deposits: <b>{this.state.depositsCount}</b></div>
            <div>overall volume: <b>{this.state.overallVolume}</b></div>
            <div>overall fee payed: <b>{this.state.overallFee}</b></div>
            <div>interest rate: <b>{this.state.depositRate}%</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['deposit'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }
}