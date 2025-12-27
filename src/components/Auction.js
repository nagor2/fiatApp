import React from "react";
import Bids from "./Bids";
import {fromBlock} from "../utils/config"
import {Loader} from "../utils/utils"
/* global BigInt */

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
            lot:''
        };
    }

    componentDidMount() {
        const { contracts } = this.props;
        let bids = [];
        contracts['auction'].getPastEvents('newBid', {filter: {auctionID:this.props.id}, fromBlock: fromBlock}).then((res)=> {
            res = res.sort((a,b)=>(b.blockNumber - a.blockNumber));
            for (let i=0; i<res.length; i++) {
                if (!bids.find(e=>e.returnValues.bidID==res[i].returnValues.bidID)){
                    bids.push(res[i])
                    this.props.web3.eth.getBlock(res[i].blockHash).then((b) => {
                        res[i].block = b;
                        this.setState({a: true})
                        //console.log(res[i].returnValues.auctionID)
                    });
                    contracts['auction'].methods.bids(res[i].returnValues.bidID).call().then((bid) => {
                        res[i].bid = bid;
                        this.setState({a: true})
                    })
                }
            }
            this.setState({bids:bids})
            this.setState({address:contracts['auction']._address});
        })

        contracts['auction'].methods.auctions(this.props.id).call().then((auction)=>{
            this.setState({auction:auction});

            let paymentContract = (auction.paymentToken==this.props.contracts['flatCoin']._address)?this.props.contracts['flatCoin']:this.props.contracts['rule'];
            this.setState({paymentTokenContract: paymentContract})


            try{          paymentContract.methods.allowance(this.props.account,contracts['auction']._address).call().then((result) => {
                this.setState({allowanceToAuction:result});


                paymentContract.methods.balanceOf(this.props.account).call().then((result)=>{
                    this.setState({paymentBalance:result});
                });
            });
            }catch (e) {
                
            }





            switch (auction.lotToken){
                case this.props.contracts['rule']._address: this.setState({lot:'Rule', type:'DFC', move:-1, paymentToken: 'DFC'});break;
                case this.props.contracts['flatCoin']._address: this.setState({lot:'DFC', type:'Rule', move:1,  paymentToken: 'Rule'}); break;
                case this.props.contracts['weth']._address: this.setState({lot: 'WETH', type:'DFC', move:1, paymentToken: 'DFC'}); break;
            }

            this.props.web3.eth.getBlock('latest').then((block)=>{
                this.setState({block:block})
                contracts['dao'].methods.params('auctionTurnDuration').call().then((auctionTurnDuration)=> {
                    this.setState({timeLeft:(auctionTurnDuration - (block.timestamp - auction.lastTimeUpdated))})
                });
            });
            if (auction.bestBidID!=0){
                contracts['auction'].methods.bids(auction.bestBidID).call().then((bestBid)=>{
                    this.setState({bestBid:bestBid})
                    contracts['dao'].methods.params('minAuctionPriceMove').call().then((minAuctionPriceMove)=> {

                        //console.log("minAuctionPriceMove: "+minAuctionPriceMove);
                        //console.log("bestBid.bidAmount: "+parseFloat(bestBid.bidAmount)/10**18);
                        let nextBid = parseFloat(bestBid.bidAmount)/10**18 * (100 + this.state.move*parseFloat(minAuctionPriceMove))/100;
                        this.setState({nextBid:nextBid})
                        //console.log('nextBid:'+this.state.nextBid);
                    });
                });
            }
            else {
                switch (auction.lotToken){
                    case this.props.contracts['rule']._address:
                        contracts['rule'].methods.totalSupply().call().then((ruleSupply)=>{
                        contracts['dao'].methods.params('maxRuleEmissionPercent').call().then((maxRuleEmissionPercent)=> {
                            this.setState({nextBid:ruleSupply*maxRuleEmissionPercent/100/10**18-1});
                        });
                    }); break;
                    case this.props.contracts['flatCoin']._address: this.setState({nextBid:0.1}); break;
                    case this.props.contracts['weth']._address: this.setState({nextBid:0.1}); break;
                }
            }

        });


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
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.state.paymentTokenContract.methods.allowance(this.props.account, this.props.contracts['auction']._address).call().then((res)=>{
                    this.setState({allowanceToAuction:(res)})
                })
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