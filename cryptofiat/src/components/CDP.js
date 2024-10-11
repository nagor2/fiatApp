import React from "react";
import Button from "./Button";

export default class CDP extends React.Component{
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
            collateral:'',
            RuleBalanceOfCDP:0
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

        this.props.contracts['rule'].methods.balanceOf(contracts['cdp']._address).call().then((ruleBalance)=>{
            this.setState({RuleBalanceOfCDP: (ruleBalance/10**18).toFixed(2)});
        });

        contracts['stableCoin'].methods.allowance(contracts['cdp']._address, contracts['auction']._address).call().then((result) => {
            this.setState({toAuction: (result/10**18).toFixed(2)});
        });

        if (this.props.account!=='')
            contracts['stableCoin'].methods.allowance(contracts['cdp']._address, this.props.account).call().then((result) => {
                this.setState({userAllowence: (result/10**18).toFixed(10)});
            });


        this.props.web3.eth.getBalance(contracts['cdp']._address).then((result) => {
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
            <div>stubFund: <b>{this.state.stubFund} DFC</b></div>
            <div>stubFund exceed: <b>{this.state.exceed} DFC</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['cdp'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            {this.props.account!==''?<div><input type='button' value='allow surplus to auction' onClick={this.allowSurplusToAuction}/></div>:''}
            <div>allowed to auction: <b>{this.state.toAuction} DFC</b></div>
            {this.props.account!==''?<div><input type='button' value='initRuleBuyOut' onClick={this.initRuleBuyOut}/></div>:''}

            {this.props.account!==''? <div>your stable coin allowance from CDP: <b>{this.state.userAllowence} DFC</b></div>:''}
            <div>total coins minted: <b>{this.state.tscSupply} DFC</b></div>
            <div>ETH balance of contract: <b>{this.state.wethBalance} ({this.state.collateral} USD)</b></div>
            {<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['cdp'].methods.burnRule().send({from:this.props.account})}>burn Rule ({this.state.RuleBalanceOfCDP}) from CDP</a>}
            <div>positions count: <b>{this.state.positionsCount}</b></div>
            <div>overall fee earned: <b>{this.state.feeEarned}</b>{this.props.account!==''?<Button emitter={this.props.emitter} action={'Borrow'} name={"Open dept position"}/>:''}</div>

            <div>overall fee payed: <b>{this.state.feePayed}</b></div>
            <div>collateral discount: <b>{this.state.dicount}</b></div>
            <div>interest rate: <b>{this.state.interestRate}</b></div>
            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }
}