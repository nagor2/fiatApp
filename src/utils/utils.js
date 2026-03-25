import React from "react";
import {fromBlock} from "./config";
import {getPastEventsCached} from "./cacheApi";

// Безопасное преобразование BigInt в число
export function toFloat(value) {
    if (typeof value === 'bigint') {
        return parseFloat(value.toString());
    }
    return parseFloat(value);
}

export async function getTransfers(contract, web3) {
    const txs = await getPastEventsCached(
        contract, 
        'Transfer', 
        {fromBlock: fromBlock},
        web3
    );
    return txs;
}

export async function getHolders(contract, web3){
    let txs = await getTransfers(contract, web3);
    let holders = [];

    for (let i = 0; i< txs.length; i++) {
        if(holders.indexOf(txs[i].returnValues['from']) === -1) {
            holders.push(txs[i].returnValues['from']);
        }
        if(holders.indexOf(txs[i].returnValues['to']) === -1) {
            holders.push(txs[i].returnValues['to']);
        }
    }
    return holders;
}

export function dateFromTimestamp(timeStamp){
    const d = new Date(parseFloat(timeStamp) * 1000);
    return ("0" + d.getDate()).slice(-2) + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" +
        d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) +":"+ ("0" + d.getSeconds()).slice(-2);
}

export class Loader extends React.Component{
    render(){
        return <div><img className={'loader abs-centered'} src='/img/loading.png' width={'50'} height={'50'} alt={'loader'}/></div>;
    }
}


export class Address extends React.Component {
    render() {
        return <div className="button address right">
            {this.props.account.slice(0, 6) +
            '...' +this.props.account.slice(-4)}
        </div>;
    }
}

// Объединенная карточка с ценами ETH из разных источников
export class ETHPrice extends React.Component {
    render() {
        const { ethPrice, ethPriceEtherscan, ethPriceUniswap } = this.props;

        const etherscanText = ethPriceEtherscan ? '$' + ethPriceEtherscan.toFixed(2) : 'N/A';
        const uniswapText = ethPriceUniswap ? '$' + ethPriceUniswap.toFixed(2) : 'N/A';

        return (
            <div className="button address left" style={{ 
                fontSize: '13px',
                whiteSpace: 'nowrap'
            }}>
                <strong>ETH</strong> 
                {' '}Etherscan: <strong>{etherscanText}</strong>
                {' '}Uniswap: <strong>{uniswapText}</strong>
                {' '}Contract: <strong>${ethPrice}</strong>
            </div>
        );
    }
}