import React from "react";
import {Loader} from "../utils/utils";

export default class UpdateCDP extends React.Component{
    constructor(props){
        super(props);
        this.updateCDP = this.updateCDP.bind(this);
        this.state={loader: false, maxCoins:0, amount:this.props.web3.utils.fromWei(this.props.position.coinsMinted,'ether'),
            collateral:this.props.web3.utils.fromWei(this.props.position.ethAmountLocked,'ether'), buttonIsActive: false, balance:0};
    }

    updateCDP(){
        //console.log(this.state.collateral*10**18-this.props.position.wethAmountLocked);
        this.props.contracts['cdp'].methods.updateCDP(this.props.id, this.props.web3.utils.toWei(this.state.amount.toString())).send({from:this.props.account, value: this.props.web3.utils.toWei(this.state.collateral,'ether')-this.props.position.ethAmountLocked})
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

    componentDidMount() {
        this.props.web3.eth.getBalance(this.props.account).then((result)=> {
            this.setState({balance: result});
        })

        this.props.contracts['cdp'].methods.getMaxFlatCoinsToMintForPos(this.props.id).call().then((result)=>{
            this.setState({maxCoins : this.props.web3.utils.fromWei(result,'ether')})
        });


    }

    changeProportions(e) {
        if (!Number(e.target.value)||e.target.value>10000000||e.target.value<0) {
            return;
        }
        if (e.target.name=='amount'){
            this.props.contracts['cdp'].methods.getMaxFlatCoinsToMint(this.props.web3.utils.toWei(this.state.collateral,'ether')).call().then((result)=>{
                this.setState({maxCoins : this.props.web3.utils.fromWei(result,'ether')});
                (e.target.value<=this.state.maxCoins&&this.state.amount>=1&&this.state.collateral<=this.props.web3.utils.fromWei(this.props.position.ethAmountLocked+this.state.balance,'ether'))?this.setState({buttonIsActive:true}):this.setState({buttonIsActive:false});
            });

            if (e.target.value>=1)
                this.setState({amount : e.target.value})
            else
                this.setState({amount : 1.1})
        }
        else {
            this.props.contracts['cdp'].methods.getMaxFlatCoinsToMint(this.props.web3.utils.toWei(e.target.value,'ether')).call().then((result)=>{
                this.setState({maxCoins : this.props.web3.utils.fromWei(result,'ether')})
                this.setState({amount : this.props.web3.utils.fromWei(result, 'ether')})
            });

            (e.target.value<=(this.props.web3.utils.fromWei(this.props.position.ethAmountLocked+this.state.balance,'ether'))&&this.state.amount>1)?this.setState({buttonIsActive:true}):this.setState({buttonIsActive:false});

            this.setState({collateral : e.target.value})
        }
        return;
    }

    setMax(){
        const max = this.props.web3.utils.fromWei(this.props.position.ethAmountLocked + this.state.balance,'ether');
        this.setState({collateral: max})
        this.changeProportions({target:{name:'collateral', value:max}});
    }

    render() {
        return <form>
            <div align='center'><b>Update debt position</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETH collateral you provide: <input type='number' step="0.1" min={this.props.web3.utils.fromWei(this.props.position.ethAmountLocked,'ether')} max="10000" name='collateral' value={this.state.collateral} onChange={e => this.changeProportions(e)}/>
            stable coins you'll get <input type='number' min="1.1" name='amount' value={this.state.amount} onChange={e => this.changeProportions(e)}/>
            <br/>max coins you can mint: {this.state.maxCoins}
            {this.state.buttonIsActive?<a className={"button pointer green right"} onClick={this.updateCDP}>Update</a>:<div className="button address right">
                {'Insufficient ETH '}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }
}

