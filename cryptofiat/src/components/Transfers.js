import React from "react";
import {fromBlock} from "../utils/config";
import Product from "./Product";
import {dateFromTimestamp, Loader} from "../utils/utils";

export default class Transfers extends React.Component{

    constructor(props) {
        super(props);
        this.state = {txs:[], wethBalance:0}
    }

    componentDidMount() {

        if (this.props.contractName=="weth"){
            this.props.contracts['weth'].methods.balanceOf(this.props.account).call().then((result)=>{
                this.setState({wethBalance:result})
            })
        }

        const {contracts} = this.props;
        let txs = [];
        this.setState({txs:txs})
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { from: this.props.account }, fromBlock: fromBlock}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.web3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { to: this.props.account }, fromBlock: fromBlock}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.web3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
    }

    componentDidUpdate(nextProps, nextContext) {
        if (nextProps.contractName==this.props.contractName) return;
        const {contracts} = this.props;
        let txs = [];
        this.setState({txs:txs})
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { from: this.props.account }, fromBlock: fromBlock}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.web3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { to: this.props.account }, fromBlock: fromBlock}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.web3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
    }

    convertWeth(){
        this.props.contracts['weth'].methods.withdraw(this.state.wethBalance).send({from:this.props.account})
    }

    render(){
        let items = (this.state.txs!==undefined)?this.state.txs.sort((a,b)=>(b.blockNumber - a.blockNumber)).map(product =>
            <Product emitter={this.props.emitter} contracts={this.props.contracts} account={this.props.account?this.props.account:''} section={'Transfers'} key={product.id} id={product.id}
                     iconType={(product.returnValues.to.toLowerCase() == this.props.account.toLowerCase())? 'in' : 'out'}
                     title={(product.returnValues.to.toLowerCase() == this.props.account.toLowerCase() ? product.returnValues.from : product.returnValues.to)}
                     balance={(product.returnValues.value/10**18).toFixed(2)}
                     name={product.block==undefined?'':dateFromTimestamp(product.block.timestamp)}
                     hash={product.transactionHash}
            />):'';
        return <><div className={'flex-col'}>{(this.props.contractName=="weth"&&this.state.wethBalance>0)?<a className={"button pointer green right"} onClick={()=>this.convertWeth()}>convert to ETC</a>:''}<b>Your {this.props.contractName.replace(/\b\w/g, l => l.toUpperCase())} transfers</b><p></p><Paginator items={items} perPage={10}/></div>
            <div><TransferForm web3={this.props.web3} contract={this.props.contracts[this.props.contractName]} account={this.props.account}/></div>
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

    componentDidMount() {
        this.props.contract.methods.balanceOf(this.props.account).call().then((balance)=>{
            this.setState({balance:balance});
        })

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

