import React from "react";
import Commodity from "./Commodity";
import Transaction from "./Transaction";
import Auction from "./Auction";
import Basket from "./Basket";
import Transfers from "./Transfers";
import RuleToken from "./RuleToken";
import Tsc from "./TSC";
import Swap from "./Swap";
import Borrow from "./Borrow";
import UpdateCDP from "./UpdateCDP";
import CDP from "./CDP";
import DebtPosition from "./DebtPosition";
import Deposit from "./Deposit";
import DepositContract from "./DepositContract";
import OpenDeposit from "./OpenDeposit";
import WithDrawDeposit from "./WithDrawDeposit";
import PayInterestCDP from "./PayInterestCDP";
import CloseCDP from "./CloseCDP";
import MakeBidTSCBuyout from "./MakeBidTSCBuyout";
import WithdrawEtherCDP from "./WithdrawEtherCDP";
import DAO from "./DAO";
import ImproveBid from "./ImproveBid";
import {fromBlock} from "../utils/config";
import {dateFromTimestamp} from "../utils/utils";
import Product from "./Product";
import Plus from "./Plus";
import SwapRLE from  "./SwapRLE";
import config from "../utils/config";
import AuctionContract from "./AuctionContract";


export default class MyPanel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            open: false,
            itemsCount:'',
            products:this.props.products,
            contracts:'',
            //externalData: null,
            content: config.about
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
        //this.renderSwitch();
        //this.getItems(this.props.content.title);
    }

    static getDerivedStateFromProps(props, state) {
        // Store prevId in state so we can compare when props change.
        // Clear out previously-loaded data (so we don't render stale stuff).
        if (props.id !== state.prevId) {
            return {
                externalData: null,
                prevId: props.id,
            };
        }
        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props !== prevProps) {
            this.renderSwitch();
            this.getItems(this.props.content.title);
        }
    }

    toggleChildMenu() {
        this.setState(state => ({
            open: !state.open,
            content:{section:'', title:''}
        }));
    }

    renderSwitch(){
        if (this.props.displayContent) {
            this.props.emitter.on('change-state',  (state) =>{
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
                return <Auction web3={this.props.web3} emitter={this.props.emitter} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>;
            }

            switch (content[1]){
                case 'RLE':return (content[0]=='Balances')?<Transfers web3={this.props.web3} emitter={this.props.emitter} contractName={'rule'} account={this.props.account} contracts={this.props.contracts}/>:<RuleToken explorer={this.props.explorer} emitter={this.props.emitter} contract={this.props.contracts['rule']} name={content}/>; break;
                case 'DFC': return (content[0]=='Balances')?<Transfers  web3={this.props.web3} emitter={this.props.emitter} contractName={'flatCoin'} account={this.props.account} contracts={this.props.contracts}/>: <Tsc emitter={this.props.emitter} explorer={this.props.explorer} web3={this.props.web3} account={this.props.account} contracts={this.props.contracts} name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'buyStable':return <Swap name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'Dotflat':return <Swap name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'Gold':return <Swap name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'Rule token swap':return <SwapRLE name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'Basket':return <Basket web3={this.props.web3}  explorer={this.props.explorer} emitter={this.props.emitter} contracts={this.props.contracts} account={this.props.account}  etcPrice={this.props.etcPrice}/>; break;
                case 'Auction':return <AuctionContract web3={this.props.web3}  explorer={this.props.explorer} emitter={this.props.emitter} contracts={this.props.contracts} account={this.props.account}  etcPrice={this.props.etcPrice}/>; break;
                case 'Borrow': return <Borrow web3={this.props.web3} contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'updateCDP': return <UpdateCDP web3={this.props.web3} position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'CDP': return <CDP web3={this.props.web3}  explorer={this.props.explorer} emitter={this.props.emitter} contracts={this.props.contracts} account={this.props.account}  etcPrice={this.props.etcPrice}/>; break;
                case 'debt position': return <DebtPosition emitter={this.props.emitter} web3={this.props.web3} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'deposit': return <Deposit web3={this.props.web3} emitter={this.props.emitter} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'Deposit': return <DepositContract emitter={this.props.emitter}  explorer={this.props.explorer} contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'openDeposit': return <OpenDeposit web3={this.props.web3} contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'withdrawFromDeposit': return <WithDrawDeposit web3={this.props.web3} contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'payInterest': return <PayInterestCDP web3={this.props.web3} position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'closeCDP': return <CloseCDP web3={this.props.web3} position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'makeBidTSCBuyout': return <MakeBidTSCBuyout web3={this.props.web3} auction={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'withdrawEther': return <WithdrawEtherCDP web3={this.props.web3} position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'INTDAO': return <DAO web3={this.props.web3} contracts={this.props.contracts} explorer={this.props.explorer} account={this.props.account} id={content[2]}/>; break;
                case 'improveBid': return <ImproveBid contracts={this.props.contracts} account={this.props.account} bid={content[0]} id={content[2]}/>; break;
                default: return content['text'];break;
            }
        }
    }

    getCommodities(){
        const{contracts} = this.props;
        let prod = [];
        if (contracts['basket']!==undefined)
            contracts['basket'].methods.itemsCount().call().then((result) => {
                this.setState({itemsCount: result});
                for (let i = 1; i <= result; i++) {
                    contracts['basket'].methods.items(i).call().then((result) => {
                        contracts['basket'].methods.getPrice(result['symbol']).call().then((price) => {
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
            contracts['auction'].getPastEvents('newAuction', {
                fromBlock: fromBlock
                ,toBlock: 'latest'
            }).then((events) => {
                //console.dir (events);
                for (let i = 0; i < events.length; i++) {
                    let event = events[i];
                    //if (event.returnValues.lotAddress == contracts['dao'].addresses())
                    let id = event.returnValues.auctionID;
                    contracts['auction'].methods.auctions(id).call().then((auction) => {
                        if (auction.finalized == past) {
                            let title='Liquidate collateral';
                            let balance = 0;
                            if (auction.lotToken == contracts['rule']._address){
                                title = 'TSC buyout';
                                balance = (auction.paymentAmount / 10 ** 18).toFixed(2);
                            }
                            if (auction.lotToken == contracts['flatCoin']._address){
                                title = 'Rule buyout';
                                balance =  (auction.lotAmount / 10 ** 18).toFixed(2);
                            }

                            let auc = {
                                iconType: 'auction',
                                title: title,
                                id: id,
                                name: dateFromTimestamp(auction.initialized),
                                balance: balance
                            }

                            if (!products.find(a=>a.id==auc.id))
                            products.push(auc)
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
                console.log(events)
                for (let i = 0; i < events.length; i++) {
                    let event = events[i];
                    if (event.returnValues.owner.toLowerCase() == this.props.account.toLowerCase()) {
                        let id = event.returnValues.posID;
                        contracts['cdp'].methods.positions(id).call().then((position) => {
                            if (position.liquidationStatus<2)
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
                //console.log(events)
                for (let i =0; i<events.length; i++) {
                    let event = events[i];
                    if (event.returnValues.owner.toLowerCase()==this.props.account.toLowerCase()){
                        let id = event.returnValues.id;
                        contracts['deposit'].methods.deposits(id).call().then((deposit)=> {
                            if (!deposit.closed){
                                let dep = {
                                    iconType: 'deposit',
                                    title: 'deposit',
                                    id: id,
                                    name: dateFromTimestamp(deposit.timeOpened),
                                    balance: (deposit.coinsDeposited/10**18).toFixed(2)
                                }
                                if (!products.find(a=>a.id==dep.id))
                                    products.push(dep);
                            }
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
        let items = this.state.products?this.state.products.sort((a,b)=>(a.id-b.id)).map(product =><Product web3={this.props.web3} emitter={this.props.emitter} contracts={this.props.contracts} section={this.props.content.title} account={this.props.account?this.props.account:''} key={product.id} id={product.id} iconType={product.iconType} title={product.title} balance={product.balance} name = {product.name}/>):'';
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
                    {this.props.content.plus?<Plus emitter={this.props.emitter} action={this.props.content.add}/>:''}
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
