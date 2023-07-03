import './App.css';
import config from './utils/config'
import React, { useState, Component } from 'react';
import Web3 from 'web3'
var events = require('events');
let eventEmitter = new events.EventEmitter();
const fromBlock = 0;//17000000;

let localWeb3 = config.localWeb3;

class ConnectButton extends React.Component{
    constructor(props){
        super(props);
    }

    async handleStateChange() {
        const web3 = new Web3(Web3.givenProvider);
        if(typeof web3 !=='undefined'){
            const wConnected = await web3.eth.net.isListening();
            if (wConnected){
                const accounts = await web3.eth.requestAccounts();
                this.props.handleStateChange({
                    walletConnected: wConnected
                });
                if (accounts.length>0) {
                    this.props.handleStateChange({
                        account: accounts[0]
                    });
                }
            }
        }
    }

    render() {
        return <a className={"button pointer green right"} onClick={()=>this.handleStateChange()}>{this.props.name}</a>;
    }
}

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
                return <Auction contracts={this.props.contracts} account={this.props.account} id={content[2]}/>;
            }

            switch (content[1]){
                case 'RLE':return (content[0]=='Balances')?<Transfers localWeb3={localWeb3} contractName={'rule'} account={this.props.account} contracts={this.props.contracts}/>:<RuleToken contract={this.props.contracts['rule']} name={content}/>; break;
                case 'TSC': return (content[0]=='Balances')?<Transfers  localWeb3={localWeb3} contractName={'stableCoin'} account={this.props.account} contracts={this.props.contracts}/>: <Tsc account={this.props.account} contracts={this.props.contracts} name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'buyStable':return <Swap name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'WETH':return <Transfers localWeb3={localWeb3} contractName={'weth'} account={this.props.account} contracts={this.props.contracts}/>; break;
                case 'Borrow': return <Borrow contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'updateCDP': return <UpdateCDP position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'CDP': return <CDP contracts={this.props.contracts} account={this.props.account}  etcPrice={this.props.etcPrice}/>; break;
                case 'debt position': return <DebtPosition contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'deposit': return <Deposit contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'Deposit': return <DepositContract contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'openDeposit': return <OpenDeposit contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'withdrawFromDeposit': return <WithDrawDeposit contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'payInterest': return <PayInterestCDP position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'closeCDP': return <CloseCDP position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'makeBidTSCBuyout': return <MakeBidTSCBuyout auction={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'withdrawEther': return <WithdrawEtherCDP position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'INTDAO': return <DAO contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
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
                console.dir (events);
                for (let i = 0; i < events.length; i++) {
                    let event = events[i];
                    if (event.returnValues.owner.toLowerCase() == this.props.account.toLowerCase()) {
                        let id = event.returnValues.posId;
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
        let items = this.state.products?this.state.products.sort((a,b)=>(a.id-b.id)).map(product =><Product contracts={this.props.contracts} section={this.props.content.title} account={this.props.account?this.props.account:''} key={product.id} id={product.id} iconType={product.iconType} title={product.title} balance={product.balance} name = {product.name}/>):'';
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

class Button extends React.Component{
    constructor(props){
        super(props);
    }

    render() {
        return <a className={"button pointer green right"} onClick={()=>eventEmitter.emit('change-state', [this.props.item,this.props.action,this.props.id])}>{this.props.name}</a>;
    }
}

class Swap extends React.Component{
    render() {
        return <div>
            <div><b>Buy stable coins</b><br/><br/>
                <b>Add list: </b> https://raw.githubusercontent.com/nagor2/cryptoFiat/Oracle/tokenList/list.json
                <br/>
                <br/>
            </div>
            <iframe  src="https://swap.ethereumclassic.com/#/swap?outputCurrency=0x05e70011940cc4AfA46ef7c79BEf44E6348c702d"  height="900px"  width="100%" className='swap' />
        </div>;
    }
}

class CDP extends React.Component{
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
            collateral:''
            }
        this.allowSurplusToAuction = this.allowSurplusToAuction.bind(this);
        this.initRuleBuyOut = this.initRuleBuyOut.bind(this);
    }


    componentDidMount() {
        const { contracts } = this.props;
        if (this.props.account) this.setState({account:this.props.account});

        this.props.contracts['stableCoin'].methods.balanceOf(contracts['cdp']._address).call().then((stubFund)=>{
            this.setState({stubFund: (stubFund/10**18).toFixed(8)});
            contracts['stableCoin'].methods.totalSupply().call().then((supply)=>{

                contracts['dao'].methods.params('stabilizationFundPercent').call().then((percent)=>{
                    const coinsExceed =  stubFund - supply*percent/100;

                    this.setState({exceed: (coinsExceed/10**18).toFixed(2)});
                });

                this.setState({stubFund: (stubFund/10**18).toFixed(2)});
            });
        });

        contracts['stableCoin'].methods.allowance(contracts['cdp']._address, contracts['auction']._address).call().then((result) => {
            this.setState({toAuction: (result/10**18).toFixed(2)});
        });

        if (this.props.account!=='')
            contracts['stableCoin'].methods.allowance(contracts['cdp']._address, this.props.account).call().then((result) => {
                this.setState({userAllowence: (result/10**18).toFixed(10)});
            });

        contracts['weth'].methods.balanceOf(contracts['cdp']._address).call().then((result) => {
            this.setState({wethBalance: (result/10**18).toFixed(2)});
            this.setState({collateral:((result/10**18).toFixed(3)*this.props.etcPrice).toFixed(3)})
        });

        contracts['cdp'].methods.numPositions().call().then((result)=>{
            this.setState({positionsCount: result});
        });

        contracts['dao'].methods.params('collateralDiscount').call().then((result)=>{
            this.setState({dicount: result+'%'});
        });

        contracts['dao'].methods.params('interestRate').call().then((result)=>{
            this.setState({interestRate: result+'%'});
        });

        contracts['stableCoin'].methods.totalSupply().call().then((result)=>{
            this.setState({tscSupply: (result/10**18).toFixed(4)});
        });

        this.setState({address: contracts['cdp']._address});
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
        return  <div align='left'>
            <div align='center'><b>CDP</b></div>
            <div>stubFund: <b>{this.state.stubFund} TSC</b></div>
            <div>stubFund exceed: <b>{this.state.exceed} TSC</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['cdp'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            {this.props.account!==''?<div><input type='button' value='allow surplus to auction' onClick={this.allowSurplusToAuction}/></div>:''}
            <div>allowed to auction: <b>{this.state.toAuction} TSC</b></div>
            {this.props.account!==''?<div><input type='button' value='initRuleBuyOut' onClick={this.initRuleBuyOut}/></div>:''}

            {this.props.account!==''? <div>your stable coin allowance from CDP: <b>{this.state.userAllowence} TSC</b></div>:''}
            <div>total coins minted: <b>{this.state.tscSupply} TSC</b></div>
            <div>WETC balance of contract: <b>{this.state.wethBalance} ({this.state.collateral} USD)</b></div>
            <div>positions count: <b>{this.state.positionsCount}</b></div>
            <div>overall fee earned: <b>{this.state.feeEarned}</b>{this.props.account!==''?<Button action={'Borrow'} name={"Open dept position"}/>:''}</div>

            <div>overall fee payed: <b>{this.state.feePayed}</b></div>
            <div>collateral discount: <b>{this.state.dicount}</b></div>
            <div>interest rate: <b>{this.state.interestRate}</b></div>
            <div>address: <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code: <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>
        </div>;
    }
}

class Bids extends React.Component{
    constructor(props) {
        super(props);
        this.state = {bestBid:false};
    }

    render() {
        let bids = (this.props.bids!==undefined)?this.props.bids.sort((a,b)=>(b.blockNumber - a.blockNumber)).map(bid =>
            <Bid auction={this.props.auction} bestBid={this.props.auction.bestBidId==bid.returnValues.bidId} bid={bid} key={bid.returnValues.bidId} account={this.props.account} contracts={this.props.contracts}/>):'';
        return <div> {bids} </div>
    }
}

class Bid extends React.Component{
    constructor(props) {
        super(props);
        this.state = {bestBid:false, yourBid:false, symbol:'', canceled:false};

    }

    componentDidMount() {
        this.setState({bestbid:this.props.auction.bestBidId==this.props.bid.returnValues.bidId});
        this.setState({yourBid:this.props.bid.returnValues.owner.toLowerCase()==this.props.account.toLowerCase()});

    }
    componentWillReceiveProps(nextProps, nextContext) {
        if (this.props.bid.bid!=undefined)
        this.setState({canceled:this.props.bid.bid.canceled})
    }

    render(){
        return <div className="v-center row-container">
                <div className="product">
                    <div className="products-name">
                        <div>
                            {this.state.bestbid?'Best bid':''}
                        </div>
                        <div>
                            {this.state.yourBid?'Your bid':''}
                        </div>
                        <div>
                            {this.state.canceled?'canceled':'active'}
                        </div>
                        <div>
                            {localWeb3.utils.fromWei(this.props.bid.returnValues.bidAmount)}
                        </div>
                        <div>
                            {this.state.yourBid&&!this.state.canceled?<a className={"small-button pointer green"} onClick={()=>this.finalize()}>improve bid</a>:''}
                        </div>
                        <div>
                            {this.state.yourBid&&!this.state.canceled&&!this.props.bestBid?<a className={"small-button pointer green"} onClick={()=>this.props.contracts['auction'].methods.cancelBid(this.props.bid.returnValues.bidId).send({from:this.props.account})}>cancel bid</a>:''}
                        </div>
                    </div>
                    <div className="small-text">{this.props.bid.block==undefined?'':dateFromTimestamp(this.props.bid.block.timestamp)}</div>
                </div>
            </div>
    }
}

class Auction extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            id: 0,
            allowanceToAuction: 0,
            auction: 0,
            payment: 0,
            stableBalance: 0,
            bestBid:0,
            nextBid:0,
            block:0,
            timeLeft:0,
            bids:[],
            a: true
        };
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({address:contracts['auction']._address});

        let bids = [];

        contracts['auction'].getPastEvents('newBid', {filter: { auctionID: this.props.id }, fromBlock: fromBlock}).then((res)=> {
            bids.push.apply(bids,res);
            //console.log(res);
            for (let i=0; i<res.length; i++) {
                localWeb3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})

                    console.log(res[i].auctionID)
                });
                contracts['auction'].methods.bids(res[i].returnValues.bidId).call().then((bid)=>{
                    res[i].bid = bid;
                    this.setState({a:true})
                })
            }
            this.setState({bids:bids})
        })

        contracts['auction'].methods.auctions(this.props.id).call().then((auction)=>{
            this.setState({auction:auction});

            localWeb3.eth.getBlock('latest').then((block)=>{
                this.setState({block:block})
                contracts['dao'].methods.params('auctionTurnDuration').call().then((auctionTurnDuration)=> {
                    this.setState({timeLeft:(auctionTurnDuration - (block.timestamp - auction.lastTimeUpdated))})
                });
            });

            if (auction.bestBidId!=0){
                    contracts['auction'].methods.bids(auction.bestBidId).call().then((bestBid)=>{
                        this.setState({bestBid:bestBid})

                        contracts['dao'].methods.params('minAuctionPriceMove').call().then((minAuctionPriceMove)=> {
                            let nextBid = ((bestBid.bidAmount/100 * (100 - minAuctionPriceMove))/10**18).toFixed();
                            this.setState({nextBid:nextBid})
                        });

                    });

                }
            else {
                    contracts['rule'].methods.totalSupply().call().then((ruleSupply)=>{
                        contracts['dao'].methods.params('maxRuleEmissionPercent').call().then((maxRuleEmissionPercent)=> {
                            this.setState({nextBid:ruleSupply*maxRuleEmissionPercent/100});
                        });
                    });

                }

            if (auction.lotToken== this.props.contracts['rule']._address)
                this.setState({payment:auction.paymentAmount});
        });

        if (this.props.account){
            contracts['stableCoin'].methods.allowance(this.props.account,contracts['auction']._address).call().then((result) => {
                this.setState({allowanceToAuction:result});
            });

            {this.props.contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((result)=>{
                this.setState({stableBalance:result});
            })}
        }
    }

    allowStables(){
        this.props.contracts['stableCoin'].methods.approve(this.props.contracts['auction']._address,this.state.payment).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['auction']._address).call().then((res)=>{
                    this.setState({allowanceToAuction:(res)})
                })
            })
            .on('error', console.error);

    }

    makeBid(){
        let bid = localWeb3.utils.toWei((this.state.nextBid).toString());
        this.props.contracts['auction'].methods.makeBid(this.props.id,bid).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                //TODO: change bids
            })
            .on('error', console.error);

    }

    finalize(){
        this.props.contracts['auction'].methods.claimToFinalizeAuction(this.props.id).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
            })
            .on('error', console.error);

    }

    render() {
        return  <div align='left'>
            <div align='center'><b>Auction {(this.state.auction.lotToken== this.props.contracts['rule']._address)?'TSC buyout':''} (id: {this.props.id})</b></div>
            {(this.state.timeLeft<=0)?<a className={"small-button pointer green right"} onClick={()=>this.finalize()}>claim to finalize</a>:<div className="small-button address right" alt={'you have to wait until you may claim to finalize auction'}>
                {'claim to finalize auction in '+Math.floor(this.state.timeLeft / 3600)+':'+Math.floor(this.state.timeLeft / 60)+':'+this.state.timeLeft % 60}</div>}

            <div>TSC buyout amount: {this.state.payment/10**18}</div>

            <div>your TSC allowance to auction: {this.state.allowanceToAuction/10**18}</div>

            {(this.state.stableBalance>=this.state.payment)?<a className={"small-button pointer green right"} onClick={()=>this.allowStables()}>Allow {this.state.auction.paymentAmount/10**18} TSC</a>:<div className="small-button address right">
                {'not enough TSC to participate in this auction'}</div>}
            <div>the amount of Rule you'll recieve: {this.state.nextBid}</div>

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            {(this.state.allowanceToAuction>=this.state.payment)?
                <a className={"small-button pointer green right"} onClick={()=>this.makeBid()}>Make a bid (get {this.state.nextBid} Rule for {this.state.auction.paymentAmount/10**18} TSC)</a>:
                <div className="small-button address right">{'insufficient allowance to bid'}</div>}
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>




            {this.state.loader?<Loader/>:''}

            <br/>
            {<a className={"small-button pointer orange left"} onClick={()=>this.props.contracts['auction'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            <br/>
            <br/>
            <br/>
            <Bids auction={this.state.auction} bids={this.state.bids} account={this.props.account} contracts={this.props.contracts}/>

        </div>;
    }
}

class DAO extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', isActiveVoting:false, votingID:0, allowed:0, ruleBalanceOfDAO:0, totalPooled:0, userPooled:0,
            votingDiv:false, addVotingDiv:false, voteDiv:false, loader:false, amount:0, userDecision:false,
            addVoting: {votingType:'1',name:'name', address:'0x0000000000000000000000000000000000000000', value:0, decision:false},
            currentVoitng:[]};

        this.toggle = this.toggle.bind(this);
    }

    componentDidMount() {
        this.setState({address:this.props.contracts['dao']._address});

        this.props.contracts['dao'].methods.activeVoting().call().then((is)=>{
            this.setState({isActiveVoting:is})});

        this.props.contracts['dao'].methods.pooled(this.props.account).call().then((res)=>{
            this.setState({userPooled:res})})

        this.props.contracts['rule'].methods.balanceOf(this.props.contracts['dao']._address).call().then((res)=>{
            this.setState({totalPooled:res})});

        this.props.contracts['rule'].methods.allowance(this.props.account, this.props.contracts['dao']._address).call().then((res)=>{
            this.setState({allowed:res})});


        let events=[];

        this.props.contracts['dao'].getPastEvents('NewVoting', {fromBlock: fromBlock,toBlock: 'latest'}).then((res)=>{
            events.push.apply(events,res);
            let id = events[events.length-1].returnValues.id;
            this.setState({votingID:id})
            this.props.contracts['dao'].methods.votings(id).call().then((res)=> {
                this.setState({currentVoitng:res});

            })
            })



    }

    allowRLE(){
        this.props.contracts['rule'].methods.approve(this.props.contracts['dao']._address, localWeb3.utils.toWei((this.state.amount/10**18).toString())).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['rule'].methods.allowance(this.props.account, this.props.contracts['dao']._address).call().then((res)=>{
                    this.setState({allowed:res})});
            })
            .on('error', console.error);
    }

    poolRLE(){
        this.props.contracts['dao'].methods.poolTokens().send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})

                this.props.contracts['rule'].methods.balanceOf(this.props.contracts['dao']._address).call().then((res)=>{
                    this.setState({totalPooled:res})});
                this.props.contracts['dao'].methods.pooled(this.props.account).call().then((res)=>{
                    this.setState({userPooled:res})})
                this.props.contracts['rule'].methods.allowance(this.props.account, this.props.contracts['dao']._address).call().then((res)=>{
                    this.setState({allowed:res})});
            })
            .on('error', console.error);
    }

    returnRLE(){
        this.props.contracts['dao'].methods.returnTokens().send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['rule'].methods.balanceOf(this.props.contracts['dao']._address).call().then((res)=>{
                    this.setState({totalPooled:res})});
                this.props.contracts['dao'].methods.pooled(this.props.account).call().then((res)=>{
                    this.setState({userPooled:res})})
            })
            .on('error', console.error);
    }

    vote(){
        this.props.contracts['dao'].methods.vote(this.state.votingID, this.state.userDecision).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
            })
            .on('error', console.error);
    }


    toggle(name){
        this.setState({[name]: !this.state[name]});
    }

    newVoting(){
        console.log (this.state.addVoting);
        this.props.contracts['dao'].methods.addVoting(this.state.addVoting.votingType, this.state.addVoting.name,
            this.state.addVoting.value, this.state.addVoting.address.toString(), this.state.addVoting.decision).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['dao'].methods.activeVoting().call().then((is)=>{
                    this.setState({isActiveVoting:is})});

            })
            .on('error', console.error);

    }

    claimToFinalize(){
        this.props.contracts['dao'].methods.claimToFinalizeVoting(this.state.votingID).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['dao'].methods.activeVoting().call().then((is)=>{
                    this.setState({isActiveVoting:is})});
            })
            .on('error', console.error);
    }

    render() {
        return  <div align='left'>
            <div align='center'><b>DAO</b></div>
            {this.state.amount>0?<a className={"small-button pointer green right"} onClick={()=>this.allowRLE()}>allow Rule tokens</a>:''}
            <div>ruleBalanceOf DAO: <b>{(this.state.ruleBalanceOfDAO/10**18).toFixed(2)}</b></div>
            <div>Total pooled tokens: <b>{(this.state.totalPooled/10**18).toFixed(2)}</b></div>
            {this.state.allowed>0?<a className={"small-button pointer green right"} onClick={()=>this.poolRLE()}>pool tokens</a>:''}
            <div>Your allowed tokens: <b>{(this.state.allowed/10**18).toFixed(2)}</b></div>
            <div>Your pooled tokens: <b>{(this.state.userPooled/10**18).toFixed(2)}</b></div>

            {this.state.loader?<Loader/>:''}


            {this.state.userPooled>0?<a className={"small-button pointer green right"} onClick={()=>this.returnRLE()}>return tokens</a>:''}
            <input type='number' step="10000" min="0" name='amount' value={(this.state.amount/10**18).toFixed()} onChange={e => this.setState({amount:e.target.value*10**18})}/>

            <div>is active voting: <b>{this.state.isActiveVoting?'true':'false'}</b></div>

            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['dao'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            <a className={'pointer link'} onClick={()=>this.toggle('votingDiv')}>{this.state.isActiveVoting?'current':'last'} voting</a>
            <div className={"collapsed" + (this.state.votingDiv ? ' in' : '')}>
                <div>votingID: <b>{this.state.votingID}</b></div>
                <div>totalPositive: <b>{(this.state.currentVoitng[0]/10**18).toFixed(2)}</b></div>
                <div>voteingType: <b>{this.state.currentVoitng[1]}</b></div>
                <div>name: <b>{this.state.currentVoitng[2]}</b></div>
                <div>value: <b>{this.state.currentVoitng[3]}</b></div>
                <div>addr: <b>{this.state.currentVoitng[4]}</b></div>
                <div>startTime: <b>{dateFromTimestamp(this.state.currentVoitng[5])}</b></div>
                <div>decision: <b>{this.state.currentVoitng[6]?'true':'false'}</b></div>

                {this.state.isActiveVoting?<a className='link pointer' onClick={()=>this.claimToFinalize()}>claim to finalize</a>:''}
            </div>


            {!this.state.isActiveVoting&&this.state.userPooled>0?<>
            <a className={'pointer link'} onClick={()=>this.toggle('addVotingDiv')}>add new voting</a>
            <div className={"collapsed" + (this.state.addVotingDiv ? ' in' : '')}>
                <select id="votingType" onChange ={(e)=>{
                    const { addVoting } = this.state;
                    addVoting.votingType = e.target.value;
                    this.setState({addVoting,})}}>
                    <option value="1">Param</option>
                    <option value="2">Address</option>
                    <option value="3">Pause (on/off)</option>
                    <option value="4">Authorize (on/off)</option>
                </select>
                <input type="text" value={this.state.addVoting.name} onChange ={(e)=>{
                    const { addVoting } = this.state;
                    addVoting.name = e.target.value;
                    this.setState({addVoting,})}}/>

                <input type="text" value={this.state.addVoting.value} onChange ={(e)=>{const { addVoting } = this.state;
                    addVoting.value = e.target.value;
                    this.setState({addVoting,})}}/>

                <input type="text" value={this.state.addVoting.address} onChange ={(e)=>{const { addVoting } = this.state;
                    addVoting.address = e.target.value;
                    this.setState({addVoting,})}}/>

                <input type="checkbox" id="decision" onChange ={(e)=>{const { addVoting } = this.state;
                    addVoting.decision = e.target.checked;
                    this.setState({addVoting,})}}/>
                <a className={'pointer link right'} onClick={()=>this.newVoting()}>submit new voting</a>
            </div></>
                :''}

            {this.state.isActiveVoting&&this.state.userPooled>0?<>
                <a className={'pointer link'} onClick={()=>this.toggle('voteDiv')}>vote</a>
                <div className={"collapsed" + (this.state.voteDiv ? ' in' : '')}>
                    <input type="checkbox" id="voteDecision" onChange ={(e)=>{
                        this.setState({userDecision:e.target.checked})}
                    }/>
                    <a className={'pointer link right'} onClick={()=>this.vote()}>submit vote</a>
                </div>
            </>:''}

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>


        </div>;
    }

}


