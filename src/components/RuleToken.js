/* global BigInt */
import React from "react";
import {getHolders, getTransfers, toFloat, formatNumber} from "../utils/utils";
import {cachedContractCall} from "../utils/cachedContractCall";
import {getDfcPriceInEth, getRleDfcPoolInfo} from "../utils/uniswap-quoter";

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Null-sentinel для состояния, чтобы в render различать
// "ещё не загружено" и "загружено и получилось 0".
const NOT_LOADED = null;

export default class RuleToken extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            address: '',
            supply: NOT_LOADED,
            transfers: NOT_LOADED,
            holders: NOT_LOADED,
            burned: NOT_LOADED,
            priceInDfc: NOT_LOADED,
            priceInUsd: NOT_LOADED,
            marketCap: NOT_LOADED,
            poolVolume: NOT_LOADED,
            loading: true,
        };
    }

    componentDidMount() {
        this.loadContractData();
    }

    componentDidUpdate(prevProps) {
        // Если ETH/USD цена подъехала позже (асинхронная Uniswap котировка) —
        // пересчитываем marketCap / pool volume / RLE price in USD,
        // чтобы не показывать "N/A".
        if (!prevProps.ethPriceUniswap && this.props.ethPriceUniswap) {
            this.loadContractData();
        }
    }

    async loadContractData() {
        if (!this.props.contract || !this.props.contract.methods) {
            console.warn('RuleToken: contract is not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('RuleToken: loading data via Block Watcher API...');

            const supplyRaw = await cachedContractCall(
                'rule', 'totalSupply', [], this.props.contract
            );
            const supplyRle = toFloat(supplyRaw) / 1e18;

            const [transfers, holders] = await Promise.all([
                getTransfers(this.props.contract, this.props.web3),
                getHolders(this.props.contract, this.props.web3),
            ]);

            // Сумма всех Transfer → 0x0 = сколько RLE сожжено за всю историю.
            let burnedWei = BigInt(0);
            for (const tx of transfers) {
                const to = (tx.returnValues?.to || '').toLowerCase();
                if (to !== ZERO_ADDRESS) continue;
                const value = tx.returnValues?.value ?? tx.returnValues?.['2'];
                if (value === undefined || value === null) continue;
                try {
                    burnedWei += BigInt(value.toString());
                } catch {
                    // Пропускаем кривые значения (не должно случаться,
                    // но на всякий случай не валим весь расчёт).
                }
            }
            const burnedRle = Number(burnedWei) / 1e18;

            const rleAddress = this.props.contract._address;

            const [poolInfoResult, dfcEthResult] = await Promise.allSettled([
                getRleDfcPoolInfo(rleAddress),
                getDfcPriceInEth(),
            ]);

            let priceRleInDfc = null;
            let amountRle = 0;
            let amountDfc = 0;
            if (poolInfoResult.status === 'fulfilled') {
                priceRleInDfc = poolInfoResult.value.priceRleInDfc;
                amountRle = poolInfoResult.value.amountRle;
                amountDfc = poolInfoResult.value.amountDfc;
            } else {
                console.warn('RuleToken: DFC/RLE pool quote failed:', poolInfoResult.reason?.message);
            }

            let dfcPriceInEth = null;
            if (dfcEthResult.status === 'fulfilled') {
                dfcPriceInEth = dfcEthResult.value.priceInETH;
            } else {
                console.warn('RuleToken: DFC/ETH quote failed:', dfcEthResult.reason?.message);
            }

            const ethPriceUsd = this.props.ethPriceUniswap || 0;
            const dfcPriceInUsd = (dfcPriceInEth && ethPriceUsd)
                ? dfcPriceInEth * ethPriceUsd
                : null;
            const rlePriceInUsd = (priceRleInDfc && dfcPriceInUsd)
                ? priceRleInDfc * dfcPriceInUsd
                : null;

            const marketCap = (rlePriceInUsd && supplyRle)
                ? supplyRle * rlePriceInUsd
                : null;

            // Объём пула в USD = обе стороны пула в долларах по текущей цене.
            const poolVolume = (rlePriceInUsd && dfcPriceInUsd)
                ? amountRle * rlePriceInUsd + amountDfc * dfcPriceInUsd
                : null;

            this.setState({
                supply: supplyRle,
                transfers: transfers.length,
                holders: holders.length,
                burned: burnedRle,
                priceInDfc: priceRleInDfc,
                priceInUsd: rlePriceInUsd,
                marketCap: marketCap,
                poolVolume: poolVolume,
                address: rleAddress,
                loading: false,
            });

            console.log(`RuleToken: total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (err) {
            console.error('Failed to load RuleToken data:', err);
            this.setState({ loading: false });
        }
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading rule token data...</div>;
        }

        const priceInDfc = this.state.priceInDfc;
        const priceInUsd = this.state.priceInUsd;

        return <div align='left'>
            <div align='center'><b>Rule token</b></div>
            <div>total supply: <b>{formatNumber(this.state.supply, 2)} RLE</b></div>

            <div>N of transactions (iterate transfers): <b>{formatNumber(this.state.transfers, 0)}</b></div>
            <div>N of holders: <b>{formatNumber(this.state.holders, 0)}</b></div>
            <div>total burned: <b>{formatNumber(this.state.burned, 2)} RLE</b></div>

            <div>price in stableCoins (from pool): {
                priceInDfc !== NOT_LOADED
                    ? <b>{formatNumber(priceInDfc, 4)} DFC{priceInUsd !== NOT_LOADED ? ` ($${formatNumber(priceInUsd, 4)})` : ''}</b>
                    : <b>N/A</b>
            }</div>

            <div>marketCap: {
                this.state.marketCap !== NOT_LOADED
                    ? <b>${formatNumber(this.state.marketCap, 2)}</b>
                    : <b>N/A</b>
            }</div>

            <div>pool volume (TVL): {
                this.state.poolVolume !== NOT_LOADED
                    ? <b>${formatNumber(this.state.poolVolume, 2)}</b>
                    : <b>N/A</b>
            }</div>

            <div>address: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }
}
