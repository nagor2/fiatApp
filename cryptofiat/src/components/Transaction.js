import React from "react";
import config from "../utils/config";

export default class Transaction extends React.Component{
    render(){
        return <a target='_blank' href={config.explorer+'/tx/'+this.props.tx}><div>{this.props.tx}</div></a>
    }
}