class DepositContract extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            id: 0,
            allowanceToDeposit: 0,
            approvedFromCDP: 1,
            depositsCount: 0,
            overallVolume: 0,
            overallFee: 0,
            depositRate: 0
        };
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({address:contracts['deposit']._address});

        contracts['deposit'].methods.counter().call().then((result)=>{
            this.setState({depositsCount:result});
        });

        if (this.props.account){
            contracts['stableCoin'].methods.allowance(this.props.account,contracts['deposit']._address).call().then((result) => {
                this.setState({allowanceToDeposit:(result/10**18).toFixed(5)});
            });
            contracts['stableCoin'].methods.allowance(contracts['cdp']._address, this.props.account).call().then((result) => {
                this.setState({approvedFromCDP:(result/10**18).toFixed(5)});
            });
        }


        contracts['stableCoin'].methods.balanceOf(contracts['deposit']._address).call().then((result) => {
            this.setState({overallVolume:(result/10**18).toFixed(2)});
        });

        contracts['dao'].methods.params('depositRate').call().then((interest)=>{
            this.setState({depositRate:interest});
        })
    }

//TODO: implement overall fee
    render() {
        return  <div align='left'>
            <div align='center'><b>Deposit contract</b></div>
            {this.props.account!==''?<Button action={'openDeposit'} name={"Open deposit"}/>:''}
            {this.props.account!==''?<div>your stable coin allowance to Deposit contract: <b>{this.state.allowanceToDeposit}</b></div>:''}
            {this.props.account!==''?<div>you are approved to withdraw from CDP: <b>{this.state.approvedFromCDP}</b></div>:''}
            {this.state.approvedFromCDP>0 && this.props.account!=''?<input type='button' value='transferFrom' onClick={this.transferFrom}/>:''}
            <div>N of deposits: <b>{this.state.depositsCount}</b></div>
            <div>overall volume: <b>{this.state.overallVolume}</b></div>
            <div>overall fee payed: <b>{this.state.overallFee}</b></div>
            <div>interest rate: <b>{this.state.depositRate}%</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['deposit'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>
        </div>;
    }
}

