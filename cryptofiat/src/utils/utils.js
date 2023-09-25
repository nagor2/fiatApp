import React from "react";

export function dateFromTimestamp(timeStamp){
    const d = new Date(timeStamp * 1000);
    return ("0" + d.getDate()).slice(-2) + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" +
        d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) +":"+ ("0" + d.getSeconds()).slice(-2);
}

export class Loader extends React.Component{
    render(){
        return <div><img className={'loader abs-centered'} src='img/loading.png' width={'50'} height={'50'}/></div>;
    }
}


export class Address extends React.Component {
    render() {
        return <div className="button address right">
            {this.props.account.slice(0, 6) +
            '...' +this.props.account.slice(-4)}
        </div>;
    }
}

export class ETC extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        return <div className="button address left">
            {'ETC price: '+this.props.etcPrice}
        </div>;
    }
}