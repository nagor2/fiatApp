import React from "react";

export default class Swap extends React.Component{
    render() {
        return <div>
            <div><b>Buy/sell True stable coins</b><br/><br/>
                <b>Add list: </b> https://raw.githubusercontent.com/nagor2/cryptoFiat/Oracle/tokenList/list.json
                <br/>
                <br/>
            </div>
            <iframe  src="https://swap.ethereumclassic.com/#/swap?outputCurrency=0xc5e1a7DF6D076c4cA9F75499b3A84193910BFF5A"  height="900px"  width="100%" className='swap' />
        </div>;
    }
}