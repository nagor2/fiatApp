import React from "react";

export default class Product extends React.Component{
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
            if (contracts['stableCoin']!==undefined && contracts['rule']!==undefined)
                switch (this.props.title) {
                    case 'ETH':
                        this.props.web3.eth.getBalance(this.props.account).then((result) => {
                            this.setState({balance: ((result / 10 ** 11).toFixed(10) / 10 ** 7).toFixed(4)});
                        });

                        break;
                    case 'DFC':
                        contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((result) => {
                            this.setState({balance: (result / 10 ** 18).toFixed(2)});
                        });
                        break;
                    case 'RLE': contracts['rule'].methods.balanceOf(this.props.account).call().then((result) => {
                        this.setState({balance: (result / 10 ** 18).toFixed(2)});
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
                        this.props.web3.eth.getBalance(this.props.account).then((result) => {
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
        return <div className="product bt-tile__title pointer" onClick={()=>this.props.emitter.emit('change-state', [this.props.section,this.props.title,this.props.id, this.props.hash])}>
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