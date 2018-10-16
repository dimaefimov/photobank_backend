import React from 'react';

import {ItemQueryObject} from './services/ItemQueryObject';

export class ItemSearch extends React.Component{

  constructor(props){
    super(props);
    this.state={
      "query" : {},
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  };

  handleChange(e){
    let query = e.target.value;
    this.state.query = query;
  }

  handleSubmit(){
    this.props.filterHandler(this.state.query);
  }

  componentDidMount(){
    let input = document.getElementById(this.props.filterid+"inpt");
    input.addEventListener("keyup", (event)=> {
      event.preventDefault();
      if (event.keyCode === 13) {
        document.getElementById(this.props.filterid+"btn").click();
      }
    });
  }

  render(){
    return(
      <div className="list-filter">
        <input type="text" id={this.props.filterid+"inpt"} name="filter-query" placeholder={this.props.placeholder} onChange={this.handleChange}></input>
      <button type="button" id={this.props.filterid+"btn"} onClick={this.handleSubmit}><i className="fas fa-search"></i></button>
      </div>
    );
  }
}