import React from "react";

export default class ConnectButton extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            loading: false
        };
    }

    handleClick = async () => {
        // Повторный клик по "connecting..." разблокирует кнопку — страховка
        // на случай, если промис подключения по какой-то причине завис
        // (закрытая модалка, сетевой сбой и т.п.). Саму сессию WalletConnect
        // это не трогает, только состояние UI.
        if (this.state.loading) {
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        try {
            await this.props.getAccount();
        } catch (error) {
            console.error('Connection error:', error);
        } finally {
            this.setState({ loading: false });
        }
    }

    render() {
        const { loading } = this.state;
        const displayName = loading ? 'connecting...' : this.props.name;
        
        return (
            <a 
                className={`button pointer green right ${loading ? 'disabled' : ''}`} 
                onClick={this.handleClick}
                style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
                {displayName}
            </a>
        );
    }
}
