import React from "react";
import Button from "./Button";
import {toFloat, formatNumber} from "../utils/utils";
import {cachedContractCall, cachedEthBalance} from "../utils/cachedContractCall";
import {getPastEventsCached} from "../utils/cacheApi";
import {fromBlock} from "../utils/config";

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
            feePaidHistorical: 0,
            feeAccrued: 0,
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
            // Позиции индексируются с 0, до numPositions-1 (posID выдаётся
            // как numPositions++ в openCDP, т.е. пост-инкремент).
            // totalCurrentFee = recorded + unrecorded accrual — то, что
            // позиция "должна" контракту СЕЙЧАС. Это полный outstanding
            // долг, он УЖЕ включает interestAmountRecorded. Складывать их
            // нельзя — будет двойной счёт.
            // totalCurrentFee time-dependent: значение растёт каждый блок,
            // noCache=1 чтобы воркер не отдавал замороженный снимок.
            const positionPromises = [];
            for (let i = 0; i < numPositions; i++) {
                positionPromises.push(Promise.all([
                    cachedContractCall('cdp', 'positions', [i], contracts['cdp'], { noCache: true }),
                    cachedContractCall('cdp', 'totalCurrentFee', [i], contracts['cdp'], { noCache: true }),
                ]));
            }

            // Параллельно тащим исторические переводы DFC с CDP → auction контракт.
            // Это ровно то, что CDP уже "заработал" и отдал в аукцион (реализованный fee).
            // overall fee earned = реализованный (historical transfers CDP→auction)
            //                      + текущий начисленный (totalCurrentFee по активным позициям).
            const auctionLc = (auctionAddress || '').toLowerCase();
            const cdpLc = (cdpAddress || '').toLowerCase();
            const feeTransfersPromise = getPastEventsCached(
                contracts['flatCoin'],
                'Transfer',
                { filter: { from: cdpAddress, to: auctionAddress }, fromBlock, toBlock: 'latest' }
            ).catch((err) => {
                console.warn('CDP: failed to load historical fee transfers:', err);
                return [];
            });

            const [positionResults, feeTransfers] = await Promise.all([
                Promise.allSettled(positionPromises),
                feeTransfersPromise,
            ]);

            let feeAccruedSum = 0;
            let feeRecordedSum = 0;
            for (let idx = 0; idx < positionResults.length; idx++) {
                const r = positionResults[idx];
                if (r.status !== 'fulfilled') {
                    console.warn(`CDP position ${idx + 1} load failed:`, r.reason);
                    continue;
                }
                const [position, currentFee] = r.value;
                // position приходит либо как object с named keys, либо как array —
                // в зависимости от версии воркера и того, развернул ли он Web3 Result.
                // Читаем и по имени, и по индексу (interestAmountRecorded = [2]).
                const recordedRaw =
                    (position && position.interestAmountRecorded !== undefined && position.interestAmountRecorded !== null)
                        ? position.interestAmountRecorded
                        : (position && position[2] !== undefined && position[2] !== null)
                            ? position[2]
                            : undefined;
                const currentFeeNum = Number(toFloat(currentFee)) / 1e18;
                const recordedNum = recordedRaw !== undefined ? Number(toFloat(recordedRaw)) / 1e18 : 0;
                feeAccruedSum += isFinite(currentFeeNum) ? currentFeeNum : 0;
                feeRecordedSum += isFinite(recordedNum) ? recordedNum : 0;
                console.log(
                    `CDP position ${idx + 1}: currentFee=${currentFeeNum} recorded=${recordedNum} recordedRaw=${recordedRaw}`,
                    {positionType: Array.isArray(position) ? 'array' : typeof position, position}
                );
            }

            // Некоторые RPC/воркер игнорируют filter и возвращают все Transfer'ы токена —
            // перепроверяем from/to явно, чтобы не завысить сумму.
            let feePaidHistorical = 0;
            for (const ev of feeTransfers || []) {
                const rv = ev && (ev.returnValues || ev.args || {});
                const from = (rv.from || rv[0] || '').toLowerCase();
                const to = (rv.to || rv[1] || '').toLowerCase();
                if (from !== cdpLc || to !== auctionLc) continue;
                const valueRaw = rv.value !== undefined ? rv.value : rv[2];
                if (valueRaw === undefined) continue;
                feePaidHistorical += Number(toFloat(valueRaw)) / 1e18;
            }
            console.log(
                `CDP fee summary: historical(CDP→auction)=${feePaidHistorical}, accrued(open positions)=${feeAccruedSum}, recorded=${feeRecordedSum}`
            );

            const feeEarnedSum = feePaidHistorical + feeAccruedSum;

            // Храним числа — форматируем в рендере через formatNumber.
            const ethBalanceEth = toFloat(ethBalance) / 10**18;
            const ethPriceNum = parseFloat(ethPrice) || 0;

            const newState = {
                stubFund: stubFund / 10**18,
                tscSupply: totalSupply / 10**18,
                exceed: coinsExceed / 10**18,
                RuleBalanceOfCDP: toFloat(ruleBalanceRaw) / 10**18,
                toAuction: toFloat(toAuctionRaw) / 10**18,
                positionsCount: numPositions,
                dicount: toFloat(collateralDiscountRaw) + '%',
                interestRate: toFloat(interestRateRaw) + '%',
                wethBalance: ethBalanceEth,
                collateral: ethBalanceEth * ethPriceNum,
                feeEarned: feeEarnedSum,
                feePayed: feeRecordedSum,
                feePaidHistorical: feePaidHistorical,
                feeAccrued: feeAccruedSum,
                address: cdpAddress,
                loading: false
            };

            if (account && account !== '') {
                newState.userAllowence = toFloat(results[9]) / 10**18;
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
            <div>stubFund: <b>{formatNumber(this.state.stubFund, 2)} DFC</b></div>
            <div>stubFund exceed: <b>{formatNumber(this.state.exceed, 2)} DFC</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['cdp'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            {this.props.account!==''?<div><input type='button' value='allow surplus to auction' onClick={this.allowSurplusToAuction}/></div>:''}
            <div>allowed to auction: <b>{formatNumber(this.state.toAuction, 2)} DFC</b></div>
            {this.props.account!==''?<div><input type='button' value='initRuleBuyOut' onClick={this.initRuleBuyOut}/></div>:''}

            {this.props.account!==''? <div>your stable coin allowance from CDP: <b>{formatNumber(this.state.userAllowence, 4)} DFC</b></div>:''}
            <div>total coins minted: <b>{formatNumber(this.state.tscSupply, 2)} DFC</b></div>
            <div>ETH balance of contract: <b>{formatNumber(this.state.wethBalance, 2)} ETH (${formatNumber(this.state.collateral, 2)})</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['cdp'].methods.burnRule().send({from:this.props.account})}>burn Rule ({formatNumber(this.state.RuleBalanceOfCDP, 2)}) from CDP</a>}
            <div>positions count: <b>{formatNumber(this.state.positionsCount, 0)}</b></div>
            <div>overall fee earned: <b>{formatNumber(this.state.feeEarned, 2)} DFC</b>
                {' '}<span style={{color:'#888', fontSize:'0.9em'}}>
                    (paid to auction: {formatNumber(this.state.feePaidHistorical, 2)}
                    {' '}+ outstanding: {formatNumber(this.state.feeAccrued, 2)})
                </span>
                {this.props.account!==''?<Button emitter={this.props.emitter} action={'Borrow'} name={"Open dept position"}/>:''}
            </div>

            <div>of which recorded on-chain: <b>{formatNumber(this.state.feePayed, 2)} DFC</b></div>
            <div>collateral discount: <b>{this.state.dicount}</b></div>
            <div>interest rate: <b>{this.state.interestRate}</b></div>
            <div>address: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }
}