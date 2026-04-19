import React from "react";
import {fromBlock} from "../utils/config";
import {dateFromTimestamp, Loader, toFloat, formatNumber} from "../utils/utils";
import {getPastEventsCached} from "../utils/cacheApi";
import {cachedContractCall} from "../utils/cachedContractCall";

// Известные параметры DAO. Name в контракте → { label, unit, formatter }.
// unit:
//   'percent'  — integer percent, показываем как `N%`
//   'seconds'  — integer seconds, показываем в человекочитаемом виде
//   'raw'      — сырое число без единицы
// Значения в `params` — uint256. Все известные параметры хранятся в единицах,
// перечисленных выше, без множителей 1e18 (это именно governance-параметры,
// не баланс токена).
const KNOWN_PARAMS = [
    {name: 'stabilizationFundPercent', label: 'Stabilization fund percent', unit: 'percent'},
    {name: 'collateralDiscount',       label: 'Collateral discount',       unit: 'percent'},
    {name: 'interestRate',             label: 'Interest rate (CDP)',       unit: 'percent'},
    {name: 'depositRate',              label: 'Deposit rate',              unit: 'percent'},
    {name: 'minAuctionPriceMove',      label: 'Min auction price move',    unit: 'percent'},
    {name: 'maxRuleEmissionPercent',   label: 'Max RLE emission',          unit: 'percent'},
    {name: 'auctionTurnDuration',      label: 'Auction turn duration',     unit: 'seconds'},
];

// Известные связанные контракты (ключи в mapping addresses).
const KNOWN_ADDRESSES = [
    {name: 'rule',     label: 'RLE (Rule token)'},
    {name: 'flatCoin', label: 'DFC (Dotflat coin)'},
    {name: 'cdp',      label: 'CDP'},
    {name: 'oracle',   label: 'Oracle'},
    {name: 'deposit',  label: 'Deposit'},
    {name: 'basket',   label: 'Basket'},
    {name: 'auction',  label: 'Auction'},
];

function formatSeconds(totalSeconds) {
    const s = Number(totalSeconds);
    if (!isFinite(s) || s <= 0) return '0s';
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (mins) parts.push(`${mins}m`);
    if (!parts.length) parts.push(`${s}s`);
    return `${formatNumber(s, 0)}s (${parts.join(' ')})`;
}

// SVG стрелка для expander — копирует паттерн ExchangeRateContract.
const Chevron = ({open}) => (
    <svg className={open ? 'rotate-180' : 'rotate-0'} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" style={{marginLeft: '10px', verticalAlign: 'middle'}}>
        <g fill="none" fillRule="evenodd" transform="translate(-446 -398)">
            <path fill="currentColor" fillRule="nonzero" d="M95.8838835,240.366117 C95.3957281,239.877961 94.6042719,239.877961 94.1161165,240.366117 C93.6279612,240.854272 93.6279612,241.645728 94.1161165,242.133883 L98.6161165,246.633883 C99.1042719,247.122039 99.8957281,247.122039 100.383883,246.633883 L104.883883,242.133883 C105.372039,241.645728 105.372039,240.854272 104.883883,240.366117 C104.395728,239.877961 103.604272,239.877961 103.116117,240.366117 L99.5,243.982233 L95.8838835,240.366117 Z" transform="translate(356.5 164.5)"></path>
            <polygon points="446 418 466 418 466 398 446 398"></polygon>
        </g>
    </svg>
);

