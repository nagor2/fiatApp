import React from "react";
import {getHolders, getTransfers} from "../utils/utils";
import Button from "./Button";

export default class Tsc extends React.Component{
    constructor(props) {
        super(props);
        this.initCoinsBuyOut = this.initCoinsBuyOut.bind(this);
        this.state = {address:'', supply:'', transfers:'', holders:'', pricePool:'', indicative:'', etherPool:'', tscPool:'', collateral:'', collateralPercent:'', stubFund:'', stubFundDemand: '', allowedToAuction:0}
    }
    componentDidMount() {
        const {contracts} = this.props;

        contracts['stableCoin'].methods.totalSupply().call().then((supply)=>{
            this.setState({supply: (supply/10**18).toFixed(2)});
            contracts['stableCoin'].methods.balanceOf(contracts['cdp']._address).call().then((stub)=>{
                this.setState({stubFund:(stub/10**18).toFixed(8)})

                contracts['dao'].methods.params('stabilizationFundPercent').call().then((stabilizationFundPercent) => {
                    this.setState({stubFundDemand:(supply * stabilizationFundPercent / 100 - stub)});
                });
            });

        });
        getTransfers(contracts['stableCoin']).then((result)=>{this.setState({transfers: result.length})});
        getHolders(contracts['stableCoin']).then((result)=>{this.setState({holders: result.length})});
        contracts['pool'].methods.getReserves().call().then((reserve)=>{
            this.setState({pricePool: (reserve[1]*this.props.etcPrice/reserve[0]).toFixed(4)});
            this.setState({etherPool: (reserve[1]/10**18).toFixed(4)});
            this.setState({tscPool: (reserve[0]/10**18).toFixed(2)});
        });
        this.setState({address: contracts['stableCoin']._address});
        contracts['weth'].methods.balanceOf(contracts['cdp']._address).call().then((cdpWethBalance)=>{
            this.setState({collateral:((cdpWethBalance/10**18).toFixed(3)*this.props.etcPrice).toFixed(3)})
        });
        contracts['cart'].methods.getCurrentSharePrice().call().then((sharePrice)=>{
            this.setState({indicative: (sharePrice/10**6).toFixed(4)});
            contracts['stableCoin'].methods.totalSupply().call().then((supply) => {
                const percent = parseFloat(100*this.state.collateral/this.state.supply/this.state.indicative).toFixed(2);
                this.setState({collateralPercent:percent});
            });
        });

        contracts['stableCoin'].methods.allowance(contracts['cdp']._address, contracts['auction']._address).call().then((allowance)=>{
            this.setState({allowedToAuction: allowance});
        });

    }

    initCoinsBuyOut = ()=>{
        console.log('initCoinsBuyOut')
        this.props.contracts['auction'].methods.initCoinsBuyOutForStabilization(this.state.stubFundDemand.toString()).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                //TODO: route to auction initCoinsBuyOutForStabilization returns uint256 auctionID
                window.location.reload();
            })
            .on('error', console.error);
    }

    initRuleBuyOut = ()=>{
        this.props.contracts['auction'].methods.initRuleBuyOut().send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                //TODO: route to auction initCoinsBuyOutForStabilization returns uint256 auctionID
                window.location.reload();
            })
            .on('error', console.error);
    }

    allowSurplusToAuction(){
        this.props.contracts['cdp'].methods.allowSurplusToAuction().send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['stableCoin'].methods.allowance(this.props.contracts['cdp']._address, this.props.contracts['auction']._address).call().then((allowance)=>{
                    this.setState({allowedToAuction: allowance});
                });
            })
            .on('error', console.error);
    }


    render() {
        return <div align='left'>
            <div align='center'><b>True stable coin</b></div>
            {this.props.account!==''?<Button emitter={this.props.emitter} action={'buyStable'} name={"Buy"}/>:''}

            <div>total supply:         <b>{this.state.supply} TSC</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>
            {this.props.account!==''&&this.state.stubFundDemand>0?
                <a className={"small-button pointer green right"} onClick={()=>this.initCoinsBuyOut()}>init auction to top up stubFund</a>:

                <a className={"small-button pointer green right"} onClick={()=>this.allowSurplusToAuction()}>allow surplus to auction</a>
            }
            <div>price vs USD (pool): <b>{this.state.pricePool}</b></div>

            <div>price vs USD (indicative): <b>{this.state.indicative}</b></div>

            {this.props.account!==''&&this.state.allowedToAuction>0?<a className={"small-button pointer green right"} onClick={()=>this.initRuleBuyOut()}>init Rule buyOut</a>:''
            }

            <div>ETC in pool: <b>{this.state.etherPool}</b></div>
            <div>TSC in pool: <b>{this.state.tscPool}</b>{this.props.account!==''?<Button emitter={this.props.emitter} action={'Borrow'} name={"Borrow"}/>:''}</div>
            <div>overall collateral: <b>{this.state.collateral} USD ({this.state.collateralPercent}% of TSC supply)</b></div>
            <div>stabilization fund: <b>{this.state.stubFund}</b></div>
            <div>stabilization fund demand: <b>{this.state.stubFundDemand/10**18}</b></div>
            <div>allowed to auction: <b>{this.state.allowedToAuction/10**18}</b></div>

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>
        </div>
    }
}