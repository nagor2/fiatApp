import React from "react";

export default class AuctionContract extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:''}
    }

    componentDidMount() {

    }

    render() {
        return <div align='left'><b>Rule token</b>
            <div>total supply:         <b>{this.state.supply}</b></div>

            <div>N of transactions (iterate transfers): <b>{this.state.transfers}</b></div>

            <div>N of holders: <b>{this.state.holders}</b></div>

            <div>price in stableCoins (from pool):</div>

            <div>marketCap:</div>

            <div>pool volume:</div>

            <div>address:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={'https://blockscout.com/etc/mainnet/address/'+this.state.address+'/contracts#address-tabs'}>view code</a></div>

        </div>
    }
}