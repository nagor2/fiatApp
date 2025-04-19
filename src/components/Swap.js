import React from "react";


export default class Swap extends React.Component{
    render() {
        return <div>
            <h3>{this.props.name[1]}</h3>

            <a href={this.props.link} target={'_blank'}>{(this.props.name[1]=='Gold')?'Coming soon':this.props.name[1]}</a>
        </div>;
    }
}