import React from "react";
import {Loader} from "../utils/utils";

export default class Borrow extends React.Component{

    constructor(props){
        super(props);
        this.openCDP = this.openCDP.bind(this);
        this.state={loader: false, amount:0, collateral:0, buttonInactive: false, balance:0};
    }

    openCDP(){
        this.props.contracts['cdp'].methods.openCDP(this.props.web3.utils.toWei(this.state.amount.toString())).send({from:this.props.account, value: this.props.web3.utils.toWei(this.state.collateral.toString())})
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

    componentDidMount() {
        this.props.web3.eth.getBalance(this.props.account).then((result)=> {
            this.setState({balance: result});
        })
    }

    changeProportions(e) {
        if (!Number(e.target.value)||e.target.value>10000000||e.target.value<0) {
            return;
        }
        if (e.target.name=='amount'){
            this.props.contracts['cdp'].methods.getMaxFlatCoinsToMint(this.props.web3.utils.toWei(this.state.collateral)).call().then((result)=>{
                (e.target.value<(result/10**18)&&this.state.amount>1&&this.state.collateral<this.state.balance/10**18)?this.setState({buttonInactive:true}):this.setState({buttonInactive:false});
            });

            if (e.target.value>=1)
                this.setState({amount : e.target.value})
            else
                this.setState({amount : 1.1})
        }
        else {
            this.props.contracts['cdp'].methods.getMaxFlatCoinsToMint(this.props.web3.utils.toWei(e.target.value)).call().then((result)=>{
                this.setState({amount : this.props.web3.utils.fromWei(result)})
            });
            (e.target.value<(this.state.balance/10**18)&&this.state.amount>=1)?this.setState({buttonInactive:true}):this.setState({buttonInactive:false});

            this.setState({collateral : e.target.value})
        }
        return;
    }

    setMax(){
        const max = this.state.balance/10**18-0.01;
        this.setState({collateral: max})
        this.changeProportions({target:{name:'collateral', value:max.toString()}});
    }

    render() {
        return <form>
            <div align='center'><b>Borrow stablecoins</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETC collateral you provide: <input type='number' step="0.1" min="0" max="10000" name='collateral' value={this.state.collateral} onChange={e => this.changeProportions(e)}/>
            stable coins you'll get <input type='number' min="1.1" name='amount' value={this.state.amount} onChange={e => this.changeProportions(e)}/>
            {this.state.buttonInactive?<a className={"button pointer green right"} onClick={this.openCDP}>Borrow</a>:<div className="button address right">
                {'Insufficient ETC '}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }
}