class DebtPosition extends React.Component{
    constructor(props){
        super(props);
        this.state={
            id:0,
            fee:0,
            maxStableCoinsToMint: 0,
            timeOpened:0,
            lastTimeUpdated:0,
            coinsMinted: 0,
            wethLocked:0,
            feeGeneratedRecorded:0,
            interestRate:0
        };
//TODO: implement and test
        this.closeCDP = this.closeCDP.bind(this);
        this.updateCDP = this.updateCDP.bind(this);
        this.withdraw = this.withdraw.bind(this);
        this.payInterest = this.payInterest.bind(this);
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({id:this.state.id})
        contracts['cdp'].methods.positions(this.props.id).call().then((position)=>{
            this.setState({position:position});
            this.setState({timeOpened:dateFromTimestamp(position.timeOpened)});
            this.setState({lastTimeUpdated:dateFromTimestamp(position.lastTimeUpdated)});
            this.setState({coinsMinted:localWeb3.utils.fromWei(position.coinsMinted)});
            this.setState({wethLocked:localWeb3.utils.fromWei(position.wethAmountLocked)});
            this.setState({feeGeneratedRecorded:localWeb3.utils.fromWei(position.feeGeneratedRecorded)});
            contracts['cdp'].methods.getMaxStableCoinsToMint(position.wethAmountLocked).call().then((maxCoins)=>{
                this.setState({maxStableCoinsToMint:localWeb3.utils.fromWei(maxCoins)});
            })
        })
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:localWeb3.utils.fromWei(fee)});
        })

        contracts['dao'].methods.params('interestRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    componentDidUpdate() {
        const { contracts } = this.props;
        contracts['cdp'].methods.positions(this.props.id).call().then((position)=>{
            this.setState({position:position});
            this.setState({timeOpened:dateFromTimestamp(position.timeOpened)});
            this.setState({lastTimeUpdated:dateFromTimestamp(position.lastTimeUpdated)});
            this.setState({coinsMinted:localWeb3.utils.fromWei(position.coinsMinted)});
            this.setState({wethLocked:localWeb3.utils.fromWei(position.wethAmountLocked)});
            this.setState({feeGeneratedRecorded:localWeb3.utils.fromWei(position.feeGeneratedRecorded)});
            contracts['cdp'].methods.getMaxStableCoinsToMint(position.wethAmountLocked).call().then((maxCoins)=>{
                this.setState({maxStableCoinsToMint:localWeb3.utils.fromWei(maxCoins)});
            })
        })
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:localWeb3.utils.fromWei(fee)});
        })

        contracts['dao'].methods.params('interestRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    closeCDP(){
        ;
    }
    updateCDP(){}
    withdraw(){}
    payInterest(){
        /*
        this.props.contracts['cdp'].methods.transferFee(this.props.id).send({from:this.props.account}).then(function (result) {
            alert('success');
        });*/
    }

    render() {
        return  <div align='left'>
            <div align='center'><b>Debt position (id: {this.props.id})</b></div>
            <Button action={'payInterest'} id={this.props.id} name={"payInterest"} item={this.state.position}/>
            <div>opened: <b>{this.state.timeOpened}</b></div>
            <div>updated: <b>{this.state.lastTimeUpdated}</b></div>
            <div>coinsMinted (red/yellow/green): <b>{this.state.coinsMinted}</b></div>
            <Button action={'updateCDP'} id={this.props.id} name={"Update position"} item={this.state.position}/>
            <div>interest rate: <b>{this.state.interestRate}%</b></div>
            <div>wethLocked: <b>{this.state.wethLocked}</b></div>
            <div>maxCoinsToMint : <b>{this.state.maxStableCoinsToMint}</b></div>
            <Button action={'closeCDP'} id={this.props.id} name={"Close position"} item={this.state.position}/>
            <div>recorded fee: <b>{this.state.feeGeneratedRecorded}</b></div>
            <div>accumulated interest: <b>{this.state.fee}</b></div>
            <br/>
            <Button action={'withdrawEther'} id={this.props.id} name={"withdraw ether"} item={this.state.position}/>

            <br/><br/><br/><br/><br/>


        </div>;
    }
}

