import React from "react";
import {getHolders, getTransfers, toFloat} from "../utils/utils";
import Button from "./Button";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class DFC extends React.Component{
    constructor(props) {
        super(props);
        this.initCoinsBuyOut = this.initCoinsBuyOut.bind(this);
        this.state = {address:'', supply:'', transfers:'', holders:'', pricePool:'loading...', indicative:'', etherPool:'coming soon', tscPool:'coming soon', collateral:'', collateralPercent:'', stubFund:'', stubFundDemand: '', allowedToAuction:0, loading: true}
    }
    
    async loadData() {
        const {contracts, web3, ethPrice, ethPriceUniswap} = this.props;
        
        if (!contracts || !contracts['flatCoin'] || !contracts['cdp'] || !contracts['dao'] || !contracts['basket']) {
            console.warn('DFC: contracts not fully initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 DFC: Starting data load via Block Watcher API...');

            const cdpAddress = contracts['cdp']._address;
            const auctionAddress = contracts['auction']._address;

            const [supplyRes, stubRes, stabPercentRes, sharePriceRes, allowanceRes] = await Promise.all([
                fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/totalSupply`),
                fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/balanceOf?args=["${cdpAddress}"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["stabilizationFundPercent"]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/basket/getCurrentSharePriceChange`),
                fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/allowance?args=["${cdpAddress}","${auctionAddress}"]`)
            ]);

            const [supplyData, stubData, stabPercentData, sharePriceData, allowanceData] = await Promise.all([
                supplyRes.json(),
                stubRes.json(),
                stabPercentRes.json(),
                sharePriceRes.json(),
                allowanceRes.json()
            ]);

            const supply = toFloat(supplyData.result);
            const stub = toFloat(stubData.result);
            const stabilizationFundPercent = toFloat(stabPercentData.result);
            const sharePrice = toFloat(sharePriceData.result);
            const allowedToAuction = toFloat(allowanceData.result);

            const ethBalanceRes = await fetch(`${BLOCK_WATCHER_API}/api/eth/getBalance?address=${cdpAddress}`);
            const ethBalanceData = await ethBalanceRes.json();
            const ethBalance = ethBalanceData.result;
            
            const collateral = ((toFloat(ethBalance)/10**18).toFixed(3)*ethPrice).toFixed(3);
            const percent = parseFloat(100*collateral/(supply/10**18)/(sharePrice/10**6)).toFixed(2);

            let pricePoolValue = 'loading...';
            
            console.log(`🔍 DFC: ethPriceUniswap = ${ethPriceUniswap}`);
            
            if (ethPriceUniswap && ethPriceUniswap > 0) {
                try {
                    console.log('🔄 DFC: Fetching price from Uniswap...');
                    const { getDfcPriceInEth } = await import('../utils/uniswap-quoter');
                    const dfcPriceResult = await getDfcPriceInEth();
                    console.log('🔍 DFC: dfcPriceResult =', dfcPriceResult);
                    const dfcPriceUSD = (dfcPriceResult.priceInETH * ethPriceUniswap).toFixed(4);
                    pricePoolValue = `$${dfcPriceUSD}`;
                    console.log(`✅ DFC price from Uniswap: $${dfcPriceUSD}`);
                } catch (err) {
                    console.error('❌ Failed to get DFC price from Uniswap:', err);
                    pricePoolValue = 'error loading';
                }
            } else {
                console.log('⏳ DFC: Waiting for ETH price from Uniswap...');
                pricePoolValue = 'waiting for ETH price...';
            }

            this.setState({
                supply: (supply/10**18).toFixed(2),
                stubFund: (stub/10**18).toFixed(8),
                stubFundDemand: (supply * stabilizationFundPercent / 100 - stub),
                indicative: (sharePrice/10**6).toFixed(4),
                collateral: collateral,
                collateralPercent: percent,
                allowedToAuction: allowedToAuction,
                address: contracts['flatCoin']._address,
                pricePool: pricePoolValue,
                loading: false
            });

            const [transfers, holders] = await Promise.all([
                getTransfers(contracts['flatCoin'], web3),
                getHolders(contracts['flatCoin'], web3)
            ]);

            this.setState({
                transfers: transfers.length,
                holders: holders.length
            });

            console.log(`✅ DFC: Total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('❌ DFC: Failed to load data:', error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.flatCoin && this.props.contracts?.flatCoin) {
            console.log('DFC: Contracts initialized, loading data...');
            this.loadData();
        }
        
        if (!prevProps.ethPriceUniswap && this.props.ethPriceUniswap && this.props.contracts?.flatCoin) {
            console.log('DFC: ETH price from Uniswap available, reloading data...');
            this.loadData();
        }
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
            .on('confirmation', async (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                const cdpAddress = this.props.contracts['cdp']._address;
                const auctionAddress = this.props.contracts['auction']._address;
                const allowanceRes = await fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/allowance?args=["${cdpAddress}","${auctionAddress}"]`);
                const allowanceData = await allowanceRes.json();
                this.setState({allowedToAuction: toFloat(allowanceData.result)});
            })
            .on('error', console.error);
    }


    render() {
        if (this.state.loading) {
            return <div align='center'>Loading DFC data...</div>;
        }

        return <div align='left'>
            <div align='center'><b>Dotflat coin</b></div>
            {this.props.account!==''?<Button emitter={this.props.emitter} action={'Dotflat/ETH swap'} name={"Buy"}/>:''}

            <div>total supply:         <b>{this.state.supply} DFC</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>
            {this.props.account!==''&&this.state.stubFundDemand>0?
                <a className={"small-button pointer green right"} onClick={()=>this.initCoinsBuyOut()}>init auction to top up stubFund</a>: ''
            }

            {this.props.account!==''&&this.state.stubFundDemand<0?
                <a className={"small-button pointer green right"} onClick={()=>this.allowSurplusToAuction()}>allow surplus to auction</a>:''
            }
            <div>price vs USD (pool): <b>{this.state.pricePool}</b></div>

            <div>price vs USD (indicative): <b>{this.state.indicative}</b></div>

            {this.props.account!==''&&this.state.allowedToAuction>0?<a className={"small-button pointer green right"} onClick={()=>this.initRuleBuyOut()}>init Rule buyOut</a>:''
            }

            <div>ETH in pool: <b>{this.state.etherPool}</b></div>
            <div>DFC in pool: <b>{this.state.tscPool}</b>{this.props.account!==''?<Button emitter={this.props.emitter} action={'Borrow'} name={"Borrow"}/>:''}</div>
            <div>overall collateral: <b>{this.state.collateral} USD ({this.state.collateralPercent}% of DFC supply)</b></div>
            <div>stabilization fund: <b>{this.state.stubFund}</b></div>
            <div>stabilization fund demand: <b>{this.state.stubFundDemand/10**18}</b></div>
            <div>allowed to auction: <b>{toFloat(this.state.allowedToAuction)/10**18}</b></div>

            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>
    }
}