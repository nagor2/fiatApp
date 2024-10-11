import React from "react";
import {Loader} from "../utils/utils";

export default class WithdrawEtherCDP extends React.Component{

    constructor(props){
        super(props);
        this.withdraw = this.withdraw.bind(this);
        this.state={maxToWithdraw: 0, toWithdraw:0, locked: 0};
    }

    componentDidMount() {
        const { contracts } = this.props;
        const locked = this.props.position.ethAmountLocked;
        this.setState({locked:locked});
        contracts['cdp'].methods.getMaxStableCoinsToMint(locked.toString()).call().then((maxCoins) => {

            const coinsDifference = maxCoins - this.props.position.coinsMinted;
            this.props.contracts["cdp"].methods.getMaxStableCoinsToMint(this.props.web3.utils.toWei('1', 'ether')).call().then((coinsPerEther) => {
                const ethToWithdraw = coinsDifference / coinsPerEther;
                this.setState({maxToWithdraw: ethToWithdraw})
                this.setState({toWithdraw: ethToWithdraw})
                this.setState({buttonIsActive:true})
            })
        })
    }

    setMax(){
        this.setState({toWithdraw: this.state.maxToWithdraw});
    }

    changeToWithdraw(e) {
        if (!Number(e.target.value) || e.target.value > this.state.maxToWithdraw || e.target.value < 0) {
            this.setState({buttonIsActive:false})
            return;
        }
        if (e.target.name == 'toWithdraw') {
            if (e.target.value<=this.state.maxToWithdraw){
                this.setState({buttonIsActive:true})
                this.setState({toWithdraw:e.target.value})

            } else this.setState({buttonIsActive:false})
        }
    }
    withdraw(){
        const { contracts } = this.props;
        contracts['cdp'].methods.withdrawEther(this.props.id, this.props.web3.utils.toWei(this.state.toWithdraw.toString())).send({from:this.props.account})
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
        return <form>
            <div align='center'><b>WithdrawEtherCDP</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETC to withdraw: <input type='number' step="0.1" min="0" max={this.state.maxToWithdraw} name='toWithdraw' value={this.state.toWithdraw} onChange={e => this.changeToWithdraw(e)}/>
            {this.state.buttonIsActive?<a className={"button pointer green right"} onClick={this.withdraw}>withdraw</a>:<div className="button address right">
                {'wrong ETH amount'}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }

}