import React from "react";
import {fromBlock} from "../utils/config";
import {dateFromTimestamp, Loader, toFloat} from "../utils/utils";
import {getPastEventsCached} from "../utils/cacheApi";
import {cachedContractCall} from "../utils/cachedContractCall";

export default class DAO extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', isActiveVoting:false, votingID:0, allowed:0, ruleBalanceOfDAO:0, totalPooled:0, userPooled:0,
            votingDiv:false, addVotingDiv:false, voteDiv:false, loader:false, amount:0, userDecision:false,
            addVoting: {votingType:'1',name:'name', value:0, decision:false},
            currentVoitng:[], loading: true};
        //window.history.replaceState(null, "", "/contracts/INTDAO")
        this.toggle = this.toggle.bind(this);
    }

    async loadData() {
        const { contracts, account, web3 } = this.props;
        
        if (!contracts || !contracts['dao'] || !contracts['rule']) {
            console.warn('DAO: contracts not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 DAO: Starting data load via Block Watcher API...');

            const daoAddress = contracts['dao']._address;

            const promises = [
                cachedContractCall('dao', 'activeVoting', [], contracts['dao']),
                cachedContractCall('rule', 'balanceOf', [daoAddress], contracts['rule']),
            ];

            if (account && account !== '') {
                promises.push(
                    cachedContractCall('dao', 'pooled', [account], contracts['dao']),
                    cachedContractCall('rule', 'allowance', [account, daoAddress], contracts['rule']),
                );
            }

            const results = await Promise.all(promises);

            const newState = {
                isActiveVoting: results[0],
                totalPooled: results[1],
                address: daoAddress
            };

            if (account && account !== '') {
                newState.userPooled = results[2];
                newState.allowed = results[3];
            }

            const events = await getPastEventsCached(
                contracts['dao'], 
                'NewVoting', 
                {fromBlock: fromBlock, toBlock: 'latest'},
                web3
            );

            if (events && events.length > 0) {
                const id = toFloat(events[events.length - 1].returnValues.id);
                newState.votingID = id;

                newState.currentVoitng = await cachedContractCall(
                    'dao', 'votings', [id], contracts['dao']
                );
            }

            newState.loading = false;
            this.setState(newState);

            console.log(`✅ DAO: Total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('❌ DAO: Failed to load data:', error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.dao && this.props.contracts?.dao) {
            console.log('DAO: Contracts initialized, loading data...');
            this.loadData();
        }
        
        if (prevProps.account !== this.props.account) {
            console.log('DAO: Account changed, reloading data...');
            this.loadData();
        }
    }


    allowRLE(){
        this.props.contracts['rule'].methods.approve(this.props.contracts['dao']._address, this.state.amount).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', async (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                const daoAddress = this.props.contracts['dao']._address;
                const allowed = await cachedContractCall(
                    'rule', 'allowance',
                    [this.props.account, daoAddress],
                    this.props.contracts['rule'],
                );
                this.setState({allowed});
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
            .on('confirmation', async (confirmationNumber, receipt) => {
                this.setState({'loader':false})

                const daoAddress = this.props.contracts['dao']._address;
                const [totalPooled, userPooled, allowed] = await Promise.all([
                    cachedContractCall('rule', 'balanceOf', [daoAddress], this.props.contracts['rule']),
                    cachedContractCall('dao', 'pooled', [this.props.account], this.props.contracts['dao']),
                    cachedContractCall('rule', 'allowance', [this.props.account, daoAddress], this.props.contracts['rule']),
                ]);

                this.setState({ totalPooled, userPooled, allowed });
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
            .on('confirmation', async (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                const daoAddress = this.props.contracts['dao']._address;
                const [totalPooled, userPooled] = await Promise.all([
                    cachedContractCall('rule', 'balanceOf', [daoAddress], this.props.contracts['rule']),
                    cachedContractCall('dao', 'pooled', [this.props.account], this.props.contracts['dao']),
                ]);

                this.setState({ totalPooled, userPooled });
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
            .on('confirmation', async (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                const isActiveVoting = await cachedContractCall(
                    'dao', 'activeVoting', [], this.props.contracts['dao']
                );
                this.setState({isActiveVoting});
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
            .on('confirmation', async (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                const isActiveVoting = await cachedContractCall(
                    'dao', 'activeVoting', [], this.props.contracts['dao']
                );
                this.setState({isActiveVoting});
            })
            .on('error', console.error);
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading DAO data...</div>;
        }

        return  <div align='left'>
            <div align='center'><b>DAO</b></div>
            {this.state.amount>0?<a className={"small-button pointer green right"} onClick={()=>this.allowRLE()}>allow Rule tokens</a>:''}
            <div>ruleBalanceOf DAO: <b>{(toFloat(this.state.ruleBalanceOfDAO)/10**18).toFixed(2)}</b></div>
            <div>Total pooled tokens: <b>{(toFloat(this.state.totalPooled)/10**18).toFixed(2)}</b></div>

            {this.state.allowed>0?<a className={"small-button pointer green right"} onClick={()=>this.poolRLE()}>pool tokens</a>:''}
            {this.props.account!=''?<div>Your allowed tokens: <b>{(toFloat(this.state.allowed)/10**18).toFixed(2)}</b></div>:''}
            {this.props.account!=''?<div>Your pooled tokens: <b>{(toFloat(this.state.userPooled)/10**18).toFixed(2)}</b></div>:''}

            {this.state.loader?<Loader/>:''}


            {this.state.userPooled>0?<a className={"small-button pointer green right"} onClick={()=>this.returnRLE()}>return tokens</a>:''}
            {this.props.account!=''?<input type='number' step="10000" min="0" name='amount' value={(this.state.amount/10**18).toFixed()} onChange={e => this.setState({amount:e.target.value*10**18})}/>:''}

            <div>is active voting: <b>{this.state.isActiveVoting?'true':'false'}</b></div>

            {
                this.props.account!=''?<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['dao'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>:''}
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