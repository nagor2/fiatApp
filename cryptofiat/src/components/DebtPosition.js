import React from "react";
import {dateFromTimestamp} from "../utils/utils";
import Button from "./Button";
import CDP from "./CDP";

export default class DebtPosition extends React.Component{
    constructor(props){

        super(props);
        this.state={
            id:0,
            fee:0,
            maxStableCoinsToMint: 0,
            timeOpened:0,
            lastTimeUpdated:0,
            coinsMinted: 0,
            wethLocked:0,
            feeGeneratedRecorded:0,
            interestRate:0,
            liquidationStatus:0
        };
//TODO: implement and test
        this.closeCDP = this.closeCDP.bind(this);
        this.updateCDP = this.updateCDP.bind(this);
        this.withdraw = this.withdraw.bind(this);
        this.payInterest = this.payInterest.bind(this);
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({id:this.state.id})
        contracts['cdp'].methods.positions(this.props.id).call().then((position)=>{
            this.setState({position:position});
            this.setState({liquidationStatus:position.liquidationStatus});
            this.setState({timeOpened:dateFromTimestamp(position.timeOpened)});
            this.setState({lastTimeUpdated:dateFromTimestamp(position.lastTimeUpdated)});
            this.setState({coinsMinted:this.props.web3.utils.fromWei(position.coinsMinted)});
            this.setState({wethLocked:this.props.web3.utils.fromWei(position.wethAmountLocked)});
            this.setState({feeGeneratedRecorded:this.props.web3.utils.fromWei(position.interestAmountRecorded)});


            contracts['cdp'].methods.getMaxStableCoinsToMintForPos(this.state.id).call().then((maxCoins)=>{
                this.setState({maxStableCoinsToMint:this.props.web3.utils.fromWei(maxCoins)});
            })
        })
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:this.props.web3.utils.fromWei(fee)});
        })

        contracts['dao'].methods.params('interestRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    componentDidUpdate() {
        const { contracts } = this.props;
        contracts['cdp'].methods.positions(this.props.id).call().then((position)=>{
            this.setState({position:position});
            this.setState({liquidationStatus:position.liquidationStatus});
            this.setState({timeOpened:dateFromTimestamp(position.timeOpened)});
            this.setState({lastTimeUpdated:dateFromTimestamp(position.lastTimeUpdated)});
            this.setState({coinsMinted:this.props.web3.utils.fromWei(position.coinsMinted)});
            this.setState({wethLocked:this.props.web3.utils.fromWei(position.ethAmountLocked)});
            this.setState({feeGeneratedRecorded:this.props.web3.utils.fromWei(position.interestAmountRecorded)});
            contracts['cdp'].methods.getMaxStableCoinsToMintForPos(this.state.id).call().then((maxCoins)=>{
                this.setState({maxStableCoinsToMint:this.props.web3.utils.fromWei(maxCoins)});
            })
        })
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:this.props.web3.utils.fromWei(fee)});
        })

        contracts['dao'].methods.params('interestRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    closeCDP(){
        ;
    }
    updateCDP(){}
    withdraw(){}
    payInterest(){
        /*
        this.props.contracts['cdp'].methods.transferFee(this.props.id).send({from:this.props.account}).then(function (result) {
            alert('success');
        });*/
    }

    render() {
        return  <div align='left'>
            <div align='center'><b>Debt position (id: {this.props.id})</b></div>
            <Button emitter={this.props.emitter} action={'payInterest'} id={this.props.id} name={"payInterest"} item={this.state.position}/>
            <div>opened: <b>{this.state.timeOpened}</b></div>
            <div>updated: <b>{this.state.lastTimeUpdated}</b></div>
            <div>coinsMinted (red/yellow/green): <b>{this.state.coinsMinted}</b></div>
            <Button emitter={this.props.emitter} action={'updateCDP'} id={this.props.id} name={"Update position"} item={this.state.position}/>
            <div>interest rate: <b>{this.state.interestRate}%</b></div>
            <div>wethLocked: <b>{this.state.wethLocked}</b></div>
            <div>maxCoinsToMint : <b>{this.state.maxStableCoinsToMint}</b></div>
            <Button emitter={this.props.emitter} action={'closeCDP'} id={this.props.id} name={"Close position"} item={this.state.position}/>
            <div>recorded fee: <b>{this.state.feeGeneratedRecorded}</b></div>
            <div>accumulated interest: <b>{this.state.fee}</b></div>
            <div>liquidationStatus: <b>{this.state.liquidationStatus}</b></div>
            <br/>
            <Button emitter={this.props.emitter} action={'withdrawEther'} id={this.props.id} name={"withdraw ether"} item={this.state.position}/>

            <br/><br/><br/><br/><br/>


        </div>;
    }
}
