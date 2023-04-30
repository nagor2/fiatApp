import './App.css';
import React, { useState, Component } from 'react';
import Web3 from 'web3'

var daoAddress = '0xd1c5A469191E45a4D06D725681F2B73a402737b4';
const daoABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "WETH",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            }
        ],
        "name": "NewVoting",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "VotingFailed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            }
        ],
        "name": "VotingSucceed",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "activeVoting",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "addresses",
        "outputs": [
            {
                "internalType": "address payable",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "authorized",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "params",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "paused",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "pooled",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "totalPooled",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "votings",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "totalPositive",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "voteingType",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "address payable",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "decision",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "addressName",
                "type": "string"
            },
            {
                "internalType": "address payable",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "setAddressOnce",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "votingType",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "address payable",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "_decision",
                "type": "bool"
            }
        ],
        "name": "addVoting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renewContracts",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "poolTokens",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "returnTokens",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "votingId",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "_vote",
                "type": "bool"
            }
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "votingId",
                "type": "uint256"
            }
        ],
        "name": "claimToFinalizeVoting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const Balances = {
  title: 'Balances',
    plus: true,
    expander:true,
    add:'1',
    subtitle: '',
  link:'/'
};
const Contracts = {
    title: 'Contracts',
    plus: false,
    expander:true,
    subtitle: '',
}

const Auctions = {
    title: 'Auctions',
    plus: true,
    expander:true,
    add:'1',
    subtitle: '',
}

const Deposits = {
    title: 'Deposits',
    plus: true,
    expander:true,
    add:'1',
    subtitle: '',
    page:'deposits'
}

const Credits = {
    title: 'Loans',
    plus: true,
    expander:true,
    add:'1',
    subtitle: '',
}

const balances = [
    { title: 'ETC', name:'Ethereum classic', id: 1, balance: 9.00005, iconType: 'wallet' },
    { title: 'TSC', name:'True stable coin', id: 2, balance: 6999.00,  iconType: 'wallet' },
    { title: 'WETH', name:'wrapped ETC', id: 3, balance: 0.005, iconType: 'wallet' },
    { title: 'RLE', name:'Rule token', id: 4, balance: 0.005, iconType: 'wallet' },
];

const deposits = [
    { title: 'TSC', name:'True stable coin', id: 1, balance: 6999.00,  iconType: 'deposit' },
];

const credits = [
    { title: 'TSC', name:'True stable coin', id: 1, balance: 6999.00,  iconType: 'loan' },
    { title: 'TSC', name:'True stable coin', id: 2, balance: 6999.00,  iconType: 'loan' },
];


const auctions = [
    { title: 'TSC buyout', name:'True stable coin', id: 1, balance: 50.00,  iconType: 'auction' },
    { title: 'Rule buyout', name:'Rule tokens buyout', id: 2, balance: 10.00,  iconType: 'auction' },
];


const contracts = [
    { title: 'TSC', name:'True stable coin', id: 1, balance: '' , iconType: 'contract' },
    { title: 'CDP', name:'Collateral Dept Positions', id: 2, balance: '' , iconType: 'contract' },
    { title: 'Deposit', name:'Deposit', id: 3, balance: '' , iconType: 'contract' },
    { title: 'RLE', name:'Rule token', id: 4, balance: ''  , iconType: 'contract' },
    { title: 'Auction', name:'Auction', id: 5, balance: ''  , iconType: 'contract' },
    { title: 'INTDAO', name:'Interest DAO', id: 6, balance: ''  , iconType: 'contract' },
    { title: 'Inflation', name:'Inflation', id: 7, balance: ''  , iconType: 'contract' },
    { title: 'Cart', name:'Cart', id: 8, balance: ''  , iconType: 'contract' },
    { title: 'ExchangeRateContract', name:'ExchangeRateContract', id: 9, balance: ''  , iconType: 'contract' },
];

