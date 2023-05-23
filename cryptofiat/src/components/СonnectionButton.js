import React from "react";
import Web3 from "web3";

class ConnectButton extends React.Component{
    constructor(props){
        super(props);
    }

    async handleStateChange() {
        const web3 = new Web3(Web3.givenProvider);
        if(typeof web3 !=='undefined'){
            const wConnected = await web3.eth.net.isListening();
            if (wConnected){
                const accounts = await web3.eth.requestAccounts();
                this.props.handleStateChange({
                    walletConnected: wConnected
                });
                if (accounts.length>0) {
                    this.props.handleStateChange({
                        account: accounts[0]
                    });
                }
            }
        }
    }

    render() {
        return <a className={"button pointer green right"} onClick={()=>this.handleStateChange()}>{this.props.name}</a>;
    }
}

export default ConnectButton;