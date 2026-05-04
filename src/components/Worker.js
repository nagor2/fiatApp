import React from "react";

export default class Worker extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            health: null,
            loading: true,
            error: null
        };
    }

    componentDidMount() {
        this.fetchHealth();
        this.interval = setInterval(() => this.fetchHealth(), 10000);
    }

    componentWillUnmount() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    async fetchHealth() {
        if (this._healthInFlight) return;
        this._healthInFlight = true;
        try {
            const response = await fetch(this.props.healthUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            this.setState({
                health: data,
                error: null,
                loading: false
            });
        } catch (err) {
            this.setState({
                error: err.message,
                health: null,
                loading: false
            });
        } finally {
            this._healthInFlight = false;
        }
    }

    renderIcon() {
        return <img src={this.props.icon} alt={this.props.title} style={{ width: '36px', height: '36px' }} />;
    }

    handleClick = () => {
        if (this.props.onClick) {
            this.props.onClick();
        }
    }

    render() {
        const { title, name } = this.props;
        const { health, loading, error } = this.state;
        const isHealthy = health && health.status === 'healthy';

        return (
            <div 
                className="product bt-tile__title" 
                onClick={this.handleClick}
                style={{ cursor: this.props.onClick ? 'pointer' : 'default' }}
            >
                <div className="v-center row-container">
                    {this.renderIcon()}
                    <div className="product">
                        <div className="products-name">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {title}
                                <div
                                    title={health ? JSON.stringify(health, null, 2) : error || 'Loading...'}
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: loading ? '#999' : error ? '#dc3545' : isHealthy ? '#28a745' : '#ffc107',
                                        border: '1px solid #ccc',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                            </div>
                            <div>
                                {health && health.uptime ? `${Math.floor(health.uptime / 60000)}m` : ''}
                            </div>
                        </div>
                        <div className="small-text">{name}</div>
                    </div>
                </div>
            </div>
        );
    }
}
