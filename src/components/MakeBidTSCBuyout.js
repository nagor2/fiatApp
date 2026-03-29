import React from "react";
import {Loader, toFloat} from "../utils/utils";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class MakeBidTSCBuyout extends React.Component{

    constructor(props){
        super(props);
        this.allowStables = this.allowStables.bind(this);
        this.makebid = this.makebid.bind(this);
        this.state={tscBalance:0, buttonInactive: false, allowed:0, toAllow:0, coinsDeposited:0};
    }

    async componentDidMount() {
        if (this.props.account) {
            const balanceRes = await fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/balanceOf?args=["${this.props.account}"]`);
            const balanceData = await balanceRes.json();
            this.setState({tscBalance:(balanceData.result/10**18)});
        }

        if (this.props.account) {
            const cdpAddress = this.props.contracts['cdp']._address;
            const allowanceRes = await fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/allowance?args=["${this.props.account}","${cdpAddress}"]`);
            const allowanceData = await allowanceRes.json();
            this.setState({allowed:(allowanceData.result/10**18)});
        }

        if (this.props.contracts !== 'undefined'){
            const feeRes = await fetch(`${BLOCK_WATCHER_API}/api/call/cdp/totalCurrentFee?args=[${this.props.id}]`);
            const feeData = await feeRes.json();
            const fee = feeData.result;
            
            const minted = toFloat(this.props.web3.utils.fromWei(this.props.position.coinsMinted));
            const feeNeeded = 1.2*toFloat(this.props.web3.utils.fromWei(fee));
            const needed = minted+feeNeeded;
            console.log(typeof (feeNeeded))
            console.log(typeof (minted))

            this.setState({toAllow:needed});
            this.setState({needed:needed});
        }
    }

    allowStables(){
        if (this.state.toAllow<=this.state.tscBalance && this.props.contracts['cdp'] !== undefined){
            this.props.contracts['flatCoin'].methods.approve(this.props.contracts['cdp']._address,this.props.web3.utils.toWei(this.state.toAllow.toString())).send({from:this.props.account})
                .on('transactionHash', (hash) => {
                    this.setState({'loader':true})
                })
                .on('receipt', (receipt) => {
                    this.setState({'loader':true})
                })
                .on('confirmation', async (confirmationNumber, receipt) => {
                    this.setState({'loader':false})
                    const cdpAddress = this.props.contracts['cdp']._address;
                    const allowanceRes = await fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/allowance?args=["${this.props.account}","${cdpAddress}"]`);
                    const allowanceData = await allowanceRes.json();
                    this.setState({allowed:(allowanceData.result/10**18)});
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

    makebid(){
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
                {'not enough DFC'}</div>}

            DFC to allow: <input type='number' step="0.1" min="0" max={this.state.tscBalance} name='amount' value={this.state.toAllow} onChange={e => this.changeToAllow(e)}/>
            Your bid (Rule tokens you'll recieve): <input type='number' step="0.1" min="0" max={this.state.tscBalance} name='amount' value={this.state.toAllow} onChange={e => this.changeToAllow(e)}/>

            <div>Your DFC allowance to Auction contract: {this.state.allowed}</div><br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(this.state.allowed>0)?<a className={"button pointer green right"} onClick={this.close}>Make a bid</a>:<div className="button address right">
                {'you need to allow '+this.state.needed+' DFC'}</div>}
            <br></br>
            <br></br>
            <br></br>
            {this.state.loader?<Loader/>:''}
        </div>
    }
}