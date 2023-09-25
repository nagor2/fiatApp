import React from "react";
import Bids from "./Bids";
import {fromBlock} from "../utils/config"
import {Loader} from "../utils/utils"

export default class Auction extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            id: 0,
            allowanceToAuction: 0,
            auction: 0,
            payment: 0,
            stableBalance: 0,
            bestBid:0,
            nextBid:0,
            block:0,
            timeLeft:0,
            bids:[],
            a: true
        };
    }

    componentDidMount() {
        const { contracts } = this.props;
        this.setState({address:contracts['auction']._address});

        let bids = [];

        contracts['auction'].getPastEvents('newBid', {filter: { auctionID: this.props.id }, fromBlock: fromBlock}).then((res)=> {
            bids.push.apply(bids,res);
            //console.log(res);
            for (let i=0; i<res.length; i++) {
                this.props.web3.eth.getBlock(res[i].blockHash).then((b)=>{
                    res[i].block = b;
                    this.setState({a:true})
                    console.log(res[i].auctionID)
                });
                contracts['auction'].methods.bids(res[i].returnValues.bidId).call().then((bid)=>{
                    res[i].bid = bid;
                    this.setState({a:true})
                })
            }
            this.setState({bids:bids})
        })

        contracts['auction'].methods.auctions(this.props.id).call().then((auction)=>{
            this.setState({auction:auction});

            this.props.web3.eth.getBlock('latest').then((block)=>{
                this.setState({block:block})
                contracts['dao'].methods.params('auctionTurnDuration').call().then((auctionTurnDuration)=> {
                    this.setState({timeLeft:(auctionTurnDuration - (block.timestamp - auction.lastTimeUpdated))})
                });
            });

            if (auction.bestBidId!=0){
                contracts['auction'].methods.bids(auction.bestBidId).call().then((bestBid)=>{
                    this.setState({bestBid:bestBid})

                    contracts['dao'].methods.params('minAuctionPriceMove').call().then((minAuctionPriceMove)=> {
                        let nextBid = ((bestBid.bidAmount/100 * (100 - minAuctionPriceMove))/10**18).toFixed();
                        this.setState({nextBid:nextBid})
                    });

                });

            }
            else {
                contracts['rule'].methods.totalSupply().call().then((ruleSupply)=>{
                    contracts['dao'].methods.params('maxRuleEmissionPercent').call().then((maxRuleEmissionPercent)=> {
                        this.setState({nextBid:ruleSupply*maxRuleEmissionPercent/100/10**18});
                    });
                });

            }

            if (auction.lotToken== this.props.contracts['rule']._address)
                this.setState({payment:auction.paymentAmount});
        });

        if (this.props.account){
            contracts['stableCoin'].methods.allowance(this.props.account,contracts['auction']._address).call().then((result) => {
                this.setState({allowanceToAuction:result});
            });

            {this.props.contracts['stableCoin'].methods.balanceOf(this.props.account).call().then((result)=>{
                this.setState({stableBalance:result});
            })}
        }
    }

    allowStables(){
        this.props.contracts['stableCoin'].methods.approve(this.props.contracts['auction']._address,this.state.payment).send({from:this.props.account})
            .on('transactionHash', (hash) => {
                this.setState({'loader':true})
            })
            .on('receipt', (receipt) => {
                this.setState({'loader':true})
            })
            .on('confirmation', (confirmationNumber, receipt) => {
                this.setState({'loader':false})
                this.props.contracts['stableCoin'].methods.allowance(this.props.account, this.props.contracts['auction']._address).call().then((res)=>{
                    this.setState({allowanceToAuction:(res)})
                })
            })
            .on('error', console.error);

    }

    makeBid(){
        let bid = this.props.web3.utils.toWei((this.state.nextBid).toString());
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
        return  <div align='left'>
            <div align='center'><b>Auction {(this.state.auction.lotToken== this.props.contracts['rule']._address)?'TSC buyout':''} (id: {this.props.id})</b></div>
            {(this.state.timeLeft<=0)?<a className={"small-button pointer green right"} onClick={()=>this.finalize()}>claim to finalize</a>:<div className="small-button address right" alt={'you have to wait until you may claim to finalize auction'}>
                {'claim to finalize auction in '+Math.floor(this.state.timeLeft / 3600)+':'+Math.floor(this.state.timeLeft / 60)+':'+this.state.timeLeft % 60}</div>}

            <div>TSC buyout amount: {this.state.payment/10**18}</div>

            <div>your TSC allowance to auction: {this.state.allowanceToAuction/10**18}</div>

            {(this.state.stableBalance>=this.state.payment)?<a className={"small-button pointer green right"} onClick={()=>this.allowStables()}>Allow {this.state.auction.paymentAmount/10**18} TSC</a>:<div className="small-button address right">
                {'not enough TSC to participate in this auction'}</div>}
            <div>the amount of Rule you'll recieve: {this.state.nextBid}</div>

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            {(this.state.allowanceToAuction>=this.state.payment)?
                <a className={"small-button pointer green right"} onClick={()=>this.makeBid()}>Make a bid (get {this.state.nextBid} Rule for {this.state.auction.paymentAmount/10**18} TSC)</a>:
                <div className="small-button address right">{'insufficient allowance to bid'}</div>}
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>




            {this.state.loader?<Loader/>:''}

            <br/>
            {<a className={"small-button pointer orange left"} onClick={()=>this.props.contracts['auction'].methods.renewContracts().send({from:this.props.account})}>renew contracts</a>}
            <br/>
            <br/>
            <br/>
            <Bids web3={this.props.web3} emitter={this.props.emitter} auction={this.state.auction} bids={this.state.bids} account={this.props.account} contracts={this.props.contracts}/>

        </div>;
    }
}