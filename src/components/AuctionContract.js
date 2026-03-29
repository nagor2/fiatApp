import React from "react";
import config from "../utils/config";

const BLOCK_WATCHER_API = (config.workersHealthUrl || 'http://localhost:3002/health').replace('/health', '');

export default class AuctionContract extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', auctionNum:'', bidsNum:'', ruleBuyOut:'', loading: true}
    }

    async loadData() {
        const { contracts } = this.props;
        
        if (!contracts || !contracts['auction']) {
            console.warn('AuctionContract: contract not initialized yet');
            this.setState({ loading: false });
            return;
        }

        this.setState({ loading: true });
        const startTime = performance.now();

        try {
            console.log('🔄 AuctionContract: Starting data load via Block Watcher API...');

            const [auctionNumRes, bidsNumRes] = await Promise.all([
                fetch(`${BLOCK_WATCHER_API}/api/call/auction/auctionNum`),
                fetch(`${BLOCK_WATCHER_API}/api/call/auction/bidsNum`)
            ]);

            const [auctionNumData, bidsNumData] = await Promise.all([
                auctionNumRes.json(),
                bidsNumRes.json()
            ]);

            this.setState({
                auctionNum: auctionNumData.result,
                bidsNum: bidsNumData.result,
                address: contracts['auction']._address,
                loading: false
            });

            console.log(`✅ AuctionContract: Total load time: ${(performance.now() - startTime).toFixed(0)}ms`);
        } catch (error) {
            console.error('❌ AuctionContract: Failed to load data:', error);
            this.setState({ loading: false });
        }
    }

    componentDidMount() {
        this.loadData();
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.contracts?.auction && this.props.contracts?.auction) {
            console.log('AuctionContract: Contracts initialized, loading data...');
            this.loadData();
        }
    }

    render() {
        if (this.state.loading) {
            return <div align='center'>Loading auction data...</div>;
        }

        return <div align='center'><b>Auction contract</b><div/>
        <div align='left'>
            <div>auctionNum:         <b>{this.state.auctionNum}</b></div>

            <div>bidsNum: <b>{this.state.bidsNum}</b></div>


            <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
            <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
        </div>
            </div>
    }
}