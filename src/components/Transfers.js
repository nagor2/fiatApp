import React from "react";
import {fromBlock} from "../utils/config";
import Product from "./Product";
import {dateFromTimestamp, Loader, toFloat} from "../utils/utils";
import {getPastEventsCached} from "../utils/cacheApi";
import {cachedContractCall} from "../utils/cachedContractCall";

export default class Transfers extends React.Component{

    constructor(props) {
        super(props);
        this.state = {txs:[], wethBalance:0}
    }

    // События приходят из воркера (blockTimestamp) либо Etherscan-fallback
    // (timeStamp); normalizeCachedEvent в cacheApi.js приводит к общему
    // `blockTimestamp`. Раньше тут для каждого события дёргался
    // web3.eth.getBlock(blockHash) — но воркер не сохраняет blockHash
    // в индексе, поэтому getBlock(undefined) возвращал latest-block и ВСЕ
    // транзакции показывались с текущим временем. Используем блочный
    // таймстамп из самого события — один запрос к цепи меньше, и корректно.
    async loadTransfers() {
        const {contracts} = this.props;
        this.setState({txs: []});

        const [fromEvents, toEvents] = await Promise.all([
            getPastEventsCached(
                contracts[this.props.contractName],
                'Transfer',
                {filter: { from: this.props.account }, fromBlock},
                this.props.web3,
            ),
            getPastEventsCached(
                contracts[this.props.contractName],
                'Transfer',
                {filter: { to: this.props.account }, fromBlock},
                this.props.web3,
            ),
        ]);
        this.setState({txs: [...fromEvents, ...toEvents]});
    }

    async componentDidMount() {
        await this.loadTransfers();
    }

    async componentDidUpdate(prevProps) {
        if (prevProps.contractName === this.props.contractName
            && prevProps.account === this.props.account) return;
        await this.loadTransfers();
    }

    render(){
        let items = (this.state.txs!==undefined)?this.state.txs.sort((a,b)=>(Number(b.blockNumber) - Number(a.blockNumber))).map(product =>
            <Product emitter={this.props.emitter} contracts={this.props.contracts} account={this.props.account?this.props.account:''} section={'Transfers'} key={product.id} id={product.id}
                     iconType={(product.returnValues.to.toLowerCase() == this.props.account.toLowerCase())? 'in' : 'out'}
                     title={(product.returnValues.to.toLowerCase() == this.props.account.toLowerCase() ? product.returnValues.from : product.returnValues.to)}
                     balance={(toFloat(product.returnValues.value)/10**18).toFixed(2)}
                     name={product.blockTimestamp ? dateFromTimestamp(product.blockTimestamp) : ''}
                     hash={product.transactionHash}
            />):'';
        return <><div className={'flex-col'}><b>Your {this.props.contractName.replace(/\b\w/g, l => l.toUpperCase())} transfers</b><p></p><Paginator items={items} perPage={10}/></div>
            <div><TransferForm web3={this.props.web3} contract={this.props.contracts[this.props.contractName]} account={this.props.account} contractName={this.props.contractName}/></div>
        </>;
    }
}

class Paginator extends React.Component{
    constructor(props) {
        super(props);
        this.state = {page:0}
    }

    Click(e){
        this.setState({page:e.target.attributes.value.value})
        if(e.target.attributes.value.value == 'first') this.setState({page:0})
        if(e.target.attributes.value.value == 'last') this.setState({page:this.props.items.length/this.props.perPage-1})
    }


    render(){
        let lastPage = this.props.items.length/this.props.perPage -1;
        lastPage = lastPage<0?0:lastPage;

        let page = (this.state.page>lastPage)?lastPage:this.state.page;

        let toShow = this.props.items.slice(this.props.perPage*page, this.props.perPage*page + this.props.perPage);
        let pages = [];
        if (this.props.items.length>=this.props.perPage) pages.push(<span className={'pointer'} key={'first'} onClick={e => this.Click(e)} value='first'>{' <'}</span>)
        for (let i=1; i<lastPage; i++){
            pages.push(<span className={'pointer'} onClick={e => this.Click(e)} key={i} value={i}> {i}</span>)
        }
        if (this.props.items.length>=this.props.perPage) pages.push(<span className={'pointer'} key={'last'} onClick={e => this.Click(e)} value='last'>{' >'}</span>)

        return <>{toShow}<div>

            {pages}

        </div></>
    }

}

class TransferForm extends React.Component{

    constructor(props) {
        super(props);
        this.state = {loader:false, balance:0, amount:0, address:'0x0'}
    }

    async componentDidMount() {
        const balance = await cachedContractCall(
            this.props.contractName, 'balanceOf', [this.props.account], this.props.contract
        );
        this.setState({balance});
    }

    transfer(){
        this.props.contract.methods.transfer(this.state.address, this.props.web3.utils.toWei((this.state.amount/10**18).toString())).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                //TODO:

            })
            .on('error', console.error);
    }

    inputChange(e){
        this.setState({amount:e.target.value*10**18})
    }

    render(){

        return <>
            address: <input type='text' name='address' value={this.state.address} onChange={e => this.setState({address:e.target.value})}/>
            amount to transfer: <input type='number' step="0.1" min="0" name='amount' value={this.state.amount/10**18} onChange={e => this.inputChange(e)}/>

            {this.state.loader?<Loader/>:''}

            <br/>
            <a className="small-button green right pointer" onClick={()=>this.transfer()}>transfer</a>
            <br/><br/></>


    }
}

