import React from "react";
import {Loader} from "../utils/utils";

export default class PayInterestCDP extends React.Component{
    constructor(props) {
        super(props);
        this.state = {debt:0, days: 0, allowance:0, needed:0, loader:false, fee:0}
        //console.log(this.props.position)
        this.allow=this.allow.bind(this);
        this.payInterest=this.payInterest.bind(this);
    }

    allow(){
        const {contracts} = this.props;
        contracts['flatCoin'].methods.approve(contracts['cdp']._address,(parseFloat(this.state.needed)*10**18)
            .toString()).send({from:this.props.account})
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
            this.setState({needed:parseFloat(fee)/10**18*1.001});
            //TODO: set 1.001
        })

        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:parseFloat(fee)/10**18});
        })

        contracts['flatCoin'].methods.allowance(this.props.account, contracts['cdp']._address).call().then((allowed)=>{
            this.setState({allowance:parseFloat(allowed)/10**18});
        })


    }

    componentDidUpdate() {
        const {contracts} = this.props;
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({needed:parseFloat(fee)/10**18*1.001});
        })

        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:parseFloat(fee)/10**18});
        })

        contracts['flatCoin'].methods.allowance(this.props.account, contracts['cdp']._address).call().then((allowed)=>{
            this.setState({allowance:parseFloat(allowed)/10**18});
        })


    }

    render (){
        return <><div><b>Pay interest for loan #{this.props.id}</b></div>
            <div align='left'>
                <div>DFC minted:         <b>{parseFloat(this.props.position.coinsMinted)/10**18} DFC</b></div>
                <div>your allowance to CPD:         <b>{this.state.allowance} DFC</b></div>
                <div>your fee to pay:         <b>{this.state.fee} DFC</b></div>
                <div>you have to allow:         <b>~{this.state.needed} DFC</b></div>
                <a className={"button pointer green left"} onClick={this.allow}>Allow needed amount</a>
                {this.state.allowance>this.state.fee?<a className={"button pointer green right"} onClick={this.payInterest}>Pay Interest</a>:<div className="button address right">
                    {'Insufficient allowance to pay interest'}</div>}
                <br/><br/><br/><br/>
                {this.state.loader?<Loader/>:''}
            </div></>
    }


}