class Deposit extends React.Component{
    constructor(props){
        super(props);
        this.state={
            id:0,
            opened:0,
            updated: 0,
            coinsDeposited:0,
            accumulatedInterest:0,
            interestRate:0
        };

        this.close = this.close.bind(this);
        this.claimInterest = this.claimInterest.bind(this);
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({id:this.state.id})
        contracts['deposit'].methods.deposits(this.props.id).call().then((deposit)=>{
            this.setState({opened:dateFromTimestamp(deposit.timeOpened)});
            this.setState({updated:dateFromTimestamp(deposit.lastTimeUpdated)});
            this.setState({coinsDeposited:(deposit.coinsDeposited/10**18).toFixed(2)});
        })

        contracts['deposit'].methods.overallInterest(this.props.id).call().then((interest)=>{
            this.setState({accumulatedInterest:localWeb3.utils.fromWei(interest)});
        })

        contracts['dao'].methods.params('depositRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    componentDidUpdate() {
        const { contracts } = this.props;
        contracts['deposit'].methods.deposits(this.props.id).call().then((deposit)=>{
            this.setState({opened:dateFromTimestamp(deposit.timeOpened)});
            this.setState({updated:dateFromTimestamp(deposit.lastTimeUpdated)});
            this.setState({coinsDeposited:(deposit.coinsDeposited/10**18).toFixed(2)});
        })

        contracts['deposit'].methods.overallInterest(this.props.id).call().then((interest)=>{
            this.setState({accumulatedInterest:localWeb3.utils.fromWei(interest)});
        })

        contracts['dao'].methods.params('depositRate').call().then((interest)=>{
            this.setState({interestRate:interest});
        })
    }

    close(){
        this.props.contracts['deposit'].methods.deposits(this.props.id).call().then((d)=>{
            this.props.contracts['deposit'].methods.withdraw(this.props.id,d.coinsDeposited).send({from:this.props.account})
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
        });

    }
    claimInterest(){
        //deposit.methods.claimInterest("+id+").send({from:userAddress});
        this.props.contracts['deposit'].methods.claimInterest(this.props.id).send({from:this.props.account})
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

    render() {
        return  <div align='left'>
            <Button action={'openDeposit'} id={this.props.id} name={"topUp"}/>
            <div align='center'><b>Deposit (id: {this.props.id})</b></div>
            <div>opened: <b>{this.state.opened}</b></div>
            <div>updated: <b>{this.state.updated}</b></div>
            <div>coinsDeposited (red/yellow/green): <b>{this.state.coinsDeposited}</b></div>
            <Button action={'withdrawFromDeposit'} id={this.props.id} name={"withdraw"}/>
            <div>interest rate: <b>{this.state.interestRate}%</b></div>
            <div>accumulated interest: <b>{this.state.accumulatedInterest}</b></div>
            <input className={'green'} type='button' value='claim interest' onClick={this.claimInterest}/>
            <input className={'green'} type='button' value='close' onClick={this.close}/>
            {this.state.loader?<Loader/>:''}
        </div>;
    }
}

class WithDrawDeposit extends React.Component{

    constructor(props){
        super(props);
        this.withdraw = this.withdraw.bind(this);

        this.state={toWithdraw:0, coinsDeposited:0};
    }

    setMax(){
        this.setState({toWithdraw: this.state.coinsDeposited})
    }

    withdraw(){
        this.props.contracts['deposit'].methods.withdraw(this.props.depositId,localWeb3.utils.toWei(this.state.toWithdraw)).send({from:this.props.account})
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

    changeToWithdraw(e){
        this.setState({toWithdraw: e.target.value})
    }

    componentDidMount() {
            this.props.contracts['deposit'].methods.deposits(this.props.depositId).call().then((deposit)=>{
                this.setState({coinsDeposited:(deposit.coinsDeposited/10**18).toFixed(2)});
            })
    }

    render(){
        return <div align={'left'}><div align={'center'}><b>Withdraw from deposit {this.props.depositId==undefined?'':'('+this.props.depositId+')'}</b></div>
            {this.props.depositId==undefined?'':<div>already deposited: {this.state.coinsDeposited}</div>}
            Amount to withdraw: <input type='number' step="0.1" min="0" max={this.state.coinsDeposited} name='amount' value={this.state.toWithdraw} onChange={e => this.changeToWithdraw(e)}/>
            <br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(parseFloat(this.state.toWithdraw)<=this.state.coinsDeposited)?
                <a className={"button pointer green right"} onClick={this.withdraw}>Withdraw {this.state.toWithdraw +' TSC'}</a>:<div className="button address right">

                {'not enough TSC on deposit'}</div>}
            <br></br>
            <br></br>
            <br></br>
            {this.state.loader?<Loader/>:''}
        </div>
    }
}

class CloseCDP extends React.Component{

    constructor(props){
        super(props);
        this.allowStables = this.allowStables.bind(this);
        this.close = this.close.bind(this);
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


    close(){
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

            <div>Your TSC allowance to CDP contract: {this.state.allowed}</div><br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(this.state.allowed>0)?<a className={"button pointer green right"} onClick={this.close}>Confirm closure</a>:<div className="button address right">
                {'you need to allow '+this.state.needed+' TSC to close this position'}</div>}
            <br></br>
            <br></br>
            <br></br>
            {this.state.loader?<Loader/>:''}
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

class OpenDeposit extends React.Component{

    constructor(props){
        super(props);
        this.allowStables = this.allowStables.bind(this);
        this.deposit = this.deposit.bind(this);
        this.topUp = this.topUp.bind(this);
        this.state={tscBalance:0, buttonInactive: false, allowed:0, toAllow:0, coinsDeposited:0};
    }

    allowStables(){
        if (this.state.toAllow<=this.state.tscBalance && this.props.contracts['deposit'] !== undefined){
            this.props.contracts['stableCoin'].methods.approve(this.props.contracts['deposit']._address,localWeb3.utils.toWei(this.state.toAllow.toString())).send({from:this.props.account})
                .on('transactionHash', (hash) => {
                this.setState({'loader':true})
                })
                .on('receipt', (receipt) => {
                    this.setState({'loader':true})
                })
                .on('confirmation', (confirmationNumber, receipt) => {
                    this.setState({'loader':false})
                    this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['deposit']._address).call().then((res)=>{
                        this.setState({allowed:(res/10**18)})
                    })
                })
                .on('error', console.error);
        }
    }

    setMax(){
        this.setState({toAllow: this.state.tscBalance})
    }

    deposit(){
        this.props.contracts['deposit'].methods.deposit().send({from:this.props.account})
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

    topUp(){
        this.props.contracts['deposit'].methods.topUp(this.props.depositId).send({from:this.props.account})
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

    changeToAllow(e){
        this.setState({toAllow: e.target.value})
    }

    componentDidMount() {
        if (this.props.account)
        this.props.contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((res)=>{
            this.setState({tscBalance:(res/10**18)})
        })

        if (this.props.account)
        this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['deposit']._address).call().then((res)=>{
            this.setState({allowed:(res/10**18)})
        })

        if (this.props.depositId !== undefined && this.props.depositId !== '')
        this.props.contracts['deposit'].methods.deposits(this.props.depositId).call().then((deposit)=>{
            this.setState({coinsDeposited:(deposit.coinsDeposited/10**18).toFixed(2)});
        })
    }

    render(){
        return <div align={'left'}><div align={'center'}><b>{this.props.depositId==undefined || this.props.depositId == ''?'Open':'TopUP'} Deposit {this.props.depositId==undefined || this.props.depositId == ''?'':'('+this.props.depositId+')'}</b></div>
            {(parseFloat(this.state.toAllow)<=this.state.tscBalance)?<a className={"button pointer green right"} onClick={()=>this.allowStables()}>Allow</a>:<div className="button address right">
                {'not enough TSC'}</div>}

            {this.props.depositId==undefined || this.props.depositId == ''?'':<div>already deposited: {this.state.coinsDeposited}</div>}
            TSC to allow: <input type='number' step="0.1" min="0" max={this.state.tscBalance} name='amount' value={this.state.toAllow} onChange={e => this.changeToAllow(e)}/>

            <div>Your TSC allowance to deposit contract: {this.state.allowed}</div><br></br>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>


            {(this.state.allowed>0)?<a className={"button pointer green right"} onClick={this.props.depositId==undefined|| this.props.depositId == ''?this.deposit:this.topUp}>Deposit {this.props.depositId==undefined|| this.props.depositId == ''?'':' additional'} {this.state.allowed +' TSC'}</a>:<div className="button address right">
                {'you need to allow coins for deposit'}</div>}
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

        this.props.contracts['cdp'].getMaxStableCoinsToMint(locked).call().then((maxCoins)=>{
            const coinsDifference = maxCoins - this.props.position.coinsMinted;
            this.props.contracts['cdp'].getMaxStableCoinsToMint(localWeb3.utils.toWei(1, 'ether')).call().then((coinsPerEther)=>{
                const wethToWithdraw = coinsDifference/coinsPerEther;
                this.setState({maxToWithdraw: wethToWithdraw})
                this.setState({toWithdraw: wethToWithdraw})
            })

            })

    }

    setMax(){
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

class Borrow extends React.Component{

    constructor(props){
        super(props);
        this.openCDP = this.openCDP.bind(this);
        this.state={loader: false, amount:1.1, collateral:0, buttonInactive: false, balance:0};
    }

    openCDP(){
        this.props.contracts['cdp'].methods.openCDP(localWeb3.utils.toWei(this.state.amount.toString())).send({from:this.props.account, value: localWeb3.utils.toWei(this.state.collateral.toString())})
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
    }

    changeProportions(e) {
        if (!Number(e.target.value)||e.target.value>10000000||e.target.value<0) {
            return;
        }
        if (e.target.name=='amount'){
            this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(localWeb3.utils.toWei(this.state.collateral)).call().then((result)=>{
                (e.target.value<(result/10**18)&&this.state.amount>1&&this.state.collateral<this.state.balance/10**18)?this.setState({buttonInactive:true}):this.setState({buttonInactive:false});
            });

            if (e.target.value>=1)
                this.setState({amount : e.target.value})
            else
                this.setState({amount : 1.1})
        }
        else {
            this.props.contracts['cdp'].methods.getMaxStableCoinsToMint(localWeb3.utils.toWei(e.target.value)).call().then((result)=>{
                this.setState({amount : localWeb3.utils.fromWei(result)})
            });
            (e.target.value<(this.state.balance/10**18)&&this.state.amount>1)?this.setState({buttonInactive:true}):this.setState({buttonInactive:false});

            this.setState({collateral : e.target.value})
        }
        return;
    }

    setMax(){
        const max = this.state.balance/10**18-0.01;
        this.setState({collateral: max})
        this.changeProportions({target:{name:'collateral', value:max.toString()}});
    }



    render() {
        return <form>
            <div align='center'><b>Borrow stablecoins</b></div>
            <a className={"button pointer green left"} onClick={()=>this.setMax()}>Max</a>
            ETC collateral you provide: <input type='number' step="0.1" min="0" max="10000" name='collateral' value={this.state.collateral} onChange={e => this.changeProportions(e)}/>
             stable coins you'll get <input type='number' min="1.1" name='amount' value={this.state.amount} onChange={e => this.changeProportions(e)}/>
            {this.state.buttonInactive?<a className={"button pointer green right"} onClick={this.openCDP}>Borrow</a>:<div className="button address right">
            {'Insufficient ETC '}</div>}
            {this.state.loader?<Loader/>:''}
            <br></br><br></br><br></br><br></br><br></br>
            </form>;
    }
}

class Product extends React.Component{
    constructor(props){
        super(props);
        this.state = {balance:''}
    }


    renderIconSwitch(param) {
        switch(param) {
            case 'wallet':
                return <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M9 12v-1a1 1 0 0 1 1-1h17a1 1 0 1 0 0-2H10a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h17a3 3 0 0 0 3-3V15a3 3 0 0 0-3-3H9Zm0 2h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V14Zm16.957 6.021a.979.979 0 1 1-1.957.001.979.979 0 0 1 1.957 0"></path></svg>;break;
            case 'contract':
                return <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M26 5H10a3 3 0 0 0-3 3v20a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3ZM10 7h16a1 1 0 0 1 1 1v20a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm9 16v-2h-7v2h7Zm5-12v2H12v-2h12Zm0 7v-2H12v2h12Z"></path></svg>;break;
            case 'deposit':
                return <img src='img/deposit-box.png'/>;break;
            case 'crude':
                return <img src='img/crude.png'/>;break;
            case 'loan': return <img src='img/credit.png'/>; break;
            case 'out': return <svg className='rotate-180' width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M18 36C8.059 36 0 27.941 0 18S8.059 0 18 0s18 8.059 18 18-8.059 18-18 18Zm3.6-25.8 9.334 7a1 1 0 0 1 0 1.6l-9.334 7A1 1 0 0 1 20 25v-2h-9a1 1 0 1 1 0-2h3v-2H4a1 1 0 0 1 0-2h8v-2H7a1 1 0 0 1 0-2h13v-2a1 1 0 0 1 1.6-.8Z"></path></svg>
            case 'in': return <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M18 36C8.059 36 0 27.941 0 18S8.059 0 18 0s18 8.059 18 18-8.059 18-18 18Zm3.6-25.8 9.334 7a1 1 0 0 1 0 1.6l-9.334 7A1 1 0 0 1 20 25v-2h-9a1 1 0 1 1 0-2h3v-2H4a1 1 0 0 1 0-2h8v-2H7a1 1 0 0 1 0-2h13v-2a1 1 0 0 1 1.6-.8Z"></path></svg>
            case 'auction': return <img src='img/auction.png'/>; break;
            case 'pool': return <img src='img/liquidity.png'/>; break;
            default:
                return '';
        }
    }

    componentDidMount() {
        const{contracts} = this.props;

        if (this.props.section == 'Balances' || this.props.section == 'Loans' || this.props.section == 'Auctions' ||this.props.section == 'Deposits' ||this.props.section == 'Transfers' ){
            if (contracts['stableCoin']!==undefined && contracts['rule']!==undefined && contracts['weth']!==undefined)

                switch (this.props.title) {
                    case 'ETC':
                        localWeb3.eth.getBalance(this.props.account).then((result) => {
                            this.setState({balance: ((result / 10 ** 11).toFixed(10) / 10 ** 7).toFixed(4)});
                        });

                        break;
                    case 'TSC':
                        contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((result) => {
                            this.setState({balance: (result / 10 ** 18).toFixed(2)});
                        });
                        break;
                    case 'RLE': contracts['rule'].methods.balanceOf(this.props.account).call().then((result) => {
                        this.setState({balance: (result / 10 ** 18).toFixed(2)});
                    });
                        break;
                    case 'WETH':
                        contracts['weth'].methods.balanceOf(this.props.account).call().then((result) => {
                            this.setState({balance: (result / 10 ** 18).toFixed(4)});
                        });
                        break;
                    default:
                        this.setState({balance: this.props.balance});
                        break;
                }

        }

    }

    componentWillReceiveProps() {
        const{contracts} = this.props;

        if (this.props.section == 'Balances'){
            if (contracts['stableCoin']!==undefined && contracts['rule']!==undefined && contracts['weth']!==undefined )
                switch (this.props.title) {
                    case 'ETC':
                        localWeb3.eth.getBalance(this.props.account).then((result) => {
                            this.setState({balance: ((result / 10 ** 11).toFixed(10) / 10 ** 7).toFixed(4)});
                        });

                        break;
                    case 'TSC':
                        contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((result) => {
                            this.setState({balance: (result / 10 ** 18).toFixed(2)});
                        });
                        break;
                    case 'RLE': contracts['rule'].methods.balanceOf(this.props.account).call().then((result) => {
                        this.setState({balance: (result / 10 ** 18).toFixed(2)});
                    });
                        break;
                    case 'WETH':
                        contracts['weth'].methods.balanceOf(this.props.account).call().then((result) => {
                            this.setState({balance: (result / 10 ** 18).toFixed(4)});
                        });
                        break;
                    default:
                        console.log ('here: '+this.props.balance)
                        this.setState({balance: this.props.balance});
                        break;
                }

        }

    }

    render() {
        return <div className="product bt-tile__title pointer" onClick={()=>eventEmitter.emit('change-state', [this.props.section,this.props.title,this.props.id, this.props.hash])}>
                <div className="v-center row-container">
                    {this.renderIconSwitch(this.props.iconType)}
                    <div className="product">
                        <div className="products-name">
                        <div>
                        {this.props.title}
                        </div>
                        <div>
                        {this.state.balance}
                        </div>
                        </div>
                        <div className="small-text">{this.props.name}</div>
                        </div>
                    </div>
                </div>
    }
}

class Loader extends React.Component{
    render(){
        return <div><img className={'loader abs-centered'} src='img/loading.png' width={'50'} height={'50'}/></div>;
    }
}

class PayInterestCDP extends React.Component{
    constructor(props) {
        super(props);
        this.state = {debt:0, days: 0, allowance:0, needed:0, loader:false, fee:0}
        console.log(this.props.position)
        this.allow=this.allow.bind(this);
        this.payInterest=this.payInterest.bind(this);
    }

    allow(){
        const {contracts} = this.props;
        contracts['stableCoin'].methods.approve(contracts['cdp']._address,localWeb3.utils.toWei(this.state.needed.toFixed(18).toString())).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false});
                //window.location.reload();
            })
            .on('error', console.error);
    }

    payInterest(){
        this.props.contracts['cdp'].methods.transferFee(this.props.id).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                //window.location.reload();
            })
            .on('error', console.error);
    }

