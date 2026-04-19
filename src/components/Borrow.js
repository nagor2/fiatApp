import React from "react";
import {Loader} from "../utils/utils";
import {cachedContractCall} from "../utils/cachedContractCall";

export default class Borrow extends React.Component{

    constructor(props){
        super(props);
        this.openCDP = this.openCDP.bind(this);
        this.state={loader: false, amount:0, collateral:0, buttonInactive: false, balance:0};
    }

    openCDP(){
        this.props.contracts['cdp'].methods.openCDP(this.props.web3.utils.toWei(this.state.amount.toString(),'ether')).send({from:this.props.account, value: this.props.web3.utils.toWei(this.state.collateral.toString(),'ether')})
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
    }

    async changeProportions(e) {
        if (!Number(e.target.value)||e.target.value<0||e.target.value =='undefined') {
            return;
        }
        if (e.target.name=='amount'){
            const collateralWei = this.props.web3.utils.toWei(this.state.collateral,'ether');
            const result = await cachedContractCall(
                'cdp', 'getMaxFlatCoinsToMint', [collateralWei], this.props.contracts?.['cdp']
            );

            e.target.value<=this.props.web3.utils.fromWei(result,'ether')&&this.state.amount>1&&this.state.collateral<=this.props.web3.utils.fromWei(this.state.balance,'ether')?this.setState({buttonInactive:true}):this.setState({buttonInactive:false});

            if (e.target.value>=1)
                this.setState({amount : e.target.value})
            else
                this.setState({amount : 1.1})
        }
        else {
            this.setState({collateral : e.target.value})
            const collateralWei = this.props.web3.utils.toWei(e.target.value, 'ether');
            const result = await cachedContractCall(
                'cdp', 'getMaxFlatCoinsToMint', [collateralWei], this.props.contracts?.['cdp']
            );

            this.setState({amount : this.props.web3.utils.fromWei(result,'ether')})
            
            (e.target.value<=this.props.web3.utils.fromWei(this.state.balance,'ether')
                &&this.state.amount>=1)?
                this.setState({buttonInactive:true}):this.setState({buttonInactive:false});
        }
        return;
    }

    setMax(){
        const max = this.props.web3.utils.fromWei(this.state.balance,'ether')-0.01;
        this.setState({collateral: max})
        this.changeProportions({target:{name:'collateral', value:max.toString()}});
    }

    render() {
        return <form>
            <div align='center'><b>Borrow DotFlat</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETH collateral you provide: <input type='number' step="0.1" min="0" max="10000" name='collateral' value={this.state.collateral} onChange={e => this.changeProportions(e)}/>
            DotFlat coins you will get <input type='number' min="1.1" name='amount' value={this.state.amount} onChange={e => this.changeProportions(e)}/>
            {this.state.buttonInactive?<a className={"button pointer green right"} onClick={this.openCDP}>Borrow</a>:<div className="button address right">
                {'Insufficient ETH '}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }
}