const about = {
    subtitle: 'About True Stable Coin',
    text: <div>
        <p>We are pleased to present to you TSC - True Stable Coin. TSC is a
            reliable and stable stablecoin that provides users with the ability to
            store their savings in a stable form and use it as a means of payment.</p>

        <p>The problem with the dollar and fiat money in general is their
            unlimited issuance, lack of backing, and centralization - accounts can
            be blocked, money seized, and transfers restricted. In addition, the
            dollar is subject to significant inflation, and income is taxed.
            Cryptocurrencies became an alternative at some point, but their
            exchange rate is unstable and can fluctuate by dozens of percent
            during the day. Stablecoins (USDT, DAI, USDC) became a solution at
            some point, but the backing of the most popular ones is questionable,
            and the dollar accounts holding their reserves can also be blocked,
            with their issuance being uncontrolled. The reality of the risk of
            stablecoin rate decline was demonstrated by the situation with the
            Silicon Valley Bank's collapse and the subsequent brief 10% drop in
            the USDC rate, and the dollar inflation also affects stablecoin
            holders.</p>

        <p>An alternative could be the collateralized stablecoin TSC, tied not to
            the dollar exchange rate, but to a weighted basket of commodities
            (oil, gas, rice, copper, aluminum, etc.).</p>

        <p>At the moment, a working prototype of a smart contract system has been
            created, implementing basic functionality that is ready to be
            demonstrated. Funds are needed for development, code audit, and the
            system's own capital. In return, the investor receives a share in the
            business with a projected annual return of 15% in dollars for the
            first year and an option to reclaim it. We are ready to demonstrate
            the functionality, answer questions, and listen to counterproposals in
            the Telegram group </p>
</div>
};

class Button extends React.Component{
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
        return <a className={"button pointer green right"} onClick={()=>this.handleStateChange()}>connect wallet</a>;
    }
}

class Product extends React.Component{
    constructor(props){
        super(props);
    }

    renderIconSwitch(param) {
        switch(param) {
            case 'wallet':
                return <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M9 12v-1a1 1 0 0 1 1-1h17a1 1 0 1 0 0-2H10a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h17a3 3 0 0 0 3-3V15a3 3 0 0 0-3-3H9Zm0 2h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V14Zm16.957 6.021a.979.979 0 1 1-1.957.001.979.979 0 0 1 1.957 0"></path></svg>;break;
            case 'contract':
                return <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M26 5H10a3 3 0 0 0-3 3v20a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3ZM10 7h16a1 1 0 0 1 1 1v20a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Zm9 16v-2h-7v2h7Zm5-12v2H12v-2h12Zm0 7v-2H12v2h12Z"></path></svg>;break;
            case 'deposit':
                return <img src='img/deposit-box.png'/>;break;

            case 'loan': return <img src='img/credit.png'/>; break;
            case 'auction': return <img src='img/auction.png'/>; break;
            default:
                return '';
        }
    }


    render() {
        return <div className="product bt-tile__title pointer">
                <div className="v-center row-container">
                    {this.renderIconSwitch(this.props.iconType)}

                    <div className="product">
                        <div className="products-name">
                        <div>
                        {this.props.title}
                        </div>
                        <div>
                        {this.props.balance}
                        </div>
                        </div>
                        <div className="small-text">{this.props.name}</div>
                        </div>
                    </div>
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
        console.log(this.props.link)
        console.dir(this.state)
    }

    render() {
        const divClass = this.state.isHovered ?  "small-icon plus-icon pointer" : "small-icon plus-icon";
        return <div className="small-icon plus-icon pointer" onClick={(e)=>this.Click(e)}>
            <svg width="24" height="24" fill="green" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M13 5a1 1 0 1 0-2 0v6H5a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2h-6V5Z"></path></svg>
        </div>
    }
}

class MyPanel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            open: false
        };

        this.toggleChildMenu = this.toggleChildMenu.bind(this);

    }
/*
    renderSwitchContent = page =>{
        switch (page) {
            case 'about': return 'rule';break;
            case 'rule': return 'rule';break;
            default: return 'page not found'; break;
        }
    }*/

    toggleChildMenu() {
       this.setState(state => ({
            open: !state.open
        }));
    }
    render() {

        const items = this.props.products?this.props.products.map(product =>
            <Product key={product.id} iconType={product.iconType} title={product.title} name = {product.name}  balance={product.balance>0?product.balance.toFixed(5):''}/>
        ):'';

        return <div className="panel xs_12" style={{backgroundColor:this.props.bgColor}}>
            {this.props.content.expander?
            <div className="expander" onClick={this.toggleChildMenu}>
                <div className="bt-tile__title pointer">{this.props.content.title}&nbsp;
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
                {this.props.content.plus?<Plus link={this.props.content.add}/>:''}
            </div>:''}
            <div>
                <div className={"collapsed" + (this.state.open ? ' in' : '')}>
                    {this.props.content.expander? items:''}
                </div>

                {this.props.content.text?

                <div align="left" className="middle-content">
                    <b>{this.props.content.subtitle}</b>

                    {this.props.content.text}
                </div>
                    :''}
            </div>
        </div>
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
    render() {
        return <div className="button address left">
            {'ETC price: 19.70'}
        </div>;
    }
}