    componentDidMount() {
        const {contracts} = this.props;
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({needed:localWeb3.utils.fromWei(fee)*1.2});
            //TODO: set 1.001
        })

        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:localWeb3.utils.fromWei(fee)});
        })

        contracts['stableCoin'].methods.allowance(this.props.account, contracts['cdp']._address).call().then((allowed)=>{
            this.setState({allowance:localWeb3.utils.fromWei(allowed)});
        })


    }

    componentDidUpdate() {
        const {contracts} = this.props;
        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({needed:localWeb3.utils.fromWei(fee)*1.001});
        })

        contracts['cdp'].methods.totalCurrentFee(this.props.id).call().then((fee)=>{
            this.setState({fee:localWeb3.utils.fromWei(fee)});
        })

        contracts['stableCoin'].methods.allowance(this.props.account, contracts['cdp']._address).call().then((allowed)=>{
            this.setState({allowance:localWeb3.utils.fromWei(allowed)});
        })


    }

    render (){
        return <><div><b>Pay interest for loan #{this.props.id}</b></div>
        <div align='left'>
            <div>TSC minted:         <b>{localWeb3.utils.fromWei(this.props.position.coinsMinted)} TSC</b></div>
            <div>your allowance to CPD:         <b>{this.state.allowance} TSC</b></div>
            <div>your fee to pay:         <b>{this.state.fee} TSC</b></div>
            <div>you have to allow:         <b>~{this.state.needed} TSC</b></div>
            <a className={"button pointer green left"} onClick={this.allow}>Allow needed amount</a>
            {this.state.allowance>this.state.fee?<a className={"button pointer green right"} onClick={this.payInterest}>Pay Interest</a>:<div className="button address right">
                {'Insufficient allowance to pay interest'}</div>}
            <br/><br/><br/><br/>
            {this.state.loader?<Loader/>:''}
        </div></>
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
        this.props.contract.methods.transfer(this.state.address, localWeb3.utils.toWei((this.state.amount/10**18).toString())).send({from:this.props.account})
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
            <a class="small-button green right" onClick={()=>this.transfer()}>transfer</a>
            <br/><br/></>


    }
}


