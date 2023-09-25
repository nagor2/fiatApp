import React from "react";

export default class Button extends React.Component{
    constructor(props){
        super(props);
    }

    render() {
        return <a className={"button pointer green right"} onClick={()=>this.props.emitter.emit('change-state', [this.props.item,this.props.action,this.props.id])}>{this.props.name}</a>;
    }
}