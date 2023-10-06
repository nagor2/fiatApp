import React from "react";
import {dateFromTimestamp, Loader} from "../utils/utils";
import Button from "./Button";

export default class Deposit extends React.Component{
    constructor(props){
        super(props);
        this.state={
            id:0,
            opened:0,
            updated: 0,
            coinsDeposited:0,
            accumulatedInterest:0,
            interestRate:0
        };

        this.close = this.close.bind(this);
        this.claimInterest = this.claimInterest.bind(this);
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({id:this.state.id})
        contracts['deposit'].methods.deposits(this.props.id).call().then((deposit)=>{
            this.setState({opened:dateFromTimestamp(deposit.timeOpened)});
            this.setState({updated:dateFromTimestamp(deposit.lastTimeUpdated)});
            this.setState({coinsDeposited:(deposit.coinsDeposited/10**18).toFixed(2)});
        })

        contracts['deposit'].methods.overallInterest(this.props.id).call().then((interest)=>{
            this.setState({accumulatedInterest:this.props.web3.utils.fromWei(interest)});
        })

        contracts['dao'].methods.params('depositRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    componentDidUpdate() {
        const { contracts } = this.props;
        contracts['deposit'].methods.deposits(this.props.id).call().then((deposit)=>{
            this.setState({opened:dateFromTimestamp(deposit.timeOpened)});
            this.setState({updated:dateFromTimestamp(deposit.lastTimeUpdated)});
            this.setState({coinsDeposited:(deposit.coinsDeposited/10**18).toFixed(2)});
        })

        contracts['deposit'].methods.overallInterest(this.props.id).call().then((interest)=>{
            this.setState({accumulatedInterest:this.props.web3.utils.fromWei(interest)});
        })

        contracts['dao'].methods.params('depositRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    close(){
        this.props.contracts['deposit'].methods.deposits(this.props.id).call().then((d)=>{
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
                .on('error', console.error);
        });

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
            .on('error', console.error);
    }

    render() {
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
