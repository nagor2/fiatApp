import React from "react";
import BasketItem from "./BasketItem";

export default class Basket extends React.Component{
    constructor(props) {
        super(props);
        this.state = {address:'', itemsCount:'',basketItems:[], sharesCount:''}
    }

    componentDidMount() {
        const { contracts } = this.props;
        let items=[];

        contracts['basket'].methods.sharesCount().call().then((result)=>{
             this.setState({sharesCount: result});
            //console.log(items);
        });

        contracts['basket'].methods.itemsCount().call().then((count)=>{
            this.setState({itemsCount: count});

            for (var i=1; i<=count; i++){
                contracts['basket'].methods.items(i).call().then((item)=>{
                  items.push(item);
                });
            }

            this.setState({basketItems: items});
            //console.log(items);

        });

        this.setState({address: contracts['basket']._address});
    }

    componentDidUpdate() {
        const { contracts } = this.props;


        contracts['basket'].methods.itemsCount().call().then((count)=>{
            let items=[];
            this.setState({itemsCount: count});

            for (var i=1; i<=count; i++){
                contracts['basket'].methods.items(i).call().then((item)=>{
                    items.push(item);
                });
            }

            if (this.setState.basketItems!== undefined && this.setState.basketItems.length!=count)
                this.setState({basketItems: items});
            //console.log(items);

        });

        contracts['basket'].methods.sharesCount().call().then((result)=>{
            this.setState({sharesCount: result});
            //console.log(items);
        });

    }

    render() {
        let items = this.state.basketItems?this.state.basketItems.map(product =><BasketItem key={product.symbol} symbol={product.symbol} initialPrice={product.initialPrice} share={product.share} balance={product.balance} name = {product.name}/>):'';
        return <div align='center'><b>Basket contract</b><div/>
            <div align='left'>
                <div>itemsCount:         <b>{this.state.itemsCount}</b></div>
                <div>total shares:         <b>{this.state.sharesCount}</b></div>

                <div className={'flex-col'}>
                    <div className="product bt-tile__title">
                        <div className="v-center row-container">
                            <div className="product">
                                <div className="products-name">
                                    <div>
                                        Symbol
                                    </div>
                                    <div>
                                        Share
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                    {items}
                </div>


                <div>address:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address}>{this.state.address}</a></div>
                <div>code:         <a target='_blank' href={this.props.explorer+'address/'+this.state.address+'#code'}>view code</a></div>
            </div>
        </div>
    }
}