import React from "react";
import {dateFromTimestamp} from "../utils/utils";

export default class Bids extends React.Component{
    constructor(props) {
        super(props);
        this.state = {bestBid:false};
    }

    render() {
        let bids = (this.props.bids!==undefined)?this.props.bids.sort((a,b)=>(b.blockNumber - a.blockNumber)).map(bid =>
            <Bid auction={this.props.auction} web3={this.props.web3} emitter={this.props.emitter} bestBid={this.props.auction.bestBidID==bid.returnValues.bidID} bid={bid} key={bid.returnValues.bidID} account={this.props.account} contracts={this.props.contracts}/>):'';
        return <div> {bids} </div>
    }
}

class Bid extends React.Component{
    constructor(props) {
        super(props);
        this.state = {bestBid:false, yourBid:false, symbol:'', canceled:false};

    }

    componentDidMount() {
        this.setState({bestbid:this.props.auction.bestBidID==this.props.bid.returnValues.bidID});
        this.setState({yourBid:this.props.bid.returnValues.owner.toLowerCase()==this.props.account.toLowerCase()});

    }
    componentWillReceiveProps(nextProps, nextContext) {
        if (this.props.bid.bid!=undefined)
            this.setState({canceled:this.props.bid.bid.canceled})
    }

    render(){
        return <div className="v-center row-container">
            <div className="product">
                <div className="products-name">
                    <div>
                        {this.state.bestbid?'Best bid':''}
                    </div>
                    <div>
                        {this.state.yourBid?'Your bid':''}
                    </div>
                    <div>
                        {this.state.canceled?'canceled':'active'}
                    </div>
                    <div>
                        {this.props.web3.utils.fromWei(this.props.bid.returnValues.bidAmount)}
                    </div>
                    <div>
                        {this.state.yourBid&&!this.state.canceled?<a className={"small-button pointer green"} onClick={()=>this.props.emitter.emit('change-state', [this.props.bid,'improveBid',this.props.bid.returnValues.bidID])}>improve bid</a>:''}
                    </div>
                    <div>
                        {this.state.yourBid&&!this.state.canceled&&!this.props.bestBid?<a className={"small-button pointer green"} onClick={()=>this.props.contracts['auction'].methods.cancelBid(this.props.bid.returnValues.bidID).send({from:this.props.account})}>cancel bid</a>:''}
                    </div>
                </div>
                <div className="small-text">{this.props.bid.block==undefined?'':dateFromTimestamp(this.props.bid.block.timestamp)}</div>
            </div>
        </div>
    }
}
