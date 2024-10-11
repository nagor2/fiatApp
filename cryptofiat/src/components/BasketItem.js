import React from "react";

export default class BasketItem extends React.Component{
    constructor(props){
        super(props);
    }

    componentDidMount() {


    }


    render() {
        return <div className="product bt-tile__title">
            <div className="v-center row-container">
                <div className="product">
                    <div className="products-name">
                        <div>
                            {this.props.symbol}
                        </div>
                        <div>
                            {this.props.share}
                        </div>
                    </div>
                    <div className="small-text">initial price: {this.props.initialPrice/10**6}</div>
                </div>
            </div>
        </div>
    }
}