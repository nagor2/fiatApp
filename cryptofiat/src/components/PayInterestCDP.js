import React from "react";
import {Loader} from "../utils/utils";

export default class PayInterestCDP extends React.Component{
    constructor(props) {
        super(props);
        this.state = {debt:0, days: 0, allowance:0, needed:0, loader:false, fee:0}
        console.log(this.props.position)
        this.allow=this.allow.bind(this);
        this.payInterest=this.payInterest.bind(this);
    }

    allow(){
        const {contracts} = this.props;
        contracts['stableCoin'].methods.approve(contracts['cdp']._address,this.props.web3.utils.toWei(this.state.needed.toFixed(18).toString())).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false});
                //window.location.reload();
            })
            .on('error', console.error);
    }

    payInterest(){
        this.props.contracts['cdp'].methods.transferInterest(this.props.id).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                //window.location.reload();
            })
            .on('error', console.error);
    }

    componentDidMount() {
        const {contracts} = this.props;
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({needed:this.props.web3.utils.fromWei(fee)*1.2});
            //TODO: set 1.001
        })

        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:this.props.web3.utils.fromWei(fee)});
        })

        contracts['stableCoin'].methods.allowance(this.props.account, contracts['cdp']._address).call().then((allowed)=>{
            this.setState({allowance:this.props.web3.utils.fromWei(allowed)});
        })


    }

    componentDidUpdate() {
        const {contracts} = this.props;
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({needed:this.props.web3.utils.fromWei(fee)*1.001});
        })

        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:this.props.web3.utils.fromWei(fee)});
        })

        contracts['stableCoin'].methods.allowance(this.props.account, contracts['cdp']._address).call().then((allowed)=>{
            this.setState({allowance:this.props.web3.utils.fromWei(allowed)});
        })


    }

    render (){
        return <><div><b>Pay interest for loan #{this.props.id}</b></div>
            <div align='left'>
                <div>TSC minted:         <b>{this.props.web3.utils.fromWei(this.props.position.coinsMinted)} TSC</b></div>
                <div>your allowance to CPD:         <b>{this.state.allowance} TSC</b></div>
                <div>your fee to pay:         <b>{this.state.fee} TSC</b></div>
                <div>you have to allow:         <b>~{this.state.needed} TSC</b></div>
                <a className={"button pointer green left"} onClick={this.allow}>Allow needed amount</a>
                {this.state.allowance>this.state.fee?<a className={"button pointer green right"} onClick={this.payInterest}>Pay Interest</a>:<div className="button address right">
                    {'Insufficient allowance to pay interest'}</div>}
                <br/><br/><br/><br/>
                {this.state.loader?<Loader/>:''}
            </div></>
    }


}
