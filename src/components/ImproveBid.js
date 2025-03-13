import React from "react";

export default class ImproveBid extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            amount: 0,
            newAmount:0,
            paymentToken:''
        }
    }

    componentDidMount() {
        const { contracts } = this.props;

    }

    render() {
        return  <div align='left'>
            <div align='center'><b>Improve bid (id: {this.props.bid.returnValues.bidID})</b></div>

            <div>Bid amount: {this.props.bid.returnValues.bidAmount/10**18}</div>

            <div>Your {this.state.paymentToken} allowance to auction: {this.state.allowanceToAuction/10**18}</div>

        </div>;
    }
}
