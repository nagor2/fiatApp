import React from "react";
import {fromBlock} from "../utils/config";
import {dateFromTimestamp, Loader, toFloat} from "../utils/utils";
import {getPastEventsCached} from "../utils/cacheApi";
import {cachedContractCall} from "../utils/cachedContractCall";

export default class Pool extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', isActiveVoting:false, votingID:0, allowed:0, ruleBalanceOfDAO:0, totalPooled:0, userPooled:0,
            votingDiv:false, addVotingDiv:false, voteDiv:false, loader:false, amount:0, userDecision:false,
            addVoting: {votingType:'1',name:'name', address:'0x0000000000000000000000000000000000000000', value:0, decision:false},
            currentVoitng:[], loading: true};

        this.toggle = this.toggle.bind(this);
    }

    async loadData() {
        const { contracts, account, web3 } = this.props;
        
        if (!contracts || !contracts['dao'] || !contracts['rule']) {
            console.warn('Pool: contracts not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 Pool: Starting data load via Block Watcher API...');

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

            console.log(`✅ Pool: Total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('❌ Pool: Failed to load data:', error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.dao && this.props.contracts?.dao) {
            console.log('Pool: Contracts initialized, loading data...');
            this.loadData();
        }
        
        if (prevProps.account !== this.props.account) {
            console.log('Pool: Account changed, reloading data...');
            this.loadData();
        }
    }


    render() {
        if (this.state.loading) {
            return <div align='center'>Loading pool data...</div>;
        }

        return  <div align='left'>
            <div align='center'><b>Pool</b></div>
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

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>


        </div>;
    }

}