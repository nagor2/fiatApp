import React from "react";
import {Loader} from "../utils/utils";

export default class CloseCDP extends React.Component{

    constructor(props){
        super(props);
        this.allowStables = this.allowStables.bind(this);
        this.close = this.close.bind(this);
        this.state={tscBalance:0, buttonInactive: false, allowed:0, toAllow:0, coinsDeposited:0};
    }

    componentDidMount() {
        if (this.props.account)
            this.props.contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((res)=>{
                this.setState({tscBalance:(res/10**18)})
            })

        if (this.props.account)
            this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['cdp']._address).call().then((res)=>{
                this.setState({allowed:(res/10**18)})
            })

        if (this.props.contracts !== 'undefined'){
            this.props.contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
                const minted = parseFloat(this.props.web3.utils.fromWei(this.props.position.coinsMinted));
                const feeNeeded = 1.2*parseFloat(this.props.web3.utils.fromWei(fee));
                const needed = minted+feeNeeded;
                console.log(typeof (feeNeeded))
                console.log(typeof (minted))

                this.setState({toAllow:needed});
                this.setState({needed:needed});
                //TODO: set 1.001
            })
        }

    }


    allowStables(){
        if (this.state.toAllow<=this.state.tscBalance && this.props.contracts['cdp'] !== undefined){
            this.props.contracts['stableCoin'].methods.approve(this.props.contracts['cdp']._address,this.props.web3.utils.toWei(this.state.toAllow.toString())).send({from:this.props.account})
                .on('transactionHash', (hash) => {
                    this.setState({'loader':true})
                })
                .on('receipt', (receipt) => {
                    this.setState({'loader':true})
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    this.setState({'loader':false})
                    this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['cdp']._address).call().then((res)=>{
                        this.setState({allowed:(res/10**18)})
                    })
                })
                .on('error', console.error);
        }
    }

    changeToAllow(e){
        this.setState({toAllow: e.target.value})
    }

    setMax(){
        this.setState({toAllow: this.state.tscBalance})
    }


    close(){
        this.props.contracts['cdp'].methods.closeCDP(this.props.id).send({from:this.props.account})
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

    render(){
        return <div align={'left'}><div align={'center'}><b>Close CDP {this.props.id==undefined || this.props.id == ''?'':'(id: '+this.props.id+')'}</b></div>
            {(parseFloat(this.state.toAllow)<=this.state.tscBalance)?<a className={"button pointer green right"} onClick={()=>this.allowStables()}>Allow</a>:<div className="button address right">
                {'not enough TSC'}</div>}

            TSC to allow: <input type='number' step="0.1" min="0" max={this.state.tscBalance} name='amount' value={this.state.toAllow} onChange={e => this.changeToAllow(e)}/>

            <div>Your TSC allowance to CDP contract: {this.state.allowed}</div><br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(this.state.allowed>0)?<a className={"button pointer green right"} onClick={this.close}>Confirm closure</a>:<div className="button address right">
                {'you need to allow '+this.state.needed+' TSC to close this position'}</div>}
            <br></br>
            <br></br>
            <br></br>
            {this.state.loader?<Loader/>:''}
        </div>
    }
}