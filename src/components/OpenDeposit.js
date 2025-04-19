import React from "react";
import {Loader} from "../utils/utils";


export default class OpenDeposit extends React.Component{

    constructor(props){
        super(props);
        this.allowStables = this.allowStables.bind(this);
        this.deposit = this.deposit.bind(this);
        this.topUp = this.topUp.bind(this);
        this.state={DFCBalance:0, buttonInactive: false, allowed:0, toAllow:0, coinsDeposited:0};
    }

    allowStables(){

        if (this.state.toAllow<=this.state.DFCBalance && this.props.contracts['deposit'] !== undefined){
            this.props.contracts['flatCoin'].methods.approve(this.props.contracts['deposit']._address,this.props.web3.utils.toWei(this.state.toAllow,'ether')).send({from:this.props.account})
                .on('transactionHash', (hash) => {
                    this.setState({'loader':true})
                })
                .on('receipt', (receipt) => {
                    this.setState({'loader':true})
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    this.setState({'loader':false})
                    this.props.contracts['flatCoin'].methods.allowance(this.props.account, this.props.contracts['deposit']._address).call().then((res)=>{
                        this.setState({allowed:this.props.web3.utils.fromWei(res,'ether')})
                    })
                })
                .on('error', console.error)
                .catch(e=>console.error)
        }
    }

    setMax(){
        this.setState({toAllow: this.state.DFCBalance})
    }

    deposit(){
        this.props.contracts['deposit'].methods.deposit().send({from:this.props.account})
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

    topUp(){
        this.props.contracts['deposit'].methods.topUp(this.props.depositId).send({from:this.props.account})
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

    changeToAllow(e){
        this.setState({toAllow: e.target.value})
    }

    componentDidMount() {
        if (this.props.account)
            this.props.contracts['flatCoin'].methods.balanceOf(this.props.account).call().then((res)=>{
                this.setState({DFCBalance:this.props.web3.utils.fromWei(res,'ether')})
            })

        if (this.props.account)
            this.props.contracts['flatCoin'].methods.allowance(this.props.account, this.props.contracts['deposit']._address).call().then((res)=>{
                this.setState({allowed:this.props.web3.utils.fromWei(res,'ether')})
            })

        if (this.props.depositId !== undefined && this.props.depositId !== '')
            this.props.contracts['deposit'].methods.deposits(this.props.depositId).call().then((deposit)=>{
                this.setState({coinsDeposited:this.props.web3.utils.fromWei(deposit.coinsDeposited,'ether')});
            })
    }

    render(){
        return <div align={'left'}><div align={'center'}><b>{this.props.depositId==undefined || this.props.depositId == ''?'Open':'TopUP'} Deposit {this.props.depositId==undefined || this.props.depositId == ''?'':'('+this.props.depositId+')'}</b></div>
            {(parseFloat(this.state.toAllow)<=this.state.DFCBalance)?<a className={"button pointer green right"} onClick={()=>this.allowStables()}>Allow</a>:<div className="button address right">
                {'not enough DFC'}</div>}

            {this.props.depositId==undefined || this.props.depositId == ''?'':<div>already deposited: {this.state.coinsDeposited}</div>}
            DFC to allow: <input type='number' step="0.1" min="0" max={this.state.DFCBalance} name='amount' value={this.state.toAllow} onChange={e => this.changeToAllow(e)}/>

            <div>Your DFC allowance to deposit contract: {this.state.allowed}</div><br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(this.state.allowed>0)?<a className={"button pointer green right"} onClick={this.props.depositId==undefined|| this.props.depositId == ''?this.deposit:this.topUp}>Deposit {this.props.depositId==undefined|| this.props.depositId == ''?'':' additional'} {this.state.allowed +' DFC'}</a>:<div className="button address right">
                {'you need to allow coins for deposit'}</div>}
            <br></br>
            <br></br>
            <br></br>
            {this.state.loader?<Loader/>:''}
        </div>
    }
}
