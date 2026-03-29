import React from "react";
import {dateFromTimestamp, Loader, toFloat} from "../utils/utils";
import Button from "./Button";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

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

    async loadData() {
        const { contracts } = this.props;
        
        if (!contracts || !contracts['deposit'] || !contracts['dao']) {
            console.warn('Deposit: contracts not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });

        try {
            const [depositRes, interestRes, rateRes] = await Promise.all([
                fetch(`${BLOCK_WATCHER_API}/api/call/deposit/deposits?args=[${this.props.id}]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/deposit/overallInterest?args=[${this.props.id}]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["depositRate"]`)
            ]);

            const [depositData, interestData, rateData] = await Promise.all([
                depositRes.json(),
                interestRes.json(),
                rateRes.json()
            ]);

            const deposit = depositData.result;

            this.setState({
                opened: dateFromTimestamp(deposit.timeOpened),
                updated: dateFromTimestamp(deposit.lastTimeUpdated),
                coinsDeposited: (toFloat(deposit.coinsDeposited)/10**18).toFixed(2),
                accumulatedInterest: toFloat(interestData.result)/10**18,
                interestRate: rateData.result,
                loading: false
            });
        } catch (error) {
            console.error(`❌ Deposit: Failed to load deposit ${this.props.id}:`, error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.id !== this.props.id || (!prevProps.contracts?.deposit && this.props.contracts?.deposit)) {
            this.loadData();
        }
    }

    async close(){
        const depositRes = await fetch(`${BLOCK_WATCHER_API}/api/call/deposit/deposits?args=[${this.props.id}]`);
        const depositData = await depositRes.json();
        const d = depositData.result;
        
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
            <div>coinsDeposited (red/yellow/green): <b>{this.state.coinsDeposited}</b></div>
            <Button emitter={this.props.emitter} action={'withdrawFromDeposit'} id={this.props.id} name={"withdraw"}/>
            <div>interest rate: <b>{this.state.interestRate}%</b></div>
            <div>accumulated interest: <b>{this.state.accumulatedInterest}</b></div>
            <input className={'green'} type='button' value='claim interest' onClick={this.claimInterest}/>
            <input className={'green'} type='button' value='close' onClick={this.close}/>
            {this.state.loader?<Loader/>:''}

        </div>;
    }
}
