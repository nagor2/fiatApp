import './App.css';
import {dateFromTimestamp, Loader, Address, ETC} from './utils/utils.js'
import config,{fromBlock}  from './utils/config'
import ConnectButton from './components/ConnectButton'
import Commodity from './components/Commodity'
import Swap from './components/Swap'
import ImproveBid from './components/ImproveBid'
import Auction from './components/Auction'
import Button from "./components/Button";
import CDP from "./components/CDP";
import DebtPosition from "./components/DebtPosition"
import DAO from "./components/DAO";
import Deposit from "./components/Deposit";
import DepositContract from "./components/DepositContract";
import WithDrawDeposit from "./components/WithDrawDeposit";
import Product from "./components/Product";
import OpenDeposit from "./components/OpenDeposit";
import Borrow from "./components/Borrow";
import CloseCDP from "./components/CloseCDP";
import PayInterestCDP from "./components/PayInterestCDP";
import Transfers from "./components/Transfers";


import React, { useState, Component } from 'react';
import Web3 from 'web3'
var events = require('events');
let eventEmitter = new events.EventEmitter();

let localWeb3 = config.localWeb3;

class MyPanel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            open: false,
            itemsCount:'',
            products:this.props.products,
            contracts:''
        };

        this.renderSwitch = this.renderSwitch.bind(this);
        this.renderContent = this.renderContent.bind(this);
        this.toggleChildMenu = this.toggleChildMenu.bind(this);
        this.getItems = this.getItems.bind(this);
        this.getCommodities = this.getCommodities.bind(this);
        this.getLoans = this.getLoans.bind(this);
        this.getAuctions = this.getAuctions.bind(this);
    }

    componentDidMount() {
        this.renderSwitch();
        this.getItems(this.props.content.title);
    }


    componentWillReceiveProps () {
        this.renderSwitch();
        this.getItems(this.props.content.title);
    }

    toggleChildMenu() {
        this.setState(state => ({
            open: !state.open,
            content:{section:'', title:''}
        }));
    }

    renderSwitch(){
        if (this.props.displayContent) {
            eventEmitter.on('change-state',  (state) =>{
                this.setState({content: state});
            });
        }
    }

    renderContent(content){
        if (content){
            if (content[0]=='Commodities'){
                return <Commodity contracts={this.props.contracts} title={content[1]} id={content[2]}/>;
            }

            if (content[0]=='Transfers'){
                return <Transaction tx={content[3]}/>;
            }
            if (content[0]=='Auctions'){
                return <Auction web3={localWeb3} emitter={eventEmitter} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>;
            }

            switch (content[1]){
                case 'RLE':return (content[0]=='Balances')?<Transfers web3={localWeb3} emitter={eventEmitter} contractName={'rule'} account={this.props.account} contracts={this.props.contracts}/>:<RuleToken contract={this.props.contracts['rule']} name={content}/>; break;
                case 'TSC': return (content[0]=='Balances')?<Transfers  web3={localWeb3} emitter={eventEmitter} contractName={'stableCoin'} account={this.props.account} contracts={this.props.contracts}/>: <Tsc account={this.props.account} contracts={this.props.contracts} name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'buyStable':return <Swap name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'WETH':return <Transfers web3={localWeb3} emitter={eventEmitter} contractName={'weth'} account={this.props.account} contracts={this.props.contracts}/>; break;
                case 'Borrow': return <Borrow web3={localWeb3} contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'updateCDP': return <UpdateCDP position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'CDP': return <CDP emitter={eventEmitter} contracts={this.props.contracts} account={this.props.account}  etcPrice={this.props.etcPrice}/>; break;
                case 'debt position': return <DebtPosition emitter={eventEmitter} web3={localWeb3} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'deposit': return <Deposit web3={localWeb3} emitter={eventEmitter} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'Deposit': return <DepositContract contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'openDeposit': return <OpenDeposit web3={localWeb3} contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'withdrawFromDeposit': return <WithDrawDeposit web3={localWeb3} contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'payInterest': return <PayInterestCDP web3={localWeb3} position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'closeCDP': return <CloseCDP web3={localWeb3} position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'makeBidTSCBuyout': return <MakeBidTSCBuyout auction={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'withdrawEther': return <WithdrawEtherCDP position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'INTDAO': return <DAO web3={localWeb3} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'improveBid': return <ImproveBid contracts={this.props.contracts} account={this.props.account} bid={content[0]} id={content[2]}/>; break;
                default: return content;break;
            }
        }
    }

    getCommodities(){
        const{contracts} = this.props;
        let prod = [];
        if (contracts['cart']!==undefined)
            contracts['cart'].methods.itemsCount().call().then((result) => {
                this.setState({itemsCount: result});
                for (let i = 0; i < result; i++) {
                    contracts['cart'].methods.items(i).call().then((result) => {
                        contracts['cart'].methods.getPrice(result['symbol']).call().then((price) => {
                            prod.push({
                                title: result['symbol'],
                                name: 'initial price: ' + parseFloat((result['initialPrice'] / 10 ** 6).toFixed(5)),
                                id: i,
                                balance: parseFloat((price / 10 ** 6).toFixed(5)),
                                iconType: 'crude'
                            });
                        });
                    });
                }
                this.setState({products: prod})
            });

    }

    getAuctions(past){
        const{contracts} = this.props;
        let products=[];
        if (contracts['auction']!==undefined)
            contracts['auction'].getPastEvents('buyOutInit', {
                fromBlock: fromBlock
                ,toBlock: 'latest'
            }).then((events) => {
                //console.dir (events);
                for (let i = 0; i < events.length; i++) {
                    let event = events[i];
                    let id = event.returnValues.auctionID;
                    contracts['auction'].methods.auctions(id).call().then((auction) => {
                        if (auction.finalized == past) {
                            let title='Liquidate collateral';
                            let balance = 0;
                            if (auction.lotToken == contracts['rule']._address){
                                title = 'TSC buyout';
                                balance = (auction.paymentAmount / 10 ** 18).toFixed(2);
                            }
                            if (auction.lotToken == contracts['stableCoin']._address){
                                title = 'Rule buyout';
                                balance =  (auction.lotAmount / 10 ** 18).toFixed(2);
                            }
                            products.push({
                                iconType: 'auction',
                                title: title,
                                id: id,
                                name: dateFromTimestamp(auction.initialized),
                                balance: balance
                            })
                        }
                    });

                }
                this.setState({products: products});
            });

    }

    getLoans(){
        const{contracts} = this.props;
        let products=[];
        if (contracts['cdp']!==undefined)
            contracts['cdp'].getPastEvents('PositionOpened', {
                fromBlock: fromBlock
                ,toBlock: 'latest'
            }).then((events) => {
                for (let i = 0; i < events.length; i++) {
                    let event = events[i];
                    if (event.returnValues.owner.toLowerCase() == this.props.account.toLowerCase()) {
                        let id = event.returnValues.posID;
                        contracts['cdp'].methods.positions(id).call().then((position) => {
                            if (!position.liquidated)
                                products.push({
                                    iconType: 'loan',
                                    title: 'debt position',
                                    id: id,
                                    name: dateFromTimestamp(position.timeOpened),
                                    balance: (position.coinsMinted / 10 ** 18).toFixed(2)
                                })
                        });
                    }
                }
                this.setState({products: products});
            });

    }

    getDeposits(){
        const{contracts} = this.props;
        let products=[];
        if (contracts['deposit']!==undefined)
            contracts['deposit'].getPastEvents('DepositOpened', {fromBlock: fromBlock,toBlock: 'latest'}).then((events)=>{
                for (let i =0; i<events.length; i++) {
                    let event = events[i];
                    if (event.returnValues.owner.toLowerCase()==this.props.account.toLowerCase()){
                        let id = event.returnValues.id;
                        contracts['deposit'].methods.deposits(id).call().then((deposit)=> {
                            if (!deposit.closed)
                                products.push({
                                    iconType: 'deposit',
                                    title: 'deposit',
                                    id: id,
                                    name: dateFromTimestamp(deposit.timeOpened),
                                    balance: (deposit.coinsDeposited/10**18).toFixed(2)
                                })
                        });
                    }
                }
                this.setState({products:products});
            });

    }

    getItems(title) {
        switch (title){
            case 'Commodities': this.getCommodities();break;
            case 'Loans': this.getLoans();break;
            case 'Deposits': this.getDeposits();break;
            case 'Auctions': this.getAuctions(false);break;
            default: break;
        }
    }

    render() {
        let items = this.state.products?this.state.products.sort((a,b)=>(a.id-b.id)).map(product =><Product web3={localWeb3} emitter={eventEmitter} contracts={this.props.contracts} section={this.props.content.title} account={this.props.account?this.props.account:''} key={product.id} id={product.id} iconType={product.iconType} title={product.title} balance={product.balance} name = {product.name}/>):'';
        return <div className="panel xs_12" style={{backgroundColor:this.props.bgColor}}>
            {this.props.content.expander?
                <div className="expander" onClick={this.toggleChildMenu}>
                    <div className="bt-tile__title pointer">{this.props.content.title}{this.state.itemsCount==''?'':' ('+this.state.itemsCount+')'}&nbsp;
                        <svg className={(this.state.open ? 'rotate-180' : 'rotate-0')} xmlns="http://www.w3.org/2000/svg" width="20"
                             height="20" viewBox="0 0 20 20">
                            <g fill="none" fillRule="evenodd" transform="translate(-446 -398)">
                                <path fill="currentColor" fillRule="nonzero"
                                      d="M95.8838835,240.366117 C95.3957281,239.877961 94.6042719,239.877961 94.1161165,240.366117 C93.6279612,240.854272 93.6279612,241.645728 94.1161165,242.133883 L98.6161165,246.633883 C99.1042719,247.122039 99.8957281,247.122039 100.383883,246.633883 L104.883883,242.133883 C105.372039,241.645728 105.372039,240.854272 104.883883,240.366117 C104.395728,239.877961 103.604272,239.877961 103.116117,240.366117 L99.5,243.982233 L95.8838835,240.366117 Z"
                                      transform="translate(356.5 164.5)"></path>
                                <polygon points="446 418 466 418 466 398 446 398"></polygon>
                            </g>
                        </svg>
                    </div>
                    {this.props.content.plus?<Plus action={this.props.content.add}/>:''}
                </div>:''}
            <div>
                <div className={"collapsed" + (this.state.open ? ' in' : '')}>
                    {this.props.content.expander?items:''}
                </div>

                {this.props.displayContent?this.renderContent(this.state.content):''}

            </div>
        </div>
    }
}

