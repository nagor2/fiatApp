import React from "react";
import {Loader} from "../utils/utils";

export default class WithdrawEtherCDP extends React.Component{

    constructor(props){
        super(props);
        this.state={maxToWithdraw: 0, toWithdraw:0, locked: 0};
    }

    componentDidMount() {
        const locked = this.props.position.wethLocked;

        if (this.props.contracts['cdp'].getMaxStableCoinsToMint != undefined) {
            console.log("this.props.contracts != undefined")

            this.props.contracts['cdp'].getMaxStableCoinsToMint(locked).call().then((maxCoins) => {
                const coinsDifference = maxCoins - this.props.position.coinsMinted;
                this.props.contracts["cdp"].getMaxStableCoinsToMint(this.props.web3.utils.toWei(1, 'ether')).call().then((coinsPerEther) => {
                    const wethToWithdraw = coinsDifference / coinsPerEther;
                    this.setState({maxToWithdraw: wethToWithdraw})
                    this.setState({toWithdraw: wethToWithdraw})
                })
            })
        }
    }


    componentDidUpdate() {
        const locked = this.props.position.wethLocked;

        if (this.props.contracts['cdp'].getMaxStableCoinsToMint != undefined) {
            console.log("this.props.contracts != undefined")

            this.props.contracts['cdp'].getMaxStableCoinsToMint(locked).call().then((maxCoins) => {
                const coinsDifference = maxCoins - this.props.position.coinsMinted;
                this.props.contracts["cdp"].getMaxStableCoinsToMint(this.props.web3.utils.toWei(1, 'ether')).call().then((coinsPerEther) => {
                    const wethToWithdraw = coinsDifference / coinsPerEther;
                    this.setState({maxToWithdraw: wethToWithdraw})
                    this.setState({toWithdraw: wethToWithdraw})
                })
            })
        }
    }

    setMax(){
        console.log(this.state.maxToWithdraw);
        this.setState({toWithdraw: this.state.maxToWithdraw});
    }

    changeToWithdraw(e) {
        if (!Number(e.target.value) || e.target.value > this.state.maxToWithdraw || e.target.value < 0) {
            this.setState({buttonInactive:false})
            return;
        }
        if (e.target.name == 'toWithdraw') {
            if (e.target.value<=this.state.maxToWithdraw){
                this.setState({buttonInactive:true})

            } else this.setState({buttonInactive:false})
        }
    }

    render() {
        return <form>
            <div align='center'><b>WithdrawEtherCDP</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETC to withdraw: <input type='number' step="0.1" min="0" max={this.state.maxToWithdraw} name='toWithdraw' value={this.state.toWithdraw}/>
            {this.state.buttonInactive?<a className={"button pointer green right"} onClick={this.withdraw}>withdraw</a>:<div className="button address right">
                {'wrong ETC amount'}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }

}