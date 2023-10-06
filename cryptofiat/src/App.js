import './App.css';
import {Address, ETC} from './utils/utils.js'
import config from './utils/config'
import ConnectButton from './components/ConnectButton'
import MyPanel from "./components/MyPanel";

import React from 'react';
import Web3 from 'web3'

var events = require('events');
let eventEmitter = new events.EventEmitter();

let localWeb3 = config.localWeb3;


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

                        {this.state.walletConnected ? <><MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Balances} products={config.balances}/>
                                <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Credits}/>
                                <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Deposits}/></>
                            :''}
                        <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Auctions} products={config.auctions}/>
                        <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Pools} products={config.pools}/>

                    </div>

                    <div className="region_middle">
                        <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} displayContent = {true} content={config.about} account={this.state.account} etcPrice={this.state.etcPrice}/>
                    </div>


                    <div className="region_left">
                        <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Contracts} products={config.contractsList}/>
                        <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Commodities}/>
                    </div>

                </div>

            </div>;
    }
}

export default App;