class MakeBidTSCBuyout extends React.Component{

    constructor(props){
        super(props);
        this.allowStables = this.allowStables.bind(this);
        this.makebid = this.makebid.bind(this);
        this.state={tscBalance:0, buttonInactive: false, allowed:0, toAllow:0, coinsDeposited:0};
    }

    componentDidMount() {
        if (this.props.account)
            this.props.contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((res)=>{
                this.setState({tscBalance:(res/10**18)})
            })

        if (this.props.account)
            this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['cdp']._address).call().then((res)=>{
                this.setState({allowed:(res/10**18)})
            })

        if (this.props.contracts !== 'undefined'){
            this.props.contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
                const minted = parseFloat(localWeb3.utils.fromWei(this.props.position.coinsMinted));
                const feeNeeded = 1.2*parseFloat(localWeb3.utils.fromWei(fee));
                const needed = minted+feeNeeded;
                console.log(typeof (feeNeeded))
                console.log(typeof (minted))

                this.setState({toAllow:needed});
                this.setState({needed:needed});
                //TODO: set 1.001
            })
        }

    }

    allowStables(){
        if (this.state.toAllow<=this.state.tscBalance && this.props.contracts['cdp'] !== undefined){
            this.props.contracts['stableCoin'].methods.approve(this.props.contracts['cdp']._address,localWeb3.utils.toWei(this.state.toAllow.toString())).send({from:this.props.account})
                .on('transactionHash', (hash) => {
                    this.setState({'loader':true})
                })
                .on('receipt', (receipt) => {
                    this.setState({'loader':true})
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    this.setState({'loader':false})
                    this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['cdp']._address).call().then((res)=>{
                        this.setState({allowed:(res/10**18)})
                    })
                })
                .on('error', console.error);
        }
    }

    changeToAllow(e){
        this.setState({toAllow: e.target.value})
    }

    setMax(){
        this.setState({toAllow: this.state.tscBalance})
    }

    makebid(){
        this.props.contracts['cdp'].methods.closeCDP(this.props.id).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                window.location.reload();
            })
            .on('error', console.error);
    }

    render(){
        return <div align={'left'}><div align={'center'}><b>Close CDP {this.props.id==undefined || this.props.id == ''?'':'(id: '+this.props.id+')'}</b></div>
            {(parseFloat(this.state.toAllow)<=this.state.tscBalance)?<a className={"button pointer green right"} onClick={()=>this.allowStables()}>Allow</a>:<div className="button address right">
                {'not enough TSC'}</div>}

            TSC to allow: <input type='number' step="0.1" min="0" max={this.state.tscBalance} name='amount' value={this.state.toAllow} onChange={e => this.changeToAllow(e)}/>
            Your bid (Rule tokens you'll recieve): <input type='number' step="0.1" min="0" max={this.state.tscBalance} name='amount' value={this.state.toAllow} onChange={e => this.changeToAllow(e)}/>

            <div>Your TSC allowance to Auction contract: {this.state.allowed}</div><br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(this.state.allowed>0)?<a className={"button pointer green right"} onClick={this.close}>Make a bid</a>:<div className="button address right">
                {'you need to allow '+this.state.needed+' TSC to close this position'}</div>}
            <br></br>
            <br></br>
            <br></br>
            {this.state.loader?<Loader/>:''}
        </div>
    }
}

