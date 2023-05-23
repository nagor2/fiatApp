import './App.css';
import Transfers from './components/Transfers';
import './components/MyPanel';
import config from './utils/config'
import ConnectButton from './components/СonnectionButton'
import MyPanel from './components/MyPanel'
import React, { useState, Component } from 'react';
import Web3 from 'web3'
var events = require('events');
let eventEmitter = new events.EventEmitter();

let localWeb3 = config.localWeb3;

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
            <div><b>Buy stable coins</b><br/><br/></div>
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
                this.setState({userAllowence: (result/10**18).toFixed(2)});
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
                this.setState({allowanceToDeposit:(result/10**18).toFixed(2)});
            });
            contracts['stableCoin'].methods.allowance(contracts['cdp']._address, this.props.account).call().then((result) => {
                this.setState({approvedFromCDP:(result/10**18).toFixed(2)});
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
        /*
        const { contracts } = this.props;
        contracts['cdp'].methods.closeCDP(this.props.id).send({from:this.props.account});*/
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
            <div>interest rate: <b>{this.state.interestRate}%</b></div>
            <div>wethLocked: <b>{this.state.wethLocked}</b></div>
            <div>maxCoinsToMint : <b>{this.state.maxStableCoinsToMint}</b></div>
            <div>recorded fee: <b>{this.state.feeGeneratedRecorded}</b></div>
            <div>accumulated interest: <b>{this.state.fee}</b></div>

            <input type='button' value='closeCDP' onClick={this.closeCDP}/>
            <input type='button' value='updateCDP' onClick={this.updateCDP}/>
            <input type='button' value='withdraw ether' onClick={this.withdraw}/>



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
    claimInterest(){}

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
            <input  type='button' value='claim interest' onClick={this.claimInterest}/>
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


            {(parseFloat(this.state.toWithdraw)<=this.state.coinsDeposited)?<a className={"button pointer green right"} onClick={this.withdraw}>Withdraw {this.state.toWithdraw +' TSC'}</a>:<div className="button address right">
                {'not enough TSC on deposit'}</div>}
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

class Borrow extends React.Component{
    constructor(props){
        super(props);
        this.openCDP = this.openCDP.bind(this);

        this.state={amount:1.1, collateral:0, buttonInactive: false, balance:0};
    }

    openCDP(){
        this.props.contracts['cdp'].methods.openCDP(localWeb3.utils.toWei(this.state.amount.toString())).send({from:this.props.account, value: localWeb3.utils.toWei(this.state.collateral.toString())}).then(function (result) {
            window.location.reload();
        });
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

            if (e.target.value>1)
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

        if (this.props.section == 'Balances' || this.props.section == 'Loans' ||this.props.section == 'Deposits' ||this.props.section == 'Transfers' ){
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
        contracts['stableCoin'].methods.approve(contracts['cdp']._address,this.state.needed*10**18).send({from:this.props.account})
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
            this.setState({needed:localWeb3.utils.fromWei(fee)*1.001});
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

class Tsc extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', supply:'', transfers:'', holders:'', pricePool:'', indicative:'', etherPool:'', tscPool:'', collateral:'', collateralPercent:'', stubFund:''}
    }
    componentDidMount() {
        const {contracts} = this.props;
        contracts['stableCoin'].methods.totalSupply().call().then((supply)=>{
            this.setState({supply: (supply/10**18).toFixed(2)});
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
        contracts['stableCoin'].methods.balanceOf(contracts['cdp']._address).call().then((stub)=>{
            this.setState({stubFund:(stub/10**18).toFixed(8)})
        });
    }

    render() {
        return <div align='left'>
            <div align='center'><b>True stable coin</b></div>
            {this.props.account!==''?<Button action={'buyStable'} name={"Buy"}/>:''}

            <div>total supply:         <b>{this.state.supply} TSC</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>

            <div>price vs USD (pool): <b>{this.state.pricePool}</b></div>

            <div>price vs USD (indicative): <b>{this.state.indicative}</b></div>
            <div>ETC in pool: <b>{this.state.etherPool}</b></div>
            <div>TSC in pool: <b>{this.state.tscPool}</b>{this.props.account!==''?<Button action={'Borrow'} name={"Borrow"}/>:''}</div>
            <div>overall collateral: <b>{this.state.collateral} USD ({this.state.collateralPercent}% of TSC supply)</b></div>
            <div>stabilization fund: <b>{this.state.stubFund}</b></div>

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
    const txs = await contract.getPastEvents('Transfer', {fromBlock: 17000000})
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