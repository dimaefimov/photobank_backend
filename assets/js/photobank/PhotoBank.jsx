import React from 'react';
// import $ from 'jquery';

import { CatalogueTree } from './CatalogueTree';
import { NodeViewer } from './NodeViewer';
import { UploadPool } from './UploadPool';


export class PhotoBank extends React.Component {

  constructor(props) {
    super(props);
    this.state ={
      "catalogue_data": {},
      "view_pool": false
    }
    this.fetchUnfinished();
    this.handleNodeChoice = this.handleNodeChoice.bind(this);
    this.handleDataChange = this.handleDataChange.bind(this);
  }

  fetchUnfinished(){
    $.getJSON("/api/upload/unfinished/", (data)=>{
      for (var i = 0; i < data.length; i++) {
        let unfinishedUpload = data[i];
        if(typeof window.resumableContainer[unfinishedUpload[0]] == 'undefined'){
          window.resumableContainer[unfinishedUpload[0]]=new Resumable({target: window.config.upload_target_url});
        }
      }
    });
  }

  handleNodeChoice(id){
    this.setState({
      "selected_node": id
    });
  }

  handleDataChange(data, filteredData){
    if(this.state.catalogue_data != data || this.state.catalogue_data_filtered != filteredData){
      // this.setState({
      //   "catalogue_data": data,
      //   "catalogue_data_filtered": filteredData
      // });
      this.state.catalogue_data = data;
    }
  }

  componentWillMount(){
    //$.getJSON("/assets/js/components/photobank/dummy_data1.json", (data)=>{
    $.getJSON(window.config.get_nodes_url, (data)=>{
      this.setState({
        "catalogue_data":data,
        "selected_node":1
      });
    });
  }

  render() {
    if(this.state.catalogue_data != {}){
    return (
      <div className="photobank-main">
      <div className="photobank-main__main-block">
        <CatalogueTree catalogue_data={this.state.catalogue_data} nodeChoiceHandler={this.handleNodeChoice} dataChangeHandler={this.handleDataChange}/>
      <NodeViewer catalogue_data={this.state.catalogue_data_filtered} node={this.state.selected_node} />
        </div>
        <div className={this.state.view_pool?"photobank-main__upload-pool-wrapper photobank-main__upload-pool-wrapper--open ":"photobank-main__upload-pool-wrapper "}>
        {this.state.view_pool?<UploadPool />:null}
        </div>
        <div className="photobank-main__butt-wrapper">
        <button type="button" className="photobank-main__large-btn" onClick={()=>{this.setState({"view_pool":!this.state.view_pool})}}>{this.state.view_pool?"Скрыть":"Загрузки"}</button>
        </div>
      </div>
    );
  } else {return (<h1>ЗАГРУЗКА...</h1>)}
  }
}
