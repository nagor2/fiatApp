/* global BigInt */
import React from "react";
import {getHolders, getTransfers, toFloat} from "../utils/utils";
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
                supply: supplyRle.toFixed(2),
                transfers: transfers.length,
                holders: holders.length,
                burned: burnedRle.toFixed(2),
                priceInDfc: priceRleInDfc !== null ? priceRleInDfc.toFixed(4) : NOT_LOADED,
                priceInUsd: rlePriceInUsd !== null ? rlePriceInUsd.toFixed(4) : NOT_LOADED,
                marketCap: marketCap !== null ? marketCap.toFixed(2) : NOT_LOADED,
                poolVolume: poolVolume !== null ? poolVolume.toFixed(2) : NOT_LOADED,
                address: rleAddress,
                loading: false,
            });

            console.log(`RuleToken: total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (err) {
            console.error('Failed to load RuleToken data:', err);
            this.setState({ loading: false });
        }
    }

    renderValue(value, suffix = '') {
        if (value === NOT_LOADED) return <b>N/A</b>;
        return <b>{value}{suffix}</b>;
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading rule token data...</div>;
        }

        return <div align='left'>
            <div align='center'><b>Rule token</b></div>
            <div>total supply: {this.renderValue(this.state.supply, ' RLE')}</div>

            <div>N of transactions (iterate transfers): {this.renderValue(this.state.transfers)}</div>
            <div>N of holders: {this.renderValue(this.state.holders)}</div>
            <div>total burned: {this.renderValue(this.state.burned, ' RLE')}</div>

            <div>price in stableCoins (from pool): {
                this.state.priceInDfc !== NOT_LOADED
                    ? <b>{this.state.priceInDfc} DFC{this.state.priceInUsd !== NOT_LOADED ? ` ($${this.state.priceInUsd})` : ''}</b>
                    : <b>N/A</b>
            }</div>

            <div>marketCap: {
                this.state.marketCap !== NOT_LOADED
                    ? <b>${this.state.marketCap}</b>
                    : <b>N/A</b>
            }</div>

            <div>pool volume (TVL): {
                this.state.poolVolume !== NOT_LOADED
                    ? <b>${this.state.poolVolume}</b>
                    : <b>N/A</b>
            }</div>

            <div>address: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }
}
