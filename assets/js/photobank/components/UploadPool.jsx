import React from 'react';
import {connect} from 'react-redux';

import ItemSection from './ItemSection';
import { ListFilter } from './ListFilter';
import {NotificationService} from '../../services/NotificationService';
import selectors from '../selectors';
import {chooseListViewType} from '../actionCreator';

import * as constants from '../constants';


/**
 * Компонент работы с очередью отправки файлов на сервер
 */
export class UploadPool extends React.Component{

  /**
   * Конструктор компонента
   * collapse_all - Нужно ли свернуть все секции товаров в очереди
   */
  constructor(props){
    super(props);
    this.state = {
      collapse_all:true,
      current_collection:this.props.collection
    }
  };

  /**
   * Обработчик отправки всех файлов для активных товаров на сервер
   */
  handleSubmit=()=>{
    this.props.container.filter(instance=>instance.collection===this.state.current_collection).forEach(resumable=>resumable.instance.upload());
  }

  /**
   * Обработчик выбора типа представления для элементов списка
   * @param  {Number} type Тип представления
   */
   handleViewChoice =(type)=>{
     this.props.chooseListViewType(type);
   }

   chooseCollectionType = (current_collection)=>{
     this.setState({current_collection});
   }

  /**
   * Обработчик сворачивания всех товаров в очереди
   */
  handleCollapseAll=()=>{
    this.setState({
      "collapse_all": !this.state.collapse_all
    });
  }

  render(){
    let pool = this.props.container
    .filter(instance=>instance.collection===this.state.current_collection)
    .map(item=>{
      return(
      <div key={"pool-item" + item.id}>
        <ItemSection item_id={item.id} open_by_default={!this.state.collapse_all} collapsible_existing={false} collection_type={this.state.current_collection} />
      </div>
    )});
    return(
      <div className="upload-pool">
        <div className="collection-tabs">
          <span className={"collection-tabs__tab"+(this.state.current_collection===constants.CATALOGUE_COLLECTION?" active":"")} onClick={()=>{this.chooseCollectionType(constants.CATALOGUE_COLLECTION)}}>Каталог</span>
        <span className={"collection-tabs__tab"+(this.state.current_collection===constants.GARBAGE_COLLECTION?" active":"")} onClick={()=>{this.chooseCollectionType(constants.GARBAGE_COLLECTION)}}>Свалка</span>
        </div>
        <button type="button" className={"view-button"+(this.props.view==="0"?" view-button--active":"")} onClick={()=>{this.handleViewChoice("0")}}><i className="fas fa-th-large"></i></button>
      <button type="button" className={"view-button"+(this.props.view==="1"?" view-button--active":"")} onClick={()=>{this.handleViewChoice("1")}}><i className="fas fa-th"></i></button>
    <button type="button" className={"view-button"+(this.props.view==="2"?" view-button--active":"")} onClick={()=>{this.handleViewChoice("2")}}><i className="fas fa-list-ul"></i></button>
  <h2 className="upload-pool__component-title component-title">Загрузки<button type="button" onClick={this.handleCollapseAll} className="upload-pool__collapse-all">{this.state.collapse_all?"Развернуть все":"Свернуть все"}</button></h2>
    <ListFilter filterHandler={this.filterQueryHandler} filterid="poolsearch" placeholder="Фильтр по товару" /><button type="button" className="upload-pool__upload-all" onClick={this.handleSubmit}>Загрузить все</button>
        <div className="upload-pool__view-inner">
          {pool}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state,props) =>{
  return {
    collection: selectors.catalogue.getCollectionType(state,props),
    container: selectors.upload.getResumableContainer(state,props),
    view: selectors.localstorage.getStoredListViewtype(state,props),
  }
}

const mapDispatchToProps = {
  chooseListViewType
}

export default connect(mapStateToProps, mapDispatchToProps)(UploadPool);