class Transfers extends React.Component{

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
                this.props.localWeb3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { to: this.props.account }, fromBlock: fromBlock}).then((res)=> {
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
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { from: this.props.account }, fromBlock: fromBlock}).then((res)=> {
            for (let i=0; i<res.length; i++) {
                this.props.localWeb3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                });
            }
            txs.push.apply(txs,res);
            this.setState({txs:txs})
        })
        contracts[this.props.contractName].getPastEvents('Transfer', {filter: { to: this.props.account }, fromBlock: fromBlock}).then((res)=> {
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

    convertWeth(){
        this.props.contracts['weth'].methods.withdraw(this.state.wethBalance).send({from:this.props.account})
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
        return <><div className={'flex-col'}>{(this.props.contractName=="weth"&&this.state.wethBalance>0)?<a className={"button pointer green right"} onClick={()=>this.convertWeth()}>convert to ETC</a>:''}<b>Your {this.props.contractName.replace(/\b\w/g, l => l.toUpperCase())} transfers</b><p></p><Paginator items={items} perPage={10}/></div>
            <div><TransferForm contract={this.props.contracts[this.props.contractName]} account={this.props.account}/></div>
        </>;
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

class Commodity extends React.Component{
    constructor(props) {
        super(props);
        this.state = {initialPrice:'', price:'', lastUpdated:'', share:'', id: '', previd:''}
    }

    render() {
        return <div align='left'><b>{this.props.title}</b>
            <div>price: <b>{this.state.price}</b></div>
            <div>initialPrice: <b>{this.state.initialPrice}</b></div>
            <div>change: <b>{(100*(this.state.price - this.state.initialPrice)/this.state.initialPrice).toFixed(2)}%</b></div>
            <div>lastUpdated: <b>{this.state.lastUpdated}</b></div>
            <div>share: <b>{this.state.share}</b></div>
        </div>
    }

    componentDidMount() {
        const {contracts} = this.props;
        contracts['cart'].methods.items(this.props.id).call().then((item)=>{
            this.setState({initialPrice: parseFloat(item['initialPrice']/10**6).toFixed(5)});
            this.setState({share: item['share']});
            contracts['cart'].methods.getPrice(item['symbol']).call().then((price)=>{
                this.setState({price: parseFloat(price/10**6).toFixed(5)});});
            contracts['oracle'].methods.timeStamp(item['symbol']).call().then((timeStamp)=>{
                this.setState({lastUpdated: dateFromTimestamp(timeStamp)});
            });
        });
    }

    componentDidUpdate() {
        const {contracts} = this.props;
        contracts['cart'].methods.items(this.props.id).call().then((item)=>{
            this.setState({initialPrice: parseFloat(item['initialPrice']/10**6).toFixed(5)});
            this.setState({share: item['share']});
            contracts['cart'].methods.getPrice(item['symbol']).call().then((price)=>{
                this.setState({price: parseFloat(price/10**6).toFixed(5)});});
            contracts['oracle'].methods.timeStamp(item['symbol']).call().then((timeStamp)=>{
                this.setState({lastUpdated: dateFromTimestamp(timeStamp)});
            });
        });
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

class Address extends React.Component {
    render() {
        return <div className="button address right">
            {this.props.account.slice(0, 6) +
            '...' +this.props.account.slice(-4)}
        </div>;
    }
}

class ETC extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        return <div className="button address left">
            {'ETC price: '+this.props.etcPrice}
        </div>;
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

function dateFromTimestamp(timeStamp){
    const d = new Date(timeStamp * 1000);
    return ("0" + d.getDate()).slice(-2) + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" +
        d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) +":"+ ("0" + d.getSeconds()).slice(-2);
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