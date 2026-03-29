import React from "react";
import {dateFromTimestamp, toFloat} from "../utils/utils";
import Button from "./Button";
import CDP from "./CDP";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class DebtPosition extends React.Component{
    constructor(props){

        super(props);
        this.state={
            id:0,
            fee:0,
            maxStableCoinsToMint: 0,
            timeOpened:0,
            lastTimeUpdated:0,
            coinsMinted: 0,
            ethLocked:0,
            feeGeneratedRecorded:0,
            interestRate:0,
            liquidationStatus:0,
            loading: true
        };
//TODO: implement and test
        this.closeCDP = this.closeCDP.bind(this);
        this.updateCDP = this.updateCDP.bind(this);
        this.withdraw = this.withdraw.bind(this);
        this.payInterest = this.payInterest.bind(this);
    }

    async loadData() {
        const { contracts, web3 } = this.props;
        
        if (!contracts || !contracts['cdp'] || !contracts['dao']) {
            console.warn('DebtPosition: contracts not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log(`🔄 DebtPosition: Loading position ${this.props.id} via Block Watcher API...`);

            const [positionRes, feeRes, interestRes] = await Promise.all([
                fetch(`${BLOCK_WATCHER_API}/api/call/cdp/positions?args=[${this.props.id}]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/cdp/totalCurrentFee?args=[${this.props.id}]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["interestRate"]`)
            ]);

            const [positionData, feeData, interestData] = await Promise.all([
                positionRes.json(),
                feeRes.json(),
                interestRes.json()
            ]);

            const position = positionData.result;

            const maxCoinsRes = await fetch(`${BLOCK_WATCHER_API}/api/call/cdp/getMaxFlatCoinsToMintForPos?args=[${this.props.id}]`);
            const maxCoinsData = await maxCoinsRes.json();

            this.setState({
                position: position,
                liquidationStatus: position.liquidationStatus,
                timeOpened: dateFromTimestamp(position.timeOpened),
                lastTimeUpdated: dateFromTimestamp(position.lastTimeUpdated),
                coinsMinted: toFloat(position.coinsMinted)/10**18,
                ethLocked: web3.utils.fromWei(position.ethAmountLocked,'ether'),
                feeGeneratedRecorded: web3.utils.fromWei(position.interestAmountRecorded,'ether'),
                maxStableCoinsToMint: toFloat(maxCoinsData.result)/10**18,
                fee: toFloat(feeData.result)/10**18,
                interestRate: interestData.result,
                loading: false
            });

            console.log(`✅ DebtPosition: Position ${this.props.id} loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error(`❌ DebtPosition: Failed to load position ${this.props.id}:`, error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    static getDerivedStateFromProps(props, state) {
        // Store prevId in state so we can compare when props change.
        // Clear out previously-loaded data (so we don't render stale stuff).
        if (props.id !== state.prevId) {
            return {
                externalData: null,
                prevId: props.id,
            };
        }
        // No state update necessary
        return null;
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.id !== this.props.id || (!prevProps.contracts?.cdp && this.props.contracts?.cdp)) {
            console.log('DebtPosition: Props changed, reloading data...');
            this.loadData();
        }
    }

    closeCDP(){

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
        if (this.state.loading) {
            return <div align='center'>Loading position data...</div>;
        }

        return  <div align='left'>
            <div align='center'><b>Debt position (id: {this.props.id})</b></div>
            <Button emitter={this.props.emitter} action={'payInterest'} id={this.props.id} name={"payInterest"} item={this.state.position}/>
            <div>opened: <b>{this.state.timeOpened}</b></div>
            <div>updated: <b>{this.state.lastTimeUpdated}</b></div>
            <div>coinsMinted (red/yellow/green): <b>{this.state.coinsMinted}</b></div>
            <Button emitter={this.props.emitter} action={'updateCDP'} id={this.props.id} name={"Update position"} item={this.state.position}/>
            <div>interest rate: <b>{this.state.interestRate}%</b></div>
            <div>ethereum locked: <b>{this.state.ethLocked}</b></div>
            <div>maxCoinsToMint : <b>{this.state.maxStableCoinsToMint}</b></div>
            <Button emitter={this.props.emitter} action={'closeCDP'} id={this.props.id} name={"Close position"} item={this.state.position}/>
            <div>recorded fee: <b>{this.state.feeGeneratedRecorded}</b></div>
            <div>accumulated interest: <b>{this.state.fee}</b></div>
            <div>liquidationStatus: <b>{this.state.liquidationStatus}</b></div>
            <br/>
            <Button emitter={this.props.emitter} action={'withdrawEther'} id={this.props.id} name={"withdraw ether"} item={this.state.position}/>

            <br/><br/><br/><br/><br/>


        </div>;
    }
}
