import React from "react";
import Transfers from "./Transfers";


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

            switch (content[1]){
                case 'RLE':return (content[0]=='Balances')?<Transfers localWeb3={this.props.localWeb3} contractName={'rule'} account={this.props.account} contracts={this.props.contracts}/>:<RuleToken contract={this.props.contracts['rule']} name={content}/>; break;
                case 'TSC': return (content[0]=='Balances')?<Transfers  localWeb3={this.props.localWeb3} contractName={'stableCoin'} account={this.props.account} contracts={this.props.contracts}/>: <Tsc account={this.props.account} contracts={this.props.contracts} name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'buyStable':return <Swap name={content} etcPrice={this.props.etcPrice}/>; break;
                case 'WETH':return <Transfers localWeb3={this.props.localWeb3} contractName={'weth'} account={this.props.account} contracts={this.props.contracts}/>; break;
                case 'Borrow': return <Borrow contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'CDP': return <CDP contracts={this.props.contracts} account={this.props.account}  etcPrice={this.props.etcPrice}/>; break;
                case 'debt position': return <DebtPosition contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'deposit': return <Deposit contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
                case 'Deposit': return <DepositContract contracts={this.props.contracts} account={this.props.account}/>; break;
                case 'openDeposit': return <OpenDeposit contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'withdrawFromDeposit': return <WithDrawDeposit contracts={this.props.contracts} account={this.props.account} depositId={content[2]}/>; break;
                case 'payInterest': return <PayInterestCDP position={content[0]} contracts={this.props.contracts} account={this.props.account} id={content[2]}/>; break;
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

    getLoans(){
        const{contracts} = this.props;
        let products=[];
        if (contracts['cdp']!==undefined)
            contracts['cdp'].getPastEvents('PositionOpened', {
                fromBlock: 17000000,
                toBlock: 'latest'
            }).then((events) => {
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
            contracts['deposit'].getPastEvents('DepositOpened', {fromBlock: 17000000,toBlock: 'latest'}).then((events)=>{
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

export default MyPanel;