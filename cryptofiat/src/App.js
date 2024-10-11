import './App.css';
import {Address, ETC} from './utils/utils.js'
import config from './utils/config'
import ConnectButton from './components/ConnectButton'
import MyPanel from "./components/MyPanel";

//import { getAccount } from '@wagmi/core'
//import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'

//import { WagmiConfig } from 'wagmi'
//import { localhost, classic } from 'wagmi/chains'

import React from 'react';
import Web3 from 'web3'
//import { EthereumProvider } from '@walletconnect/ethereum-provider'

// 1. Get projectId
//const projectId = '91330a25042ee96db0fa1ec2ecbf936c'

// 2. Create wagmiConfig
/*const metadata = {
    name: 'TrueStableCoin',
    description: 'TrueStableCoin',
    url: 'https://TrueStableCoin.ru',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}*/

//const chains = [classic, localhost]
//const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata })

// 3. Create modal
//let walletConnect = createWeb3Modal({ wagmiConfig, projectId, chains })

var events = require('events');
let eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(12);

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

    async componentDidMount() {

        if (window.ethereum){
            localWeb3 = new Web3(window.ethereum);
            this.setState({contracts: this.initContracts()});
            console.log ('using window web3')
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

            if (accounts.length > 0) {
                this.setState({account:accounts[0], walletConnected: true})
            }
            window.ethereum.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    this.setState({account:accounts[0], walletConnected: true})
                }
                else {
                    this.setState({account:'', walletConnected:false})
                }
            })
        }
        else {
            localWeb3 = new Web3(config.rpc);
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

        dao.methods.addresses("stableCoin").call().then((result)=>{
            contracts['stableCoin'] = new localWeb3.eth.Contract(config.stableCoinABI,result);
        });

        dao.methods.addresses("cdp").call().then((result) => {
            contracts['cdp'] = new localWeb3.eth.Contract(config.cdpABI,result);
        });

        dao.methods.addresses('oracle').call().then((result) =>{
            contracts['oracle']  = new localWeb3.eth.Contract(config.oracleABI, result);
            contracts['oracle'].methods.getPrice('eth').call().then((price)=>{
                console.log("price: "+price)
                this.setState({etcPrice:(price/10**6).toFixed(2)});
            })
        });

        dao.methods.addresses("deposit").call().then((result)=>{
            contracts['deposit'] = new localWeb3.eth.Contract(config.depositABI,result);
        });

        dao.methods.addresses("basket").call().then((result) => {
            contracts['basket'] = new localWeb3.eth.Contract(config.cartABI,result);
        });
        dao.methods.addresses("auction").call().then((result) => {
            contracts['auction'] = new localWeb3.eth.Contract(config.auctionABI,result);
        });

        //contracts['pool'] = new localWeb3.eth.Contract(config.poolABI,config.stablePoolAddress);


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
                    <w3m-button balance="hide"/>
                    <ETC etcPrice={this.state.etcPrice}/>
                    <img src='img/logo.png'/>&nbsp;<h2 align="center" className="pointer" onClick={this.Click}>DotFlat</h2>
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
                        <MyPanel emitter={eventEmitter} web3={localWeb3} bgColor="#FFFFFF"  explorer={config.explorer} contracts={this.state.contracts} displayContent = {true} content={config.about} account={this.state.account} etcPrice={this.state.etcPrice}/>
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