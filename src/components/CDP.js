import React from "react";
import Button from "./Button";
import {toFloat} from "../utils/utils";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class CDP extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'',
            stubFund:'',
            exceed:'',
            toAuction:'',
            wethBalance:'',
            positionsCount:'',
            feeEarned:'',
            feePayed:'',
            dicount:'',
            userAllowence:'',
            interestRate:'',
            tscSupply:'',
            collateral:'',
            RuleBalanceOfCDP:0,
            loading: true
        }
        this.allowSurplusToAuction = this.allowSurplusToAuction.bind(this);
        this.initRuleBuyOut = this.initRuleBuyOut.bind(this);
    }

    async loadData() {
        const { contracts, account, web3, ethPrice } = this.props;
        
        if (!contracts || !contracts['flatCoin'] || !contracts['cdp'] || !contracts['dao'] || !contracts['rule'] || !contracts['auction']) {
            console.warn('CDP: contracts not fully initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 CDP: Starting data load via Block Watcher API...');

            const cdpAddress = contracts['cdp']._address;
            const auctionAddress = contracts['auction']._address;

            const promises = [
                fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/balanceOf?args=["${cdpAddress}"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/totalSupply`),
                fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["stabilizationFundPercent"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/rule/balanceOf?args=["${cdpAddress}"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/allowance?args=["${cdpAddress}","${auctionAddress}"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/cdp/numPositions`),
                fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["collateralDiscount"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["interestRate"]`),
                fetch(`${BLOCK_WATCHER_API}/api/eth/getBalance?address=${cdpAddress}`)
            ];

            if (account && account !== '') {
                promises.push(
                    fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/allowance?args=["${cdpAddress}","${account}"]`)
                );
            }

            const results = await Promise.all(promises);
            
            const stubFundData = await results[0].json();
            const totalSupplyData = await results[1].json();
            const stabFundPercentData = await results[2].json();
            const ruleBalanceData = await results[3].json();
            const toAuctionData = await results[4].json();
            const numPositionsData = await results[5].json();
            const collateralDiscountData = await results[6].json();
            const interestRateData = await results[7].json();
            const ethBalanceData = await results[8].json();
            const ethBalance = ethBalanceData.result;

            const stubFund = toFloat(stubFundData.result);
            const totalSupply = toFloat(totalSupplyData.result);
            const stabFundPercent = toFloat(stabFundPercentData.result);
            const coinsExceed = stubFund - totalSupply * stabFundPercent / 100;

            const newState = {
                stubFund: (stubFund/10**18).toFixed(2),
                tscSupply: (totalSupply/10**18).toFixed(4),
                exceed: (coinsExceed/10**18).toFixed(2),
                RuleBalanceOfCDP: (toFloat(ruleBalanceData.result)/10**18).toFixed(2),
                toAuction: (toFloat(toAuctionData.result)/10**18).toFixed(2),
                positionsCount: toFloat(numPositionsData.result),
                dicount: toFloat(collateralDiscountData.result)+'%',
                interestRate: toFloat(interestRateData.result)+'%',
                wethBalance: (toFloat(ethBalance)/10**18).toFixed(2),
                collateral: ((toFloat(ethBalance)/10**18).toFixed(3)*ethPrice).toFixed(3),
                address: cdpAddress,
                loading: false
            };

            if (account && account !== '') {
                const userAllowanceData = await results[9].json();
                newState.userAllowence = (toFloat(userAllowanceData.result)/10**18).toFixed(10);
            }

            this.setState(newState);

            console.log(`✅ CDP: Total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('❌ CDP: Failed to load data:', error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.cdp && this.props.contracts?.cdp) {
            console.log('CDP: Contracts initialized, loading data...');
            this.loadData();
        }
        
        if (prevProps.account !== this.props.account) {
            console.log('CDP: Account changed, reloading data...');
            this.loadData();
        }
    }

    allowSurplusToAuction(){
        const { contracts } = this.props;
        contracts['cdp'].methods.allowSurplusToAuction().send({from:this.state.account}).then((result)=>{
            window.location.reload();
        });
    }

    initRuleBuyOut(){
        const { contracts } = this.props;
        contracts['auction'].methods.initRuleBuyOut().send({from:this.state.account}).then(function (result) {
            window.location.reload();
        });
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading CDP data...</div>;
        }

        return  <div align='left'>
            <div align='center'><b>CDP</b></div>
            <div>stubFund: <b>{this.state.stubFund} DFC</b></div>
            <div>stubFund exceed: <b>{this.state.exceed} DFC</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['cdp'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            {this.props.account!==''?<div><input type='button' value='allow surplus to auction' onClick={this.allowSurplusToAuction}/></div>:''}
            <div>allowed to auction: <b>{this.state.toAuction} DFC</b></div>
            {this.props.account!==''?<div><input type='button' value='initRuleBuyOut' onClick={this.initRuleBuyOut}/></div>:''}

            {this.props.account!==''? <div>your stable coin allowance from CDP: <b>{this.state.userAllowence} DFC</b></div>:''}
            <div>total coins minted: <b>{this.state.tscSupply} DFC</b></div>
            <div>ETH balance of contract: <b>{this.state.wethBalance} ({this.state.collateral} USD)</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['cdp'].methods.burnRule().send({from:this.props.account})}>burn Rule ({this.state.RuleBalanceOfCDP}) from CDP</a>}
            <div>positions count: <b>{this.state.positionsCount}</b></div>
            <div>overall fee earned: <b>{this.state.feeEarned}</b>{this.props.account!==''?<Button emitter={this.props.emitter} action={'Borrow'} name={"Open dept position"}/>:''}</div>

            <div>overall fee payed: <b>{this.state.feePayed}</b></div>
            <div>collateral discount: <b>{this.state.dicount}</b></div>
            <div>interest rate: <b>{this.state.interestRate}</b></div>
            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }
}