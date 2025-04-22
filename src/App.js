import './App.css';
import {Address, ETH} from './utils/utils.js'
import config from './utils/config'
import ConnectButton from './components/ConnectButton'
import MyPanel from "./components/MyPanel";
import React from 'react';
import Web3 from 'web3'
var events = require('events');
let eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(13);
/* global BigInt */

let web3 = config.localWeb3;




class App extends React.Component{
  constructor(props){
    super(props);
    this.getAccount = this.getAccount.bind(this);
    this.initContracts = this.initContracts.bind(this);
    this.state = {
      walletConnected: false,
      networkConnected: false,
      account:'',
      ethPrice: '',
      contracts:{},
      web3:''
    };
  }

  async componentDidMount() {
    if (window.ethereum && Number(await window.ethereum.request({ method: "eth_chainId" })) ===1){
      web3 = new Web3(window.ethereum);
      console.log ('using window web3')
      this.state.web3 = web3;
    }
    else {
      web3 = new Web3(config.rpc);
      console.log ('using rivet')
    }
    this.setState({contracts: await this.initContracts()});
  }

  handleStateChange = state => {
    this.setState(state);
  }

  Click=()=>{
    window.location.href='/'
  }



  async getAccount() {
    if (window.ethereum){
    const accounts = await window.ethereum // Or window.ethereum if you don't support EIP-6963.
        .request({ method: "eth_requestAccounts" })
        .catch((err) => {
          if (err.code === 4001) {
            // EIP-1193 userRejectedRequest error.
            // If this happens, the user rejected the connection request.
            console.log("Please connect to MetaMask.")
          } else {
            console.error(err)
          }
        })

    if (accounts.length > 0) {
      console.log(accounts[0])
      this.setState({account:accounts[0], walletConnected: true})
    }
    }
    else console.log('no window ethereum')
  }


  async initContracts(){
    let contracts = {};
    let dao = new web3.eth.Contract(config.daoABI,config.daoAddress);
    contracts['dao'] = dao;

    dao.methods.addresses('rule').call().then((result)=>{
      contracts['rule'] = new web3.eth.Contract(config.ruleABI, result);
    });

    dao.methods.addresses("flatCoin").call().then((result)=>{
      contracts['flatCoin'] = new web3.eth.Contract(config.stableCoinABI,result);
    });

    dao.methods.addresses("cdp").call().then((result) => {
      contracts['cdp'] = new web3.eth.Contract(config.cdpABI,result);
    });

    dao.methods.addresses('oracle').call().then((result) =>{
      contracts['oracle']  = new web3.eth.Contract(config.oracleABI, result);
      contracts['oracle'].methods.getPrice('eth').call().then((price)=>{
        console.log("price: "+price)
        this.setState({ethPrice:(parseFloat(price)/10**6).toFixed(2)});
      })
    });

    dao.methods.addresses("deposit").call().then((result)=>{
      contracts['deposit'] = new web3.eth.Contract(config.depositABI,result);
    });

    dao.methods.addresses("basket").call().then((result) => {
      contracts['basket'] = new web3.eth.Contract(config.cartABI,result);
    });
    dao.methods.addresses("auction").call().then((result) => {
      contracts['auction'] = new web3.eth.Contract(config.auctionABI,result);
    });

    //contracts['pool'] = new localWeb3.eth.Contract(config.poolABI,config.stablePoolAddress);

    return contracts;
  }

  render(){
    return <div className="App">

      <div className="App-header">
        <w3m-button balance="hide"/>
        <ETH ethPrice={this.state.ethPrice}/>

        <img src='%PUBLIC_URL%/img/logo.png'/>&nbsp;<h2 align="center" className="pointer" onClick={this.Click}>DotFlat</h2>
        {this.state.walletConnected ? <Address account={this.state.account}/>:<ConnectButton getAccount={this.getAccount} name='connect wallet'/>}

      </div>
      <div className="content">
        <div className="region_left">
          {this.state.walletConnected ? <><MyPanel emitter={eventEmitter} web3={web3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Balances} products={config.balances}/>
                <MyPanel emitter    ={eventEmitter} web3={web3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Credits}/>
                <MyPanel emitter={eventEmitter} web3={web3} bgColor="#FFFFFF" contracts={this.state.contracts} account={this.state.account} content={config.Deposits}/></>
              :''}
          <MyPanel emitter={eventEmitter} web3={this.state.web3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Auctions} products={config.auctions}/>
          <MyPanel emitter={eventEmitter} web3={this.state.web3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Pools} products={config.pools}/>
        </div>

        <div className="region_middle">
          <MyPanel emitter={eventEmitter} web3={web3} bgColor="#FFFFFF"  explorer={config.explorer} contracts={this.state.contracts} displayContent = {true} content={config.about} account={this.state.account} ethPrice={this.state.ethPrice}/>
        </div>

        <div className="region_left">
          <MyPanel emitter={eventEmitter} web3={web3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Contracts} products={config.contractsList}/>
          <MyPanel emitter={eventEmitter} web3={web3} bgColor="#FFFFFF" contracts={this.state.contracts} content={config.Commodities}/>
        </div>

      </div>

    </div>;
  }
}

export default App;