import React from "react";
import {Loader} from "../utils/utils";

export default class UpdateCDP extends React.Component{
    constructor(props){
        super(props);
        this.updateCDP = this.updateCDP.bind(this);
        this.state={loader: false, maxCoins:0, amount:this.props.position.coinsMinted/10**18, collateral:this.props.position.ethAmountLocked/10**18, buttonIsActive: false, balance:0};
    }

    updateCDP(){
        //console.log(this.state.collateral*10**18-this.props.position.wethAmountLocked);
        this.props.contracts['cdp'].methods.updateCDP(this.props.id, this.props.web3.utils.toWei(this.state.amount.toString())).send({from:this.props.account, value: this.state.collateral*10**18-this.props.position.ethAmountLocked})
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

        this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(this.props.position.ethAmountLocked).call().then((result)=>{
            this.setState({maxCoins : this.props.web3.utils.fromWei(result)})
        });


    }

    changeProportions(e) {
        if (!Number(e.target.value)||e.target.value>10000000||e.target.value<0) {
            return;
        }
        if (e.target.name=='amount'){
            this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(this.props.web3.utils.toWei(this.state.collateral.toString())).call().then((result)=>{
                this.setState({maxCoins : this.props.web3.utils.fromWei(result)});
                (e.target.value<(result/10**18)&&this.state.amount>1&&this.state.collateral<(this.state.balance+this.props.position.ethAmountLocked)/10**18)?this.setState({buttonIsActive:true}):this.setState({buttonIsActive:false});
            });

            if (e.target.value>=1)
                this.setState({amount : e.target.value})
            else
                this.setState({amount : 1.1})
        }
        else {
            this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(this.props.web3.utils.toWei(e.target.value)).call().then((result)=>{
                this.setState({maxCoins : this.props.web3.utils.fromWei(result)})
                this.setState({amount : this.props.web3.utils.fromWei(result)})
            });

            (e.target.value<(parseFloat(this.props.web3.utils.fromWei(this.props.position.ethAmountLocked))+this.state.balance/10**18)&&this.state.amount>1)?this.setState({buttonIsActive:true}):this.setState({buttonIsActive:false});

            this.setState({collateral : e.target.value})
        }
        return;
    }

    setMax(){
        const max = this.props.position.ethAmountLocked/10**18 + this.state.balance/10**18-0.01;
        this.setState({collateral: max})
        this.changeProportions({target:{name:'collateral', value:max.toString()}});
    }

    render() {
        return <form>
            <div align='center'><b>Update debt position</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETC collateral you provide: <input type='number' step="0.1" min={parseFloat(this.props.web3.utils.fromWei(this.props.position.ethAmountLocked))} max="10000" name='collateral' value={this.state.collateral} onChange={e => this.changeProportions(e)}/>
            stable coins you'll get <input type='number' min="1.1" name='amount' value={this.state.amount} onChange={e => this.changeProportions(e)}/>
            <br/>max coins you can mint: {this.state.maxCoins}
            {this.state.buttonIsActive?<a className={"button pointer green right"} onClick={this.updateCDP}>Update</a>:<div className="button address right">
                {'Insufficient ETC '}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }
}

