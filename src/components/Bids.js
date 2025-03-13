import React from "react";
import {dateFromTimestamp} from "../utils/utils";

export default class Bids extends React.Component{
    constructor(props) {
        super(props);
        this.state = {bestBid:false};
    }

    render() {
        let bids = (this.props.bids!==undefined)?this.props.bids.sort((a,b)=>(b.blockNumber - a.blockNumber)).map(bid =>
            <Bid auction={this.props.auction} nextBid={this.props.nextBid} web3={this.props.web3} emitter={this.props.emitter} bestBid={this.props.auction.bestBidID==bid.returnValues.bidID} bid={bid} key={bid.returnValues.bidID} account={this.props.account} contracts={this.props.contracts}/>):'';
        return <div> {bids} </div>
    }
}

class Bid extends React.Component{
    constructor(props) {
        super(props);
        this.state = {bestBid:false, yourBid:false,myBid:0,symbol:'', canceled:false};

    }

    componentDidMount() {
        this.setState({bestbid:this.props.auction.bestBidID==this.props.bid.returnValues.bidID});
        this.setState({yourBid:this.props.bid.returnValues.owner.toLowerCase()==this.props.account.toLowerCase()});
        this.setState({myBid:this.props.nextBid});
    }
    componentWillReceiveProps(nextProps, nextContext) {
        this.setState({myBid:this.props.nextBid});
        if (this.props.bid.bid!=undefined)
            this.setState({canceled:this.props.bid.bid.canceled})
    }

    improveBid(){
        this.props.contracts['auction'].methods.improveBid(this.props.bid.returnValues.bidID,
            this.props.web3.utils.toWei((this.state.myBid).toString())).send({from:this.props.account})
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

    changeMyBid(e){
        this.setState({myBid:e.target.value})
    }


    render(){
        return <div className="v-center row-container">
            <div className="product">
                <div className="bid">
                    <div>
                        id: {this.props.bid.returnValues.bidID} {this.state.bestbid?'Best bid':''}
                    </div>
                    <div>
                        {this.state.yourBid?'Your bid':''}
                    </div>
                    <div>
                        {this.state.canceled?'canceled':'active'}
                    </div>
                    <div>
                        {parseFloat(this.props.bid.returnValues.bidAmount/10**18).toFixed(2)}
                    </div>
                    <div>
                        {this.state.yourBid&&!this.state.canceled?<>
                            <div className={"row-container"}>
                                <div>
                                    <input type='number' name='amount' className='small-input' value={parseFloat(this.state.myBid).toFixed(2)} onChange={e => this.changeMyBid(e)}/></div>
                                <div>
                                    <a className={"small-button pointer green"} onClick={()=>this.improveBid()}>improve</a>
                                </div><
                            /div></>:''}
                    </div>
                    <div>
                        {this.state.yourBid&&!this.state.canceled&&!this.props.bestBid?<a className={"small-button pointer green"} onClick={()=>this.props.contracts['auction'].methods.cancelBid(this.props.bid.returnValues.bidID).send({from:this.props.account})}>cancel</a>:''}
                    </div>
                </div>
                <div className="small-text">{this.props.bid.block==undefined?'':dateFromTimestamp(this.props.bid.block.timestamp)}</div>
            </div>
        </div>
    }
}
