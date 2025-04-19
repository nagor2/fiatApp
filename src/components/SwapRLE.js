import React from "react";

export default class SwapRLE extends React.Component{
    render() {
        return <div>
            <h3>{this.props.name[1]}</h3>

            <a href={this.props.link} target={'_blank'}>Uniswap  DFC/RLE pool</a>
        </div>;
    }
}