/*   <button className="address pointer" title="Logout" onClick={this.logout}>
       <svg width="32" height="32" viewBox="0 0 32 32" fillRule="evenodd" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M17 8H11C9.34315 8 8 9.34315 8 11V21C8 22.6569 9.34315 24 11 24H17H18C18.5523 24 19 23.5523 19 23C19 22.4477 18.5523 22 18 22H17H11C10.4477 22 10 21.5523 10 21V11C10 10.4477 10.4477 10 11 10H17H18C18.5523 10 19 9.55228 19 9C19 8.44772 18.5523 8 18 8H17ZM17 15C16.4477 15 16 15.4477 16 16C16 16.5523 16.4477 17 17 17H22.6514L21.0431 18.6083C20.6526 18.9989 20.6526 19.632 21.0431 20.0226C21.4336 20.4131 22.0668 20.4131 22.4573 20.0226L25.6994 16.7805C25.8768 16.603 25.9737 16.3754 25.9898 16.1433C25.9965 16.0965 26 16.0486 26 16C26 15.9488 25.9962 15.8985 25.9887 15.8494C25.9619 15.637 25.8669 15.4315 25.7038 15.2683L22.4617 12.0263C22.0712 11.6358 21.438 11.6358 21.0475 12.0263C20.657 12.4168 20.657 13.05 21.0475 13.4405L22.607 15H17Z"></path></svg>
   </button>*/

class App extends React.Component{
    constructor(props){
        super(props);
        this.handleStateChange = this.handleStateChange.bind(this);
        this.state = {
            walletConnected: false,
            networkConnected: false,
            account:''
        };
    }

    async componentDidMount() {
        let localWeb3;
        try{
            localWeb3 = new Web3('https://etc.rpc.rivet.cloud/6f4e0413c2dd468ebd08f54a5c9c5b82');
            if (localWeb3.eth.net.isListening()){
                this.setState({networkConnected: true})
            } else {this.setState({networkConnected: false})
                console.log('net is NOT connected')}
        }catch (e){
            this.setState({networkConnected: false})
            console.log('net is NOT connected')
        }

        window.ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
                this.setState({account:accounts[0]})
            } else {
                this.setState({account:'', walletConnected:false})
            }
        })

        const accounts = await window.ethereum.request({ method: 'eth_accounts' })

        if (accounts.length>0){
            this.setState({walletConnected:true, account:accounts[0]});
            localWeb3 = new Web3(window.ethereum);
        }
        else {
            this.setState({walletConnected:false})
        }

        const daoStatic = new localWeb3.eth.Contract(daoABI,daoAddress);

        await daoStatic.methods.addresses('rule').call().then(function (result) {
            console.log(result);
        });
    }

    handleStateChange = state => {
        this.setState(state);
    }

    Click=()=>{
     window.location.href='/'
    }

    render(){
  return <div className="App">
        <div className="App-header">

      <ETC/>
            <h2 align="center" className="pointer" onClick={this.Click}>TrueStableCoin</h2>
            {this.state.walletConnected ? <Address account={this.state.account}/>:<Button handleStateChange={this.handleStateChange}/>}
        </div>

        <div className="content">
        <div className="region_left">

            {this.state.walletConnected ? <><MyPanel bgColor="#FFFFFF" content={Balances} products={balances}/>
            <MyPanel bgColor="#FFFFFF" content={Credits} products={credits}/>
            <MyPanel bgColor="#FFFFFF" content={Deposits} products={deposits}/></>
                :''}
            <MyPanel bgColor="#FFFFFF" content={Auctions} products={auctions}/>

        </div>

        <div className="region_middle">
            <MyPanel bgColor="#FFFFFF" content={about}/>
            <MyPanel bgColor="#FFFFFF" content={Balances} products={balances}/>
        </div>


            <div className="region_left">
                <MyPanel bgColor="#FFFFFF" content={Contracts} products={contracts}/>
                <MyPanel bgColor="#FFFFFF" content={Balances} products={balances}/>

            </div>

        </div>

    </div>;}
}


export default App;
