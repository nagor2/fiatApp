import React from "react";
import {toFloat} from "../utils/utils";

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
            depositRate: 0
        };
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({address:contracts['deposit']._address});

        contracts['deposit'].methods.depositsCounter().call().then((result)=>{
            this.setState({depositsCount:result});
        });

        if (this.props.account){
            contracts['flatCoin'].methods.allowance(this.props.account,contracts['deposit']._address).call().then((result) => {
                this.setState({allowanceToDeposit:(toFloat(result)/10**18).toFixed(5)});
            });
            contracts['flatCoin'].methods.allowance(contracts['cdp']._address, this.props.account).call().then((result) => {
                this.setState({approvedFromCDP:(toFloat(result)/10**18).toFixed(5)});
            });
        }


        contracts['flatCoin'].methods.balanceOf(contracts['deposit']._address).call().then((result) => {
            this.setState({overallVolume:(toFloat(result)/10**18).toFixed(2)});
        });

        contracts['dao'].methods.params('depositRate').call().then((interest)=>{
            this.setState({depositRate:interest});
        })
    }

//TODO: implement overall fee
    render() {
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