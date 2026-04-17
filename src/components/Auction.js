import React from "react";
import Bids from "./Bids";
import {fromBlock} from "../utils/config"
import {Loader, toFloat} from "../utils/utils"
import {getPastEventsCached} from "../utils/cacheApi";
import config from "../utils/config";
/* global BigInt */

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class Auction extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            id: 0,
            toAllow:0,
            allowanceToAuction: 0,
            auction: 0,
            paymentToken: '',
            paymentBalance: 0,
            bestBid:0,
            nextBid:0,
            paymentTokenContract:'',
            block:0,
            timeLeft:0,
            bids:[],
            move:1,
            a: true,
            type:'',
            lot:'',
            loading: true
        };
    }

    async loadData() {
        const { contracts, web3 } = this.props;
        
        if (!contracts || !contracts['auction'] || !contracts['dao'] || !contracts['flatCoin'] || !contracts['rule']) {
            console.warn('Auction: contracts not initialized yet, waiting...');
            // Не меняем loading state - оставляем пока контракты не загрузятся
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log(`🔄 Auction: Loading auction ${this.props.id} via Block Watcher API...`);

            const auctionRes = await fetch(`${BLOCK_WATCHER_API}/api/call/auction/auctions?args=[${this.props.id}]`);
            const auctionData = await auctionRes.json();
            const auction = auctionData.result;

            this.setState({auction: auction, address: contracts['auction']._address});

            let paymentContract = (auction.paymentToken==contracts['flatCoin']._address)?contracts['flatCoin']:contracts['rule'];
            const paymentContractName = (auction.paymentToken==contracts['flatCoin']._address)?'flatCoin':'rule';
            this.setState({paymentTokenContract: paymentContract})

            const auctionAddress = contracts['auction']._address;
            
            try {
                const [allowanceRes, balanceRes] = await Promise.all([
                    fetch(`${BLOCK_WATCHER_API}/api/call/${paymentContractName}/allowance?args=["${this.props.account}","${auctionAddress}"]`),
                    fetch(`${BLOCK_WATCHER_API}/api/call/${paymentContractName}/balanceOf?args=["${this.props.account}"]`)
                ]);

                const [allowanceData, balanceData] = await Promise.all([
                    allowanceRes.json(),
                    balanceRes.json()
                ]);

                this.setState({
                    allowanceToAuction: allowanceData.result,
                    paymentBalance: balanceData.result
                });
            } catch (e) {
                console.error('Failed to load payment token data:', e);
            }

            switch (auction.lotToken){
                case contracts['rule']._address: this.setState({lot:'Rule', type:'DFC', move:-1, paymentToken: 'DFC'});break;
                case contracts['flatCoin']._address: this.setState({lot:'DFC', type:'Rule', move:1,  paymentToken: 'Rule'}); break;
                case contracts['weth']._address: this.setState({lot: 'WETH', type:'DFC', move:1, paymentToken: 'DFC'}); break;
            }

            const block = await web3.eth.getBlock('latest');
            const durationRes = await fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["auctionTurnDuration"]`);
            const durationData = await durationRes.json();
            const auctionTurnDuration = durationData.result;
            
            this.setState({
                block: block,
                timeLeft: (auctionTurnDuration - (block.timestamp - auction.lastTimeUpdated))
            });

            if (auction.bestBidID!=0){
                const bestBidRes = await fetch(`${BLOCK_WATCHER_API}/api/call/auction/bids?args=[${auction.bestBidID}]`);
                const bestBidData = await bestBidRes.json();
                const bestBid = bestBidData.result;
                
                this.setState({bestBid: bestBid})
                
                const minMoveRes = await fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["minAuctionPriceMove"]`);
                const minMoveData = await minMoveRes.json();
                const minAuctionPriceMove = minMoveData.result;
                
                let nextBid = toFloat(bestBid.bidAmount)/10**18 * (100 + this.state.move*toFloat(minAuctionPriceMove))/100;
                this.setState({nextBid:nextBid})
            }
            else {
                switch (auction.lotToken){
                    case contracts['rule']._address:
                        const [supplyRes, maxEmissionRes] = await Promise.all([
                            fetch(`${BLOCK_WATCHER_API}/api/call/rule/totalSupply`),
                            fetch(`${BLOCK_WATCHER_API}/api/call/dao/params?args=["maxRuleEmissionPercent"]`)
                        ]);
                        const [supplyData, maxEmissionData] = await Promise.all([
                            supplyRes.json(),
                            maxEmissionRes.json()
                        ]);
                        this.setState({nextBid:supplyData.result*maxEmissionData.result/100/10**18-1});
                        break;
                    case contracts['flatCoin']._address: this.setState({nextBid:0.1}); break;
                    case contracts['weth']._address: this.setState({nextBid:0.1}); break;
                }
            }

            const events = await getPastEventsCached(
                contracts['auction'],
                'newBid',
                {filter: {auctionID:this.props.id}, fromBlock: fromBlock},
                web3
            );
            
            const sortedEvents = events.sort((a,b)=>(b.blockNumber - a.blockNumber));
            const bids = [];
            
            for (let i=0; i<sortedEvents.length; i++) {
                if (!bids.find(e=>e.returnValues.bidID==sortedEvents[i].returnValues.bidID)){
                    const event = sortedEvents[i];
                    bids.push(event)
                    
                    const [blockData, bidRes] = await Promise.all([
                        web3.eth.getBlock(event.blockHash),
                        fetch(`${BLOCK_WATCHER_API}/api/call/auction/bids?args=[${event.returnValues.bidID}]`)
                    ]);
                    
                    const bidData = await bidRes.json();
                    event.block = blockData;
                    event.bid = bidData.result;
                }
            }
            
            this.setState({bids: bids, loading: false});

            console.log(`✅ Auction: Auction ${this.props.id} loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error(`❌ Auction: Failed to load auction ${this.props.id}:`, error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.id !== this.props.id || (!prevProps.contracts?.auction && this.props.contracts?.auction)) {
            console.log('Auction: Props changed, reloading data...');
            this.loadData();
        }
    }

    allowPayment(){
        //let payment = parseInt(this.state.auction.paymentAmount)>0?this.state.auction.paymentAmount:this.state.nextBid*10**18;

        this.state.paymentTokenContract.methods.approve(this.props.contracts['auction']._address,(parseFloat(this.state.toAllow)*10**18).toString()).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', async (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                const paymentContractName = (this.state.auction.paymentToken==this.props.contracts['flatCoin']._address)?'flatCoin':'rule';
                const auctionAddress = this.props.contracts['auction']._address;
                const allowanceRes = await fetch(`${BLOCK_WATCHER_API}/api/call/${paymentContractName}/allowance?args=["${this.props.account}","${auctionAddress}"]`);
                const allowanceData = await allowanceRes.json();
                this.setState({allowanceToAuction:(allowanceData.result)});
            })
            .on('error', console.error);
    }

    makeBid(){
        console.log(this.state.allowanceToAuction);
        let bid =this.state.allowanceToAuction;
        this.props.contracts['auction'].methods.makeBid(this.props.id,bid).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                //TODO: change bids
            })
            .on('error', console.error);

    }

    finalize(){
        this.props.contracts['auction'].methods.claimToFinalizeAuction(this.props.id).send({from:this.props.account})
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

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading auction data...</div>;
        }

        return <div align='left'>
            <div align='center'><b>Auction ({this.state.type} buyout) (id: {this.props.id})</b></div>
            {(this.state.timeLeft <= 0) ?
                <a className={"small-button pointer green right"} onClick={() => this.finalize()}>claim to
                    finalize</a> : <div className="small-button address right"
                                        alt={'you have to wait until you may claim to finalize auction'}>
                    {'claim to finalize auction in ' + Math.floor(this.state.timeLeft / 3600) + ':' + Math.floor(this.state.timeLeft / 60) + ':' + this.state.timeLeft % 60}</div>}

            <div>the amount of {this.state.lot} you'll
                recieve: {this.state.auction.lotToken == this.props.contracts['rule']._address ? this.state.nextBid : parseFloat(this.state.auction.lotAmount) / 10 ** 18}</div>


            <div>your {this.state.paymentToken} allowance to
                auction: {parseFloat(this.state.allowanceToAuction) / 10 ** 18}</div>
            <div>next bid: {this.state.nextBid} </div>
            <div>your {this.state.paymentToken} balance: {parseFloat(this.state.paymentBalance) / 10 ** 18}, is enough
                to bid: {(this.state.paymentBalance >= this.state.nextBid ? "true" : "false")}</div>

            <input type='number' step="0.1" min={this.state.nextBid} max="10000" name='allowance'
                   onChange={e => this.setState({toAllow:e.target.value})}/>
            <a className={"small-button pointer green right"}
               onClick={() => this.allowPayment()}>Allow {parseFloat(this.state.toAllow)} {this.state.paymentToken}</a>


        <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>




            {(this.state.allowanceToAuction >= this.state.nextBid) ?
                <a className={"small-button pointer green right"} onClick={() => this.makeBid()}>Make a bid
                    ({this.state.type == 'Rule' ? 'pay' : 'get'} {parseFloat(this.state.allowanceToAuction) / 10 ** 18} {this.state.auction.paymentAmount > 0 ? this.state.lot : this.state.paymentToken} for {this.state.auction.paymentAmount > 0 ? parseFloat(this.state.auction.paymentAmount / 10 ** 18).toFixed(2) : parseFloat(this.state.auction.lotAmount) / 10 ** 18} {this.state.auction.paymentAmount > 0 ? this.state.paymentToken : this.state.lot})</a> :
                <div className="small-button address right">{'insufficient allowance to bid'}</div>}

            {this.state.loader ? <Loader/> : ''}

            <br/>
            {<a className={"small-button pointer orange left"}
                onClick={() => this.props.contracts['auction'].methods.renewContracts().send({from: this.props.account})}>renew
                contracts</a>}
            <br/>
            <br/>
            <br/>
            <Bids web3={this.props.web3} emitter={this.props.emitter} auction={this.state.auction}
                  nextBid={this.state.nextBid} bids={this.state.bids} account={this.props.account}
                  contracts={this.props.contracts}/>

        </div>;
    }
}