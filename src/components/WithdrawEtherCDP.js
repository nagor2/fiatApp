import React from "react";
import {Loader} from "../utils/utils";
/* global BigInt */

export default class WithdrawEtherCDP extends React.Component{

    constructor(props){
        super(props);
        this.withdraw = this.withdraw.bind(this);
        this.state={maxToWithdraw: 0, toWithdraw:0};
    }

    componentDidMount() {
        const { contracts } = this.props;

        contracts['cdp'].methods.getMaxFlatCoinsToMintForPos(this.props.id).call().then((maxCoins) => {
            const coinsDifference = maxCoins - this.props.position.coinsMinted;
            this.props.contracts["cdp"].methods.getMaxFlatCoinsToMint(this.props.web3.utils.toWei('0.000001', 'ether')).call().then((coinsPerEther) => {
                console.log(coinsDifference)
                console.log(coinsPerEther)

                const ethToWithdraw = parseFloat(coinsDifference)/ 1000000 /parseFloat(coinsPerEther) - 0.001;

                console.log(ethToWithdraw)
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
        if (e.target.name === 'toWithdraw') {
            if (e.target.value<=this.state.maxToWithdraw){
                this.setState({buttonIsActive:true})
                this.setState({toWithdraw:e.target.value})

            } else this.setState({buttonIsActive:false})
        }
    }
    withdraw(){
        const { contracts } = this.props;
        contracts['cdp'].methods.withdrawEther(this.props.id, this.props.web3.utils.toWei(this.state.toWithdraw.toString(),'ether')).send({from:this.props.account})
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

    render() {
        return <form>
            <div align='center'><b>WithdrawEtherCDP</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETH to withdraw: <input type='number' step="0.1" min="0" max={this.state.maxToWithdraw} name='toWithdraw' value={this.state.toWithdraw} onChange={e => this.changeToWithdraw(e)}/>
            {this.state.buttonIsActive?<a className={"button pointer green right"} onClick={this.withdraw}>withdraw</a>:<div className="button address right">
                {'wrong ETH amount'}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }

}