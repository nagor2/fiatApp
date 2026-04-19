import React from "react";
import {getHolders, getTransfers, toFloat, formatNumber} from "../utils/utils";
import Button from "./Button";
import {cachedContractCall, cachedEthBalance} from "../utils/cachedContractCall";

export default class DFC extends React.Component{
    constructor(props) {
        super(props);
        this.initCoinsBuyOut = this.initCoinsBuyOut.bind(this);
        this.state = {address:'', supply:'', transfers:'', holders:'', pricePool:'loading...', indicative:'', etherPool:'loading...', tscPool:'loading...', poolTVL: null, collateral:'', collateralPercent:'', stubFund:'', stubFundDemand: '', allowedToAuction:0, loading: true}
    }
    
    async loadData() {
        const {contracts, web3, ethPrice, ethPriceUniswap} = this.props;
        
        if (!contracts || !contracts['flatCoin'] || !contracts['cdp'] || !contracts['dao'] || !contracts['basket'] || !contracts['auction']) {
            console.warn('DFC: contracts not fully initialized yet, waiting...');
            // Не меняем loading state - оставляем "Loading DFC data..."
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 DFC: Starting data load via Block Watcher API...');

            const cdpAddress = contracts['cdp']._address;
            const auctionAddress = contracts['auction']._address;

            const [
                supplyRaw,
                stubRaw,
                stabPercentRaw,
                sharePriceRaw,
                allowanceRaw,
                ethBalance,
            ] = await Promise.all([
                cachedContractCall('flatCoin', 'totalSupply', [], contracts['flatCoin']),
                cachedContractCall('flatCoin', 'balanceOf', [cdpAddress], contracts['flatCoin']),
                cachedContractCall('dao', 'params', ['stabilizationFundPercent'], contracts['dao']),
                cachedContractCall('basket', 'getCurrentSharePriceChange', [], contracts['basket']),
                cachedContractCall('flatCoin', 'allowance', [cdpAddress, auctionAddress], contracts['flatCoin']),
                cachedEthBalance(cdpAddress, web3),
            ]);

            const supply = toFloat(supplyRaw);
            const stub = toFloat(stubRaw);
            const stabilizationFundPercent = toFloat(stabPercentRaw);
            const sharePrice = toFloat(sharePriceRaw);
            const allowedToAuction = toFloat(allowanceRaw);
            
            // Collateral считаем по on-chain цене (oracle) — это единственный
            // ценовой источник, от которого зависит сам CDP контракт.
            // Uniswap/Etherscan оставляем только как last-resort fallback, если
            // oracle ещё не ответил.
            const ethPriceNumeric = parseFloat(ethPrice);
            const effectiveEthPrice = (isFinite(ethPriceNumeric) && ethPriceNumeric > 0)
                ? ethPriceNumeric
                : (ethPriceUniswap || 0);

            console.log('🔍 DFC collateral calculation:');
            console.log('   ethBalance (wei):', ethBalance);
            console.log('   ethBalance (ETH):', toFloat(ethBalance)/10**18);
            console.log('   ethPrice (contract, prop):', ethPrice);
            console.log('   ethPriceUniswap (prop):', ethPriceUniswap);
            console.log('   effectiveEthPrice (used):', effectiveEthPrice);
            console.log('   supply (wei):', supply);
            console.log('   supply (DFC):', supply/10**18);
            console.log('   sharePrice:', sharePrice);
            
            const ethBalanceETH = toFloat(ethBalance)/10**18;
            const collateralNum = ethBalanceETH * effectiveEthPrice;
            const collateral = collateralNum.toFixed(3);
            const supplyDFC = supply/10**18;
            const sharePriceNormalized = sharePrice/10**6;
            const percent = supplyDFC > 0 && sharePriceNormalized > 0
                ? parseFloat(100 * collateralNum / supplyDFC / sharePriceNormalized).toFixed(2)
                : '0.00';
            
            console.log('   collateral (USD):', collateral);
            console.log('   collateralPercent:', percent);

            let pricePoolValue = 'loading...';
            let etherPoolValue = 'loading...';
            let tscPoolValue = 'loading...';
            let poolTVL = null;
            
            console.log(`🔍 DFC: ethPriceUniswap = ${ethPriceUniswap}`);
            
            if (ethPriceUniswap && ethPriceUniswap > 0) {
                let dfcPriceInETH = null;
                
                try {
                    console.log('🔄 DFC: Fetching price from Uniswap...');
                    const { getDfcPriceInEth } = await import('../utils/uniswap-quoter');
                    const dfcPriceResult = await getDfcPriceInEth();
                    console.log('🔍 DFC: dfcPriceResult =', dfcPriceResult);
                    dfcPriceInETH = dfcPriceResult.priceInETH;
                    const dfcPriceUSD = (dfcPriceInETH * ethPriceUniswap).toFixed(4);
                    pricePoolValue = `$${dfcPriceUSD}`;
                    console.log(`✅ DFC price from Uniswap: $${dfcPriceUSD}`);
                } catch (err) {
                    console.error('❌ Failed to get DFC price from Uniswap:', err);
                    pricePoolValue = 'error loading';
                }

                // Get pool liquidity
                try {
                    console.log('🔄 DFC: Fetching pool liquidity...');
                    const { getPoolLiquidityDirect } = await import('../utils/pool-liquidity-direct');
                    const poolInfo = await getPoolLiquidityDirect(ethPriceUniswap);
                    console.log('🔍 DFC: poolInfo =', poolInfo);
                    
                    if (poolInfo.amountETH !== undefined && poolInfo.amountDFC !== undefined) {
                        const ethUSD = poolInfo.amountETH * ethPriceUniswap;
                        const dfcUSD = dfcPriceInETH
                            ? poolInfo.amountDFC * dfcPriceInETH * ethPriceUniswap
                            : null;

                        etherPoolValue = `${formatNumber(poolInfo.amountETH, 4)} ETH ($${formatNumber(ethUSD, 0)})`;
                        tscPoolValue = `${formatNumber(poolInfo.amountDFC, 2)} DFC (${dfcUSD !== null ? '$' + formatNumber(dfcUSD, 0) : '?'})`;
                        poolTVL = poolInfo.tvlUSD > 0 ? poolInfo.tvlUSD : null;
                        
                        console.log(`✅ Pool: ${etherPoolValue}, ${tscPoolValue}, TVL: $${poolTVL}`);
                    } else {
                        etherPoolValue = 'no liquidity';
                        tscPoolValue = 'no liquidity';
                    }
                } catch (err) {
                    console.error('❌ Failed to get pool liquidity:', err);
                    etherPoolValue = 'error loading';
                    tscPoolValue = 'error loading';
                }
            } else {
                console.log('⏳ DFC: Waiting for ETH price from Uniswap...');
                pricePoolValue = 'waiting for ETH price...';
                etherPoolValue = 'waiting for ETH price...';
                tscPoolValue = 'waiting for ETH price...';
            }

            // stubFundDemand — raw wei для кнопки initCoinsBuyOut, но в рендере
            // показываем округлённо до центов.
            const stubFundDemandWei = supply * stabilizationFundPercent / 100 - stub;

            this.setState({
                supply: supply / 10**18,
                stubFund: stub / 10**18,
                stubFundDemand: stubFundDemandWei,
                indicative: sharePrice / 10**6,
                collateral: collateral,
                collateralPercent: percent,
                allowedToAuction: allowedToAuction,
                address: contracts['flatCoin']._address,
                pricePool: pricePoolValue,
                etherPool: etherPoolValue,
                tscPool: tscPoolValue,
                poolTVL: poolTVL,
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
        // Проверяем что все необходимые контракты загрузились
        const prevContractsReady = prevProps.contracts?.flatCoin && prevProps.contracts?.cdp && 
                                   prevProps.contracts?.dao && prevProps.contracts?.basket && 
                                   prevProps.contracts?.auction;
        const currentContractsReady = this.props.contracts?.flatCoin && this.props.contracts?.cdp && 
                                      this.props.contracts?.dao && this.props.contracts?.basket && 
                                      this.props.contracts?.auction;
        
        if (!prevContractsReady && currentContractsReady) {
            console.log('DFC: All contracts initialized, loading data...');
            this.loadData();
        }
        
        // Перезагрузка когда любая цена ETH становится доступной.
        // Отдельно триггерим на появление contract price, т.к. именно по ней
        // считается collateral — если сначала пришёл Uniswap, перерасчёт
        // обязателен когда подтянется oracle.
        const prevAnyEthPrice = prevProps.ethPriceUniswap || prevProps.ethPrice;
        const currentAnyEthPrice = this.props.ethPriceUniswap || this.props.ethPrice;

        if (!prevAnyEthPrice && currentAnyEthPrice && currentContractsReady) {
            console.log('DFC: ETH price available, reloading data...');
            this.loadData();
        } else if (!prevProps.ethPrice && this.props.ethPrice && currentContractsReady) {
            console.log('DFC: Oracle ETH price arrived, recalculating collateral...');
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
                const allowance = await cachedContractCall(
                    'flatCoin',
                    'allowance',
                    [cdpAddress, auctionAddress],
                    this.props.contracts['flatCoin'],
                );
                this.setState({allowedToAuction: toFloat(allowance)});
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

            <div>total supply: <b>{formatNumber(this.state.supply, 2)} DFC</b></div>

            <div>N of transactions (iterate transfers): <b>{formatNumber(this.state.transfers, 0)}</b></div>

            <div>N of holders: <b>{formatNumber(this.state.holders, 0)}</b></div>
            {this.props.account!==''&&this.state.stubFundDemand>0?
                <a className={"small-button pointer green right"} onClick={()=>this.initCoinsBuyOut()}>init auction to top up stubFund</a>: ''
            }

            {this.props.account!==''&&this.state.stubFundDemand<0?
                <a className={"small-button pointer green right"} onClick={()=>this.allowSurplusToAuction()}>allow surplus to auction</a>:''
            }
            <div>price vs USD (pool): <b>{this.state.pricePool}</b></div>

            <div>price vs USD (indicative): <b>{formatNumber(this.state.indicative, 4)}</b></div>

            {this.props.account!==''&&this.state.allowedToAuction>0?<a className={"small-button pointer green right"} onClick={()=>this.initRuleBuyOut()}>init Rule buyOut</a>:''
            }

            <div>ETH in pool: <b>{this.state.etherPool}</b></div>
            <div>DFC in pool: <b>{this.state.tscPool}</b>{this.props.account!==''?<Button emitter={this.props.emitter} action={'Borrow'} name={"Borrow"}/>:''}</div>
            {this.state.poolTVL && (
                <div>TVL in pool: <b>${formatNumber(this.state.poolTVL, 2)}</b></div>
            )}
            <div>overall collateral: <b>${formatNumber(this.state.collateral, 2)} ({formatNumber(this.state.collateralPercent, 2)}% of DFC supply)</b></div>
            <div>stabilization fund: <b>{formatNumber(this.state.stubFund, 2)} DFC</b></div>
            <div>stabilization fund demand: <b>{formatNumber(this.state.stubFundDemand/10**18, 2)} DFC</b></div>
            <div>allowed to auction: <b>{formatNumber(toFloat(this.state.allowedToAuction)/10**18, 2)} DFC</b></div>

            <div>address: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>
    }
}