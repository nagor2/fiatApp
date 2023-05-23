import React from "react";

class Transfers extends React.Component{

    constructor(props) {
        super(props);
        this.state = {txs:[]}
    }

    componentDidMount() {
        const {contracts} = this.props;
        let txs = [];
        this.setState({txs:txs})
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { from: this.props.account }, fromBlock: 17000000}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.localWeb3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { to: this.props.account }, fromBlock: 17000000}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.localWeb3.eth.getBlock(res[i].blockHash).then((b)=>{
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
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { from: this.props.account }, fromBlock: 17000000}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.localWeb3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { to: this.props.account }, fromBlock: 17000000}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.localWeb3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
    }

    render(){
        let items = (this.state.txs!==undefined)?this.state.txs.sort((a,b)=>(b.blockNumber - a.blockNumber)).map(product =>
            <Product contracts={this.props.contracts} account={this.props.account?this.props.account:''} section={'Transfers'} key={product.id} id={product.id}
                     iconType={(product.returnValues.to.toLowerCase() == this.props.account.toLowerCase())? 'in' : 'out'}
                     title={(product.returnValues.to.toLowerCase() == this.props.account.toLowerCase() ? product.returnValues.from : product.returnValues.to)}
                     balance={(product.returnValues.value/10**18).toFixed(2)}
                     name={product.block==undefined?'':dateFromTimestamp(product.block.timestamp)}
                     hash={product.transactionHash}
            />):'';
        return <><div className={'flex-col'}><b>Your {this.props.contractName.replace(/\b\w/g, l => l.toUpperCase())} transfers</b><p></p><Paginator items={items} perPage={10}/></div>
        </>;
    }
}

export default Transfers;