class WithdrawEtherCDP extends React.Component{

    constructor(props){
        super(props);
        this.state={maxToWithdraw: 0, toWithdraw:0, locked: 0};
    }

    componentDidMount() {
        const locked = this.props.position.wethLocked;

        if (this.props.contracts['cdp'].getMaxStableCoinsToMint != undefined) {
            console.log("this.props.contracts != undefined")

            this.props.contracts['cdp'].getMaxStableCoinsToMint(locked).call().then((maxCoins) => {
                const coinsDifference = maxCoins - this.props.position.coinsMinted;
                this.props.contracts["cdp"].getMaxStableCoinsToMint(localWeb3.utils.toWei(1, 'ether')).call().then((coinsPerEther) => {
                    const wethToWithdraw = coinsDifference / coinsPerEther;
                    this.setState({maxToWithdraw: wethToWithdraw})
                    this.setState({toWithdraw: wethToWithdraw})
                })
            })
        }
    }


    componentDidUpdate() {
        const locked = this.props.position.wethLocked;

        if (this.props.contracts['cdp'].getMaxStableCoinsToMint != undefined) {
            console.log("this.props.contracts != undefined")

            this.props.contracts['cdp'].getMaxStableCoinsToMint(locked).call().then((maxCoins) => {
                const coinsDifference = maxCoins - this.props.position.coinsMinted;
                this.props.contracts["cdp"].getMaxStableCoinsToMint(localWeb3.utils.toWei(1, 'ether')).call().then((coinsPerEther) => {
                    const wethToWithdraw = coinsDifference / coinsPerEther;
                    this.setState({maxToWithdraw: wethToWithdraw})
                    this.setState({toWithdraw: wethToWithdraw})
                })
            })
        }
    }

