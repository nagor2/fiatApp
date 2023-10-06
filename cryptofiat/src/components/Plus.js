import React from "react";

export default class Plus extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            isHovered: false
        };
        this.handleHover = this.handleHover.bind(this);
        this.Click=this.Click.bind(this);
    }

    handleHover(){
        this.setState(prevState => ({
            isHovered: !prevState.isHovered
        }));
    }

    Click = (e) => {
        e.stopPropagation()
        this.props.emitter.emit('change-state', ['',this.props.action,'']);
    }

    render() {
        const divClass = this.state.isHovered ?  "small-icon plus-icon pointer" : "small-icon plus-icon";
        return <div className="small-icon plus-icon pointer" onClick={this.Click}>
            <svg width="24" height="24" fill="green" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" focusable="false"><path fillRule="evenodd" clipRule="evenodd" d="M13 5a1 1 0 1 0-2 0v6H5a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2h-6V5Z"></path></svg>
        </div>
    }
}