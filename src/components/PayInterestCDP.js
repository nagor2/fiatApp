import React from "react";
import {Loader, toFloat} from "../utils/utils";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class PayInterestCDP extends React.Component{
    constructor(props) {
        super(props);
        this.state = {debt:0, days: 0, allowance:0, needed:0, loader:false, fee:0}
        //console.log(this.props.position)
        this.allow=this.allow.bind(this);
        this.payInterest=this.payInterest.bind(this);
    }

    allow(){
        const {contracts} = this.props;
        contracts['flatCoin'].methods.approve(contracts['cdp']._address,(toFloat(this.state.needed)*10**18)
            .toString()).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false});
                //window.location.reload();
            })
            .on('error', console.error)
            .catch(e=>console.error);
    }

    payInterest(){
        this.props.contracts['cdp'].methods.transferInterest(this.props.id).send({from:this.props.account})
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

    async loadData() {
        const {contracts} = this.props;
        
        if (!contracts || !contracts['cdp'] || !contracts['flatCoin']) {
            console.warn('PayInterestCDP: contracts not initialized yet');
            return;
        }

        try {
            const cdpAddress = contracts['cdp']._address;

            const [feeRes, allowanceRes] = await Promise.all([
                fetch(`${BLOCK_WATCHER_API}/api/call/cdp/totalCurrentFee?args=[${this.props.id}]`),
                fetch(`${BLOCK_WATCHER_API}/api/call/flatCoin/allowance?args=["${this.props.account}","${cdpAddress}"]`)
            ]);

            const [feeData, allowanceData] = await Promise.all([
                feeRes.json(),
                allowanceRes.json()
            ]);

            const fee = toFloat(feeData.result)/10**18;

            this.setState({
                fee: fee,
                needed: fee*1.001,
                allowance: toFloat(allowanceData.result)/10**18
            });
        } catch (error) {
            console.error('❌ PayInterestCDP: Failed to load data:', error);
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.id !== this.props.id || (!prevProps.contracts?.cdp && this.props.contracts?.cdp)) {
            this.loadData();
        }
    }

    render (){
        return <><div><b>Pay interest for loan #{this.props.id}</b></div>
            <div align='left'>
                <div>DFC minted:         <b>{toFloat(this.props.position.coinsMinted)/10**18} DFC</b></div>
                <div>your allowance to CPD:         <b>{this.state.allowance} DFC</b></div>
                <div>your fee to pay:         <b>{this.state.fee} DFC</b></div>
                <div>you have to allow:         <b>~{this.state.needed} DFC</b></div>
                <a className={"button pointer green left"} onClick={this.allow}>Allow needed amount</a>
                {this.state.allowance>this.state.fee?<a className={"button pointer green right"} onClick={this.payInterest}>Pay Interest</a>:<div className="button address right">
                    {'Insufficient allowance to pay interest'}</div>}
                <br/><br/><br/><br/>
                {this.state.loader?<Loader/>:''}
            </div></>
    }


}