    setMax(){
        console.log(this.state.maxToWithdraw);
        this.setState({toWithdraw: this.state.maxToWithdraw});
    }

    changeToWithdraw(e) {
        if (!Number(e.target.value) || e.target.value > this.state.maxToWithdraw || e.target.value < 0) {
            this.setState({buttonInactive:false})
            return;
        }
        if (e.target.name == 'toWithdraw') {
            if (e.target.value<=this.state.maxToWithdraw){
                this.setState({buttonInactive:true})

            } else this.setState({buttonInactive:false})
        }
    }

    render() {
        return <form>
            <div align='center'><b>WithdrawEtherCDP</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETC to withdraw: <input type='number' step="0.1" min="0" max={this.state.maxToWithdraw} name='toWithdraw' value={this.state.toWithdraw}/>
            {this.state.buttonInactive?<a className={"button pointer green right"} onClick={this.withdraw}>withdraw</a>:<div className="button address right">
                {'wrong ETC amount'}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }

}

class UpdateCDP extends React.Component{
    constructor(props){
        super(props);
        this.updateCDP = this.updateCDP.bind(this);
        this.state={loader: false, maxCoins:0, amount:this.props.position.coinsMinted/10**18, collateral:this.props.position.wethAmountLocked/10**18, buttonIsActive: false, balance:0};
    }

