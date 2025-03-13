import React from "react";
import Web3 from "web3";

export default class ConnectButton extends React.Component{
    constructor(props){
        super(props);
    }



    async handleStateChange() {
        if (window.ethereum){
            try{
                console.log('requested accounts')
                window.ethereum.request({ method: 'eth_requestAccounts' }, (accounts) => {
                    console.log('accounts received')
                    console.log(accounts)

                    if (accounts.length > 0) {
                        console.log(accounts[0])
                        this.setState({account:accounts[0], walletConnected: true})
                    }
                });

                window.ethereum.on("accountsChanged", (accounts) => {
                    if (accounts.length > 0) {
                        console.log('accounts received')
                        console.log(accounts)

                        this.setState({account:accounts[0], walletConnected: true})
                    }
                    else {
                        this.setState({account:'', walletConnected:false})
                    }
                })

            } catch (e){console.log(e)}


        }


        /*const web3 = new Web3(Web3.givenProvider);
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
        }*/
    }

    render() {
        return <a className={"button pointer green right"} onClick={this.props.getAccount}>{this.props.name}</a>;
    }
}
