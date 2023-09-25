import React from "react";
import {Loader} from "../utils/utils";

export default class WithDrawDeposit extends React.Component{

    constructor(props){
        super(props);
        this.withdraw = this.withdraw.bind(this);

        this.state={toWithdraw:0, coinsDeposited:0};
    }

    setMax(){
        this.setState({toWithdraw: this.state.coinsDeposited})
    }

    withdraw(){
        this.props.contracts['deposit'].methods.withdraw(this.props.depositId,this.props.web3.utils.toWei(this.state.toWithdraw)).send({from:this.props.account})
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

    changeToWithdraw(e){
        this.setState({toWithdraw: e.target.value})
    }

    componentDidMount() {
        this.props.contracts['deposit'].methods.deposits(this.props.depositId).call().then((deposit)=>{
            this.setState({coinsDeposited:(deposit.coinsDeposited/10**18).toFixed(2)});
        })
    }

    render(){
        return <div align={'left'}><div align={'center'}><b>Withdraw from deposit {this.props.depositId==undefined?'':'('+this.props.depositId+')'}</b></div>
            {this.props.depositId==undefined?'':<div>already deposited: {this.state.coinsDeposited}</div>}
            Amount to withdraw: <input type='number' step="0.1" min="0" max={this.state.coinsDeposited} name='amount' value={this.state.toWithdraw} onChange={e => this.changeToWithdraw(e)}/>
            <br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(parseFloat(this.state.toWithdraw)<=this.state.coinsDeposited)?
                <a className={"button pointer green right"} onClick={this.withdraw}>Withdraw {this.state.toWithdraw +' TSC'}</a>:<div className="button address right">

                    {'not enough TSC on deposit'}</div>}
            <br></br>
            <br></br>
            <br></br>
            {this.state.loader?<Loader/>:''}
        </div>
    }
}