    updateCDP(){
        //console.log(this.state.collateral*10**18-this.props.position.wethAmountLocked);
        this.props.contracts['cdp'].methods.updateCDP(this.props.id, localWeb3.utils.toWei(this.state.amount.toString())).send({from:this.props.account, value: this.state.collateral*10**18-this.props.position.wethAmountLocked})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                window.location.reload();
            })
            .on('error', console.error);
    }

    componentDidMount() {
        localWeb3.eth.getBalance(this.props.account).then((result)=> {
            this.setState({balance: result});
        })

        this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(this.props.position.wethAmountLocked).call().then((result)=>{
            this.setState({maxCoins : localWeb3.utils.fromWei(result)})
        });


    }

    changeProportions(e) {
        if (!Number(e.target.value)||e.target.value>10000000||e.target.value<0) {
            return;
        }
        if (e.target.name=='amount'){
            this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(localWeb3.utils.toWei(this.state.collateral.toString())).call().then((result)=>{
                this.setState({maxCoins : localWeb3.utils.fromWei(result)});
                (e.target.value<(result/10**18)&&this.state.amount>1&&this.state.collateral<(this.state.balance+this.props.position.wethAmountLocked)/10**18)?this.setState({buttonIsActive:true}):this.setState({buttonIsActive:false});
            });

            if (e.target.value>=1)
                this.setState({amount : e.target.value})
            else
                this.setState({amount : 1.1})
        }
        else {
            this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(localWeb3.utils.toWei(e.target.value)).call().then((result)=>{
                this.setState({maxCoins : localWeb3.utils.fromWei(result)})
                this.setState({amount : localWeb3.utils.fromWei(result)})
            });

            (e.target.value<(parseFloat(localWeb3.utils.fromWei(this.props.position.wethAmountLocked))+this.state.balance/10**18)&&this.state.amount>1)?this.setState({buttonIsActive:true}):this.setState({buttonIsActive:false});

            this.setState({collateral : e.target.value})
        }
        return;
    }

    setMax(){
        const max = this.props.position.wethAmountLocked/10**18 + this.state.balance/10**18-0.01;
        this.setState({collateral: max})
        this.changeProportions({target:{name:'collateral', value:max.toString()}});
    }

    render() {
        return <form>
            <div align='center'><b>Update debt position</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETC collateral you provide: <input type='number' step="0.1" min={parseFloat(localWeb3.utils.fromWei(this.props.position.wethAmountLocked))} max="10000" name='collateral' value={this.state.collateral} onChange={e => this.changeProportions(e)}/>
            stable coins you'll get <input type='number' min="1.1" name='amount' value={this.state.amount} onChange={e => this.changeProportions(e)}/>
            <br/>max coins you can mint: {this.state.maxCoins}
            {this.state.buttonIsActive?<a className={"button pointer green right"} onClick={this.updateCDP}>Update</a>:<div className="button address right">
                {'Insufficient ETC '}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
        </form>;
    }
}

