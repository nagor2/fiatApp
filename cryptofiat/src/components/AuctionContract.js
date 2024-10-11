import React from "react";

export default class AuctionContract extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', auctionNum:'', bidsNum:'', ruleBuyOut:''}
    }

    componentDidMount() {
        const { contracts } = this.props;

        contracts['auction'].methods.auctionNum().call().then((result)=>{
            this.setState({auctionNum: result});
        });

        contracts['auction'].methods.bidsNum().call().then((result)=>{
            this.setState({bidsNum: result});
        });

        this.setState({address: contracts['auction']._address});
    }

    render() {
        return <div align='center'><b>Auction contract</b><div/>
        <div align='left'>
            <div>auctionNum:         <b>{this.state.auctionNum}</b></div>

            <div>bidsNum: <b>{this.state.bidsNum}</b></div>


            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>
            </div>
    }
}