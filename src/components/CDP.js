import React from "react";
import Button from "./Button";
import {toFloat} from "../utils/utils";
import {cachedContractCall, cachedEthBalance} from "../utils/cachedContractCall";

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
            console.warn('CDP: contracts not fully initialized yet, waiting...');
            // Не меняем loading state - оставляем пока контракты не загрузятся
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 CDP: Starting data load via Block Watcher API...');

            const cdpAddress = contracts['cdp']._address;
            const auctionAddress = contracts['auction']._address;

            const promises = [
                cachedContractCall('flatCoin', 'balanceOf', [cdpAddress], contracts['flatCoin']),
                cachedContractCall('flatCoin', 'totalSupply', [], contracts['flatCoin']),
                cachedContractCall('dao', 'params', ['stabilizationFundPercent'], contracts['dao']),
                cachedContractCall('rule', 'balanceOf', [cdpAddress], contracts['rule']),
                cachedContractCall('flatCoin', 'allowance', [cdpAddress, auctionAddress], contracts['flatCoin']),
                cachedContractCall('cdp', 'numPositions', [], contracts['cdp']),
                cachedContractCall('dao', 'params', ['collateralDiscount'], contracts['dao']),
                cachedContractCall('dao', 'params', ['interestRate'], contracts['dao']),
                cachedEthBalance(cdpAddress, web3),
            ];

            if (account && account !== '') {
                promises.push(
                    cachedContractCall('flatCoin', 'allowance', [cdpAddress, account], contracts['flatCoin'])
                );
            }

            const results = await Promise.all(promises);

            const stubFund = toFloat(results[0]);
            const totalSupply = toFloat(results[1]);
            const stabFundPercent = toFloat(results[2]);
            const ruleBalanceRaw = results[3];
            const toAuctionRaw = results[4];
            const numPositionsRaw = results[5];
            const collateralDiscountRaw = results[6];
            const interestRateRaw = results[7];
            const ethBalance = results[8];

            const coinsExceed = stubFund - totalSupply * stabFundPercent / 100;
            const numPositions = toFloat(numPositionsRaw);

            // Суммируем интерес по всем позициям параллельно.
            // Позиции индексируются с 1 (новые id выдаются через ++numPositions в openCDP).
            // totalCurrentFee = recorded + unrecorded accrual — то, что позиция "должна" контракту сейчас.
            // positions(i).interestAmountRecorded — закристаллизованная часть долга (снимок на lastTimeUpdated).
            const positionPromises = [];
            for (let i = 1; i <= numPositions; i++) {
                positionPromises.push(Promise.all([
                    cachedContractCall('cdp', 'positions', [i], contracts['cdp']),
                    cachedContractCall('cdp', 'totalCurrentFee', [i], contracts['cdp']),
                ]));
            }
            const positionResults = await Promise.allSettled(positionPromises);

            let feeEarnedSum = 0;
            let feeRecordedSum = 0;
            for (const r of positionResults) {
                if (r.status !== 'fulfilled') continue;
                const [position, currentFee] = r.value;
                feeEarnedSum += Number(toFloat(currentFee)) / 1e18;
                const recorded = position && position.interestAmountRecorded;
                if (recorded !== undefined) {
                    feeRecordedSum += Number(toFloat(recorded)) / 1e18;
                }
            }

            const newState = {
                stubFund: (stubFund/10**18).toFixed(2),
                tscSupply: (totalSupply/10**18).toFixed(4),
                exceed: (coinsExceed/10**18).toFixed(2),
                RuleBalanceOfCDP: (toFloat(ruleBalanceRaw)/10**18).toFixed(2),
                toAuction: (toFloat(toAuctionRaw)/10**18).toFixed(2),
                positionsCount: numPositions,
                dicount: toFloat(collateralDiscountRaw)+'%',
                interestRate: toFloat(interestRateRaw)+'%',
                wethBalance: (toFloat(ethBalance)/10**18).toFixed(2),
                collateral: ((toFloat(ethBalance)/10**18).toFixed(3)*ethPrice).toFixed(3),
                feeEarned: feeEarnedSum.toFixed(4),
                feePayed: feeRecordedSum.toFixed(4),
                address: cdpAddress,
                loading: false
            };

            if (account && account !== '') {
                newState.userAllowence = (toFloat(results[9])/10**18).toFixed(10);
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
        // Проверяем что все необходимые контракты загрузились
        const prevContractsReady = prevProps.contracts?.flatCoin && prevProps.contracts?.cdp && 
                                   prevProps.contracts?.dao && prevProps.contracts?.rule && 
                                   prevProps.contracts?.auction;
        const currentContractsReady = this.props.contracts?.flatCoin && this.props.contracts?.cdp && 
                                      this.props.contracts?.dao && this.props.contracts?.rule && 
                                      this.props.contracts?.auction;
        
        if (!prevContractsReady && currentContractsReady) {
            console.log('CDP: All contracts initialized, loading data...');
            this.loadData();
        }
        
        if (prevProps.account !== this.props.account && currentContractsReady) {
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
            <div>overall fee earned: <b>{this.state.feeEarned} DFC</b>{this.props.account!==''?<Button emitter={this.props.emitter} action={'Borrow'} name={"Open dept position"}/>:''}</div>

            <div>overall fee recorded: <b>{this.state.feePayed} DFC</b></div>
            <div>collateral discount: <b>{this.state.dicount}</b></div>
            <div>interest rate: <b>{this.state.interestRate}</b></div>
            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }
}