class Tsc extends React.Component{
    constructor(props) {
        super(props);
        this.initCoinsBuyOut = this.initCoinsBuyOut.bind(this);
        this.state = {address:'', supply:'', transfers:'', holders:'', pricePool:'', indicative:'', etherPool:'', tscPool:'', collateral:'', collateralPercent:'', stubFund:'', stubFundDemand: '', allowedToAuction:0}
    }
    componentDidMount() {
        const {contracts} = this.props;

        contracts['stableCoin'].methods.totalSupply().call().then((supply)=>{
            this.setState({supply: (supply/10**18).toFixed(2)});
            contracts['stableCoin'].methods.balanceOf(contracts['cdp']._address).call().then((stub)=>{
                this.setState({stubFund:(stub/10**18).toFixed(8)})

                contracts['dao'].methods.params('stabilizationFundPercent').call().then((stabilizationFundPercent) => {
                    this.setState({stubFundDemand:(supply * stabilizationFundPercent / 100 - stub)});
                });
            });

        });
        getTransfers(contracts['stableCoin']).then((result)=>{this.setState({transfers: result.length})});
        getHolders(contracts['stableCoin']).then((result)=>{this.setState({holders: result.length})});
        contracts['pool'].methods.getReserves().call().then((reserve)=>{
            this.setState({pricePool: (reserve[1]*this.props.etcPrice/reserve[0]).toFixed(4)});
            this.setState({etherPool: (reserve[1]/10**18).toFixed(4)});
            this.setState({tscPool: (reserve[0]/10**18).toFixed(2)});
        });
        this.setState({address: contracts['stableCoin']._address});
        contracts['weth'].methods.balanceOf(contracts['cdp']._address).call().then((cdpWethBalance)=>{
            this.setState({collateral:((cdpWethBalance/10**18).toFixed(3)*this.props.etcPrice).toFixed(3)})
        });
        contracts['cart'].methods.getCurrentSharePrice().call().then((sharePrice)=>{
            this.setState({indicative: (sharePrice/10**6).toFixed(4)});
            contracts['stableCoin'].methods.totalSupply().call().then((supply) => {
                const percent = parseFloat(100*this.state.collateral/this.state.supply/this.state.indicative).toFixed(2);
                this.setState({collateralPercent:percent});
            });
        });

        contracts['stableCoin'].methods.allowance(contracts['cdp']._address, contracts['auction']._address).call().then((allowance)=>{
            this.setState({allowedToAuction: allowance});
        });

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
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['stableCoin'].methods.allowance(this.props.contracts['cdp']._address, this.props.contracts['auction']._address).call().then((allowance)=>{
                    this.setState({allowedToAuction: allowance});
                });
            })
            .on('error', console.error);
    }


    render() {
        return <div align='left'>
            <div align='center'><b>True stable coin</b></div>
            {this.props.account!==''?<Button action={'buyStable'} name={"Buy"}/>:''}

            <div>total supply:         <b>{this.state.supply} TSC</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>
            {this.props.account!==''&&this.state.stubFundDemand>0?
                <a className={"small-button pointer green right"} onClick={()=>this.initCoinsBuyOut()}>init auction to top up stubFund</a>:

                <a className={"small-button pointer green right"} onClick={()=>this.allowSurplusToAuction()}>allow surplus to auction</a>
            }
            <div>price vs USD (pool): <b>{this.state.pricePool}</b></div>

            <div>price vs USD (indicative): <b>{this.state.indicative}</b></div>

            {this.props.account!==''&&this.state.allowedToAuction>0?<a className={"small-button pointer green right"} onClick={()=>this.initRuleBuyOut()}>init Rule buyOut</a>:''
            }

            <div>ETC in pool: <b>{this.state.etherPool}</b></div>
            <div>TSC in pool: <b>{this.state.tscPool}</b>{this.props.account!==''?<Button action={'Borrow'} name={"Borrow"}/>:''}</div>
            <div>overall collateral: <b>{this.state.collateral} USD ({this.state.collateralPercent}% of TSC supply)</b></div>
            <div>stabilization fund: <b>{this.state.stubFund}</b></div>
            <div>stabilization fund demand: <b>{this.state.stubFundDemand/10**18}</b></div>
            <div>allowed to auction: <b>{this.state.allowedToAuction/10**18}</b></div>

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>
        </div>
    }
}

class AuctionContract extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:''}
    }

    componentDidMount() {

    }



    render() {
        return <div align='left'><b>Rule token</b>
            <div>total supply:         <b>{this.state.supply}</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>

            <div>price in stableCoins (from pool):</div>

            <div>marketCap:</div>

            <div>pool volume:</div>

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>

        </div>
    }
}

class RuleToken extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', supply:'', transfers:'', holders:''}
    }

    componentWillReceiveProps () {
        this.props.contract.methods.totalSupply().call().then((supply)=>{this.setState({supply: (supply/10**18).toFixed(2)});});
        getTransfers(this.props.contract).then((result)=>{this.setState({transfers: result.length})});
        getHolders(this.props.contract).then((result)=>{this.setState({holders: result.length})});
        this.setState({address: this.props.contract._address});
    }
    componentDidMount() {
        this.props.contract.methods.totalSupply().call().then((supply)=>{this.setState({supply: (supply/10**18).toFixed(2)});});
        getTransfers(this.props.contract).then((result)=>{this.setState({transfers: result.length})});
        getHolders(this.props.contract).then((result)=>{this.setState({holders: result.length})});
        this.setState({address: this.props.contract._address});
    }



    render() {
        return <div align='left'><b>Rule token</b>
            <div>total supply:         <b>{this.state.supply}</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

                <div>N of holders: <b>{this.state.holders}</b></div>

                    <div>price in stableCoins (from pool):</div>

                        <div>marketCap:</div>

                            <div>pool volume:</div>

        <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
        <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>

        </div>
    }
}

class Plus extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            isHovered: false
        };
        this.handleHover = this.handleHover.bind(this);
        this.Click=this.Click.bind(this);
    }

    handleHover(){
        this.setState(prevState => ({
            isHovered: !prevState.isHovered
        }));
    }

    Click = (e) => {
        e.stopPropagation()
        eventEmitter.emit('change-state', ['',this.props.action,'']);
    }

    render() {
        const divClass = this.state.isHovered ?  "small-icon plus-icon pointer" : "small-icon plus-icon";
        return <div className="small-icon plus-icon pointer" onClick={this.Click}>
            <svg width="24" height="24" fill="green" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M13 5a1 1 0 1 0-2 0v6H5a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2h-6V5Z"></path></svg>
        </div>
    }
}

class Transaction extends React.Component{
    render(){
        return <a target='_blank' href={'https://blockscout.com/etc/mainnet/tx/'+this.props.tx}><div>{this.props.tx}</div></a>
    }
}

class App extends React.Component{
    constructor(props){
        super(props);
        this.handleStateChange = this.handleStateChange.bind(this);
        this.initContracts = this.initContracts.bind(this);
        this.state = {
            walletConnected: false,
            networkConnected: false,
            account:'',
            etcPrice: '',
            contracts:{}
        };
    }

    componentDidMount() {
        if (window.ethereum){
            localWeb3 = new Web3(window.ethereum);
            this.setState({contracts: this.initContracts()});
            console.log ('using window web3')
            window.ethereum.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    this.setState({account:accounts[0]})
                } else {
                    this.setState({account:'', walletConnected:false})
                }
            })

            window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts)=>{
                if (accounts.length>0){
                        this.setState({walletConnected:true, account:accounts[0]});
                }
                else {
                    this.setState({walletConnected:false})
                }
            })
        }
        else {
            localWeb3 = new Web3('https://etc.rpc.rivet.cloud/0f8dc4341fbd4f2d802c64fd49459d59');
            this.setState({contracts: this.initContracts()});
            console.log ('using rivet')
        }

    }

    handleStateChange = state => {
        this.setState(state);
    }

    Click=()=>{
     window.location.href='/'
    }

    initContracts(){
        let contracts = {};
        let dao = new localWeb3.eth.Contract(config.daoABI,config.daoAddress);
        contracts['dao'] = dao;
        dao.methods.addresses('rule').call().then((result)=>{
            contracts['rule'] = new localWeb3.eth.Contract(config.ruleABI, result);
        });
        dao.methods.addresses('oracle').call().then((result) =>{
            contracts['oracle']  = new localWeb3.eth.Contract(config.oracleABI, result);
            contracts['oracle'].methods.getPrice('etc').call().then((price)=>{
                this.setState({etcPrice:(price/10**6).toFixed(2)});
            })
        });
        dao.methods.addresses("stableCoin").call().then((result)=>{
            contracts['stableCoin'] = new localWeb3.eth.Contract(config.stableCoinABI,result);
        });
        dao.methods.addresses("weth").call().then((result)=>{
            contracts['weth'] = new localWeb3.eth.Contract(config.wethABI,result);
        });
        dao.methods.addresses("deposit").call().then((result)=>{
            contracts['deposit'] = new localWeb3.eth.Contract(config.depositABI,result);
        });
        dao.methods.addresses("cdp").call().then((result) => {
            contracts['cdp'] = new localWeb3.eth.Contract(config.cdpABI,result);
        });
        dao.methods.addresses("inflation").call().then((result) => {
            contracts['inflation'] = new localWeb3.eth.Contract(config.inflationABI,result);
        });
        dao.methods.addresses("cart").call().then((result) => {
            contracts['cart'] = new localWeb3.eth.Contract(config.cartABI,result);
        });
        dao.methods.addresses("auction").call().then((result) => {
            contracts['auction'] = new localWeb3.eth.Contract(config.auctionABI,result);
        });
        dao.methods.addresses("platform").call().then((result) => {
            contracts['platform'] = new localWeb3.eth.Contract(config.platformABI,result);
        });
        dao.methods.addresses("tokenTemplate").call().then((result) => {
            contracts['tokenTemplate'] = new localWeb3.eth.Contract(config.tokenTemplateABI,result);
        });
        contracts['pool'] = new localWeb3.eth.Contract(config.poolABI,config.stablePoolAddress);


        try{
            localWeb3.eth.net.isListening().then((connected)=>{
                if (connected)
                    this.setState({networkConnected: true})
                else {
                    this.setState({networkConnected: false})
                    console.log('net is NOT connected')
                }
            });
        }catch (e){
            this.setState({networkConnected: false})
            console.log('error, net is NOT connected: ' + e)
        }

        return contracts;
    }

    render(){
        return <div className="App">

                <div className="App-header">

                    <ETC etcPrice={this.state.etcPrice}/>
                    <h2 align="center" className="pointer" onClick={this.Click}>TrueStableCoin</h2>
                    {this.state.walletConnected ? <Address account={this.state.account}/>:<ConnectButton handleStateChange={this.handleStateChange} name='connect wallet'/>}
                </div>
                <div className="content">
                    <div className="region_left">

                        {this.state.walletConnected ? <><MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Balances} products={config.balances}/>
                                <MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Credits}/>
                                <MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Deposits}/></>
                            :''}
                        <MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Auctions} products={config.auctions}/>
                        <MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Pools} products={config.pools}/>

                    </div>

                    <div className="region_middle">
                        <MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} displayContent = {true} content={config.about} account={this.state.account} etcPrice={this.state.etcPrice}/>
                    </div>


                    <div className="region_left">
                        <MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Contracts} products={config.contractsList}/>
                        <MyPanel localWeb3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Commodities}/>
                    </div>

                </div>

            </div>;
    }
}

async function getTransfers(contract) {
    const txs = await contract.getPastEvents('Transfer', {fromBlock: fromBlock})
    return txs;
}

async function getHolders(contract){
    let txs = await getTransfers(contract);
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

export default App;