export default class DAO extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            address:'', isActiveVoting:false, votingID:0, allowed:0, ruleBalanceOfDAO:0,
            totalPooled:0, userPooled:0,
            votingDiv:false, addVotingDiv:false, voteDiv:false, loader:false, amount:0,
            userDecision:false,
            addVoting: {votingType:'1',name:'name', value:0, decision:false},
            currentVoitng:[],
            loading: true,
            params: {},       // name → uint256 value
            addresses: {},    // name → address
            paramsOpen: false,
        };
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
            console.log('DAO: loading data via Block Watcher API...');

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

            // Читаем все известные параметры и адреса одним параллельным залпом.
            // Неизвестные / неподнятые воркером ноды вернут 0 или пустой адрес —
            // это нормально, просто не показываем их.
            const paramPromises = KNOWN_PARAMS.map(p =>
                cachedContractCall('dao', 'params', [p.name], contracts['dao'])
                    .then(value => [p.name, value])
                    .catch(err => {
                        console.warn(`DAO: failed to read param ${p.name}:`, err?.message);
                        return [p.name, null];
                    })
            );
            const addressPromises = KNOWN_ADDRESSES.map(a =>
                cachedContractCall('dao', 'addresses', [a.name], contracts['dao'])
                    .then(value => [a.name, value])
                    .catch(err => {
                        console.warn(`DAO: failed to read address ${a.name}:`, err?.message);
                        return [a.name, null];
                    })
            );

            const [paramEntries, addressEntries] = await Promise.all([
                Promise.all(paramPromises),
                Promise.all(addressPromises),
            ]);

            newState.params = Object.fromEntries(paramEntries);
            newState.addresses = Object.fromEntries(addressEntries);

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

            console.log(`DAO: total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('DAO: Failed to load data:', error);
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
                    cachedContractCall('dao', 'pooled', [this.props.account], this.props.contracts['dao'], { noCache: true }),
                    cachedContractCall('rule', 'allowance', [this.props.account, daoAddress], this.props.contracts['rule'], { noCache: true }),
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

    renderParamValue(def, rawValue) {
        if (rawValue === null || rawValue === undefined) return 'N/A';
        const num = toFloat(rawValue);
        if (!isFinite(num)) return 'N/A';
        switch (def.unit) {
            case 'percent':
                return `${formatNumber(num, 0)}%`;
            case 'seconds':
                return formatSeconds(num);
            default:
                return formatNumber(num, 0);
        }
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading DAO data...</div>;
        }

        const {explorer} = this.props;
        const {params, addresses} = this.state;
        const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

        return  <div align='left'>
            <div align='center'><b>DAO</b></div>
            {this.state.amount>0?<a className={"small-button pointer green right"} onClick={()=>this.allowRLE()}>allow Rule tokens</a>:''}
            <div>ruleBalanceOf DAO: <b>{formatNumber(toFloat(this.state.ruleBalanceOfDAO)/10**18, 2)} RLE</b></div>
            <div>Total pooled tokens: <b>{formatNumber(toFloat(this.state.totalPooled)/10**18, 2)} RLE</b></div>

            {this.state.allowed>0?<a className={"small-button pointer green right"} onClick={()=>this.poolRLE()}>pool tokens</a>:''}
            {this.props.account!=''?<div>Your allowed tokens: <b>{formatNumber(toFloat(this.state.allowed)/10**18, 2)} RLE</b></div>:''}
            {this.props.account!=''?<div>Your pooled tokens: <b>{formatNumber(toFloat(this.state.userPooled)/10**18, 2)} RLE</b></div>:''}

            {this.state.loader?<Loader/>:''}


            {this.state.userPooled>0?<a className={"small-button pointer green right"} onClick={()=>this.returnRLE()}>return tokens</a>:''}
            {this.props.account!=''?<input type='number' step="10000" min="0" name='amount' value={(this.state.amount/10**18).toFixed()} onChange={e => this.setState({amount:e.target.value*10**18})}/>:''}

            <div>is active voting: <b>{this.state.isActiveVoting?'true':'false'}</b></div>

            {
                this.props.account!=''?<a className={"small-button pointer orange right"} onClick={()=>this.props.contracts['dao'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>:''}
            <a className={'pointer link'} onClick={()=>this.toggle('votingDiv')}>{this.state.isActiveVoting?'current':'last'} voting</a>
            <div className={"collapsed" + (this.state.votingDiv ? ' in' : '')}>
                <div>votingID: <b>{this.state.votingID}</b></div>
                <div>totalPositive: <b>{formatNumber(toFloat(this.state.currentVoitng[0])/10**18, 2)}</b></div>
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

            {/* Contract parameters — все known params + addresses в collapsable виде */}
            <div style={{marginTop: '20px'}}>
                <div className="expander" onClick={() => this.toggle('paramsOpen')}>
                    <div className="bt-tile__title pointer">
                        Contract parameters
                        <Chevron open={this.state.paramsOpen}/>
                    </div>
                </div>
                <div className={"collapsed" + (this.state.paramsOpen ? ' in' : '')}>
                    <div style={{marginTop: '10px'}}>
                        <div style={{fontWeight: 'bold', marginTop: '10px', marginBottom: '6px'}}>Governance params</div>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                            <tbody>
                            {KNOWN_PARAMS.map(p => (
                                <tr key={p.name} style={{borderBottom: '1px solid #eee'}}>
                                    <td style={{padding: '6px 10px', color: '#555'}}>{p.label}</td>
                                    <td style={{padding: '6px 10px', color: '#888', fontFamily: 'monospace', fontSize: '12px'}}>{p.name}</td>
                                    <td style={{padding: '6px 10px', textAlign: 'right', fontWeight: 'bold'}}>
                                        {this.renderParamValue(p, params[p.name])}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <div style={{fontWeight: 'bold', marginTop: '16px', marginBottom: '6px'}}>Linked contracts</div>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                            <tbody>
                            {KNOWN_ADDRESSES.map(a => {
                                const addr = addresses[a.name];
                                const isEmpty = !addr || addr === ZERO_ADDR;
                                return (
                                    <tr key={a.name} style={{borderBottom: '1px solid #eee'}}>
                                        <td style={{padding: '6px 10px', color: '#555'}}>{a.label}</td>
                                        <td style={{padding: '6px 10px', color: '#888', fontFamily: 'monospace', fontSize: '12px'}}>{a.name}</td>
                                        <td style={{padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px'}}>
                                            {isEmpty
                                                ? <span style={{color: '#aaa'}}>N/A</span>
                                                : <a target='_blank' rel='noreferrer' href={explorer + 'address/' + addr}>{addr}</a>}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div style={{marginTop: '15px'}}>address: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code: <a target='_blank' rel='noreferrer' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>;
    }

}
