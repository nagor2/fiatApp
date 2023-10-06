import React from "react";

export default class Transaction extends React.Component{
    render(){
        return <a target='_blank' href={'https://blockscout.com/etc/mainnet/tx/'+this.props.tx}><div>{this.props.tx}</div></a>
    }
}
