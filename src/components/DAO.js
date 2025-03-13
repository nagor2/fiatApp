import React from "react";
import {fromBlock} from "../utils/config";
import {dateFromTimestamp, Loader} from "../utils/utils";

export default class DAO extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', isActiveVoting:false, votingID:0, allowed:0, ruleBalanceOfDAO:0, totalPooled:0, userPooled:0,
            votingDiv:false, addVotingDiv:false, voteDiv:false, loader:false, amount:0, userDecision:false,
            addVoting: {votingType:'1',name:'name', address:'0x0000000000000000000000000000000000000000', value:0, decision:false},
            currentVoitng:[]};
        //window.history.replaceState(null, "", "/contracts/INTDAO")
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
        this.props.contracts['rule'].methods.approve(this.props.contracts['dao']._address, this.props.web3.utils.toWei((this.state.amount/10**18).toString())).send({from:this.props.account})
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
        this.props.contracts['dao'].methods.vote(this.state.userDecision).send({from:this.props.account})
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
        this.props.contracts['dao'].methods.claimToFinalizeCurrentVoting().send({from:this.props.account})
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

            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>


        </div>;
    }

}