import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {getChosenResource} from '../selectors';
import { removeResourceFromPool } from '../actionCreator';
import {ModalImage} from '../../../common/ModalImage';

export class LinkResource extends React.Component{

  constructor(props){
    super(props);
    this.state={
      modal_image_url:""
    };
  }

  handleRemoveChosenResource = (e)=>{
    this.props.removeResourceFromPool(e.target.dataset['res']);
  }

  handleModalImage = (link)=>{
    this.setState({
      modal_image_url: link
    });
  }

  handleModalClose = ()=>{
    this.setState({
      modal_image_url: ""
    });
  }

  render(){
    let resource = this.props.resources.length === 0
    ?(<div className="resource plaque warning"><i className="fas fa-times-circle left-icon"></i>Не выбран ресурс</div>)
    :this.props.resources.map((res)=>{
      return(
        <div className="resource list-item">
          <i className="fas fa-minus-circle add-res" data-res={res.id} onClick={this.handleRemoveChosenResource}></i>
        <span className={"resource-preview"+(typeof res.thumbnail === 'undefined'?" resource-preview--loading":"")} style={{backgroundImage:"url(/catalogue/node/item/resource/"+res.thumbnail+".jpg)"}} onClick={()=>{this.handleModalImage("/catalogue/node/item/resource/"+res.id+".jpg")}}></span>
            {res.item.name+"("+res.item.id+")"}
            {res.size_px}
        </div>
      );
    });
    return (
      <div className="link-resource">
        {this.state.modal_image_url !== ""?<ModalImage image_url={this.state.modal_image_url} closeModalHandler={this.handleModalClose} />:null}
        <div className="component-header component-header--subcomponent">
          <h2 className="component-title">
            Выбранные ресурсы
          </h2>
        </div>
        <div className="component-body component-body--subcomponent search-results">
            {resource}
        </div>
      </div>
    );
  }

}

const mapStateToProps = (state) =>{
  return {
    //resources: getChosenResource(state)
    resources: state.resource.resource_chosen
  }
}

const mapDispatchToProps = {
  removeResourceFromPool
}

export default connect(mapStateToProps, mapDispatchToProps)(LinkResource);
