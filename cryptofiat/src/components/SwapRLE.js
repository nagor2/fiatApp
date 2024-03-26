import React from "react";

export default class SwapRLE extends React.Component{
    render() {
        return <div>
            <div><b>Buy/sell Rule token</b><br/><br/>
                <b>Add list: </b> https://raw.githubusercontent.com/nagor2/cryptoFiat/Oracle/tokenList/list.json
                <br/>
                <br/>
            </div>
            <iframe  src="https://swap.ethereumclassic.com/#/swap?outputCurrency=0xBd349Bc6c3B3b2005d2Ba5D9D5b01C9DE0354D67&inputCurrency=0xc5e1a7DF6D076c4cA9F75499b3A84193910BFF5A"  height="900px"  width="100%" className='swap' />
        </div>;
    }
}