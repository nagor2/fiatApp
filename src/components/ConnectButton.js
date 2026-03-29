import React from "react";

export default class ConnectButton extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            loading: false
        };
    }

    handleClick = async () => {
        if (this.state.loading) return;
        
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
