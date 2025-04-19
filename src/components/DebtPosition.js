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
            ethLocked:0,
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

            //console.log(position)

            this.setState({position:position});
            this.setState({liquidationStatus:position.liquidationStatus});
            if (position.timeOpened!=undefined)
            this.setState({timeOpened:dateFromTimestamp(position.timeOpened)});
            if (position.lastTimeUpdated!=undefined)
            this.setState({lastTimeUpdated:dateFromTimestamp(position.lastTimeUpdated)});
            if (position.coinsMinted!=undefined)
                this.setState({coinsMinted:parseFloat(position.coinsMinted)/10**18});

            if (position.ethAmountLocked!=undefined)
                this.setState({ethLocked:this.props.web3.utils.fromWei(position.ethAmountLocked,'ether')});
            if (position.interestAmountRecorded!=undefined)
                this.setState({feeGeneratedRecorded:this.props.web3.utils.fromWei(position.interestAmountRecorded,'ether')});


            contracts['cdp'].methods.getMaxFlatCoinsToMintForPos(this.state.id).call().then((maxCoins)=>{
                this.setState({maxStableCoinsToMint:parseFloat(maxCoins)/10**18});
            })
        })
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:parseFloat(fee)/10**18});
        })

        contracts['dao'].methods.params('interestRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    static getDerivedStateFromProps(props, state) {
        // Store prevId in state so we can compare when props change.
        // Clear out previously-loaded data (so we don't render stale stuff).
        if (props.id !== state.prevId) {
            return {
                externalData: null,
                prevId: props.id,
            };
        }
        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps !== this.props) {
            const { contracts } = this.props;
            contracts['cdp'].methods.positions(this.props.id).call().then((position)=>{
                this.setState({position:position});
                this.setState({liquidationStatus:position.liquidationStatus});
                if (position.lastTimeUpdated!=undefined)
                this.setState({timeOpened:dateFromTimestamp(position.timeOpened)});
                if (position.lastTimeUpdated!=undefined)
                this.setState({lastTimeUpdated:dateFromTimestamp(position.lastTimeUpdated)});
                if (position.coinsMinted!=undefined)
                    this.setState({coinsMinted:parseFloat(position.coinsMinted)/10**18});

                if (position.ethAmountLocked!=undefined)
                    this.setState({ethLocked:parseFloat(position.ethAmountLocked)/10**18});
                if (position.interestAmountRecorded!=undefined)
                    this.setState({feeGeneratedRecorded:parseFloat(position.interestAmountRecorded)/10**18});


                contracts['cdp'].methods.getMaxFlatCoinsToMintForPos(this.state.id).call().then((maxCoins)=>{
                    this.setState({maxStableCoinsToMint:parseFloat(maxCoins)/10**18});
                })
            })
            contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
                this.setState({fee:parseFloat(fee)/10**18});
            })

            contracts['dao'].methods.params('interestRate').call().then((interest)=>{
                this.setState({interestRate:interest});
            })
        }

    }

    closeCDP(){

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
            <div>ethereum locked: <b>{this.state.ethLocked}</b></div>
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
