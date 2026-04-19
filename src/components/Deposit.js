import React from "react";
import {dateFromTimestamp, Loader, toFloat, formatNumber} from "../utils/utils";
import Button from "./Button";
import {cachedContractCall} from "../utils/cachedContractCall";

export default class Deposit extends React.Component{
    constructor(props){
        super(props);
        this.state={
            id:0,
            opened:0,
            updated: 0,
            coinsDeposited:0,
            accumulatedInterest:0,
            interestRate:0,
            loading: true
        };

        this.close = this.close.bind(this);
        this.claimInterest = this.claimInterest.bind(this);
    }

    async loadData({silent = false} = {}) {
        const { contracts } = this.props;
        
        if (!contracts || !contracts['deposit'] || !contracts['dao']) {
            console.warn('Deposit: contracts not initialized yet');
            this.setState({ loading: false });
            return;
        }

        if (!silent) this.setState({ loading: true });

        try {
            const [deposit, interest, rate] = await Promise.all([
                cachedContractCall('deposit', 'deposits', [this.props.id], contracts['deposit']),
                // overallInterest time-dependent (растёт каждый блок) — мимо
                // кэша воркера, иначе получим замороженный снимок.
                cachedContractCall('deposit', 'overallInterest', [this.props.id], contracts['deposit'], { noCache: true }),
                cachedContractCall('dao', 'params', ['depositRate'], contracts['dao']),
            ]);

            this.setState({
                opened: dateFromTimestamp(deposit.timeOpened),
                updated: dateFromTimestamp(deposit.lastTimeUpdated),
                coinsDeposited: toFloat(deposit.coinsDeposited)/10**18,
                accumulatedInterest: toFloat(interest)/10**18,
                interestRate: rate,
                loading: false
            });
        } catch (error) {
            console.error(`❌ Deposit: Failed to load deposit ${this.props.id}:`, error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
        // Accumulated interest растёт каждый блок (~12s). Тихий рефреш
        // каждые 15s, чтобы цифра не залипала до перезагрузки страницы.
        this.refreshTimer = setInterval(() => {
            this.loadData({silent: true});
        }, 15000);
    }

    componentWillUnmount() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.id !== this.props.id || (!prevProps.contracts?.deposit && this.props.contracts?.deposit)) {
            this.loadData();
        }
    }

    async close(){
        const d = await cachedContractCall(
            'deposit', 'deposits', [this.props.id], this.props.contracts['deposit']
        );

        this.props.contracts['deposit'].methods.withdraw(this.props.id,d.coinsDeposited).send({from:this.props.account})
                .on('transactionHash', (hash) => {
                    this.setState({'loader':true})
                })
                .on('receipt', (receipt) => {
                    this.setState({'loader':true})
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    this.setState({'loader':false})
                    window.location.reload();
                })
                .on('error', console.error)
                .catch(e=>console.error);
    }
    claimInterest(){
        //deposit.methods.claimInterest("+id+").send({from:userAddress});
        this.props.contracts['deposit'].methods.claimInterest(this.props.id).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                window.location.reload();
            })
            .on('error', console.error)
            .catch(e=>console.error);
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading deposit data...</div>;
        }

        return  <div align='left'>
            <Button emitter={this.props.emitter} action={'openDeposit'} id={this.props.id} name={"topUp"}/>
            <div align='center'><b>Deposit (id: {this.props.id})</b></div>
            <div>opened: <b>{this.state.opened}</b></div>
            <div>updated: <b>{this.state.updated}</b></div>
            <div>coinsDeposited (red/yellow/green): <b>{formatNumber(this.state.coinsDeposited, 2)} DFC</b></div>
            <Button emitter={this.props.emitter} action={'withdrawFromDeposit'} id={this.props.id} name={"withdraw"}/>
            <div>interest rate: <b>{this.state.interestRate}%</b></div>
            <div>accumulated interest: <b>{formatNumber(this.state.accumulatedInterest, 8)} DFC</b></div>
            <input className={'green'} type='button' value='claim interest' onClick={this.claimInterest}/>
            <input className={'green'} type='button' value='close' onClick={this.close}/>
            {this.state.loader?<Loader/>:''}

        </div>;
    }
}
