import React from "react";

export default class Swap extends React.Component{
    render() {
        return <div>
            <div><b>Buy stable coins</b><br/><br/>
                <b>Add list: </b> https://raw.githubusercontent.com/nagor2/cryptoFiat/Oracle/tokenList/list.json
                <br/>
                <br/>
            </div>
            <iframe  src="https://ipfs.io/ipfs/QmSCGpteEcfCDXcQunMyxbaAkBWB5edMFAWnzYXMCqaCKf/#/swap?outputCurrency=0x05e70011940cc4AfA46ef7c79BEf44E6348c702d"  height="900px"  width="100%" className='swap' />
        </div>;
    }
}