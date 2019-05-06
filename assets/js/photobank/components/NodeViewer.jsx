import React from 'react';
import {connect} from 'react-redux';

import ItemSection from './ItemSection';
import ItemList from './ItemList';
import ListFilter from './ListFilter';
import UploadPool from './UploadPool';
import DownloadPool from './DownloadPool';
import {Draggable} from './../../common/Draggable';
import {LocalStorageService} from '../services/LocalStorageService';
import {NotificationService} from '../../services/NotificationService';
import {fetchItemData, setLocalValue} from '../actionCreator';
import selectors from '../selectors';

/**
 * Компонент интерфейса работы с конкретным разделом каталога (ItemList+ItemSection)
 */
export class NodeViewer extends React.Component{
  /**
   * Конструктор компонента
   * view_pool - Показывать ли очередь загрузки/выгрузки
   */
  constructor(props) {
    super(props);
    this.state ={
      "view_pool": 0,
    }
    this.pools = {
      none:0,
      download:1,
      upload:2
    }
  }

  /**
   * Обработчик открытия интерфейса очереди загрузки/выгрузки
   * @param  {Event} e Событие клика
   */
  handlePoolClick=(view_pool)=>{
    if(this.state.view_pool === view_pool)view_pool=this.pools.none;
    this.setState({view_pool})
  }

  /**
   * Обработчик выбора типа представления элементов списка
   * @param  {Number} view Идентификатор представления
   */
  handleViewChoice = (view)=>{
    LocalStorageService.set("list_view_type", view);
    this.setState({
      "view_type":view
    });
  }

  componentDidUpdate(prevProps){
    if(prevProps.item !== this.props.item){
      this.setState({view_pool: this.pools.none});
    }
  }

  handleDraggableRelease = (width)=>{
    this.props.setLocalValue('itemlist_basis', width.toString());
  }

  render() {
    let itemSectionOutput = <ItemSection />;

    let section = "";
    switch(parseInt(this.state.view_pool)){
      case 0:
        section = itemSectionOutput;
        break;
      case 1:
        section = <DownloadPool />
        break;
      case 2:
        section = <UploadPool />
        break;
      default:
        section = itemSectionOutput;
        break;
    }
    let itemSection = (
      <div className="view-inner__item-section" key={!!this.props.current_item?this.props.current_item.id:""}>
        <span className="titlefix">
          <h2 className="node-viewer__component-title component-title">
            <p>Файлы</p>
            <i className="crumb-string">{this.props.crumbs}</i>
            <div className="view-switcher-button-block">
              <button type="button" className="item-section-switcher" data-pool="1" onClick={()=>{this.handlePoolClick(this.pools.download)}}>{1===this.state.view_pool?"К последнему товару":"Выгрузка"}</button>
            {this.props.authorized?<button type="button" className="item-section-switcher" data-pool="2" onClick={()=>{this.handlePoolClick(this.pools.upload)}}>{2===this.state.view_pool?"К последнему товару":"Загрузка"}</button>:null}
            </div>
          </h2>
    </span>
      <div className="view-inner__container inner-bump">
        {section}
      </div>
      </div>
    );
    let inner;
    if(0===this.props.collection_type)
      {inner = <Draggable handleRelease={this.handleDraggableRelease} basew={this.props.draggable_base} maxw1="50" maxw2="90" parent={this.refs.draggable_parent} box1={<ItemList />} box2={itemSection} id="2" />;}
    else if(3===this.props.catalogue_view)
      {inner = <Draggable handleRelease={this.handleDraggableRelease} basew={this.props.draggable_base} maxw1="50" maxw2="90" parent={this.refs.draggable_parent} box1={<ItemList items={this.props.found_garbage_nodes} />} box2={itemSection} id="2" />;}
    else
      {inner = itemSection}
    return (
      <div className="node-viewer">
        <div className="node-viewer__view-inner view-inner" ref="draggable_parent">
          {inner}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state,props) =>{
  return {
    stored_item: selectors.catalogue.getStoredItem(state,props),
    item: selectors.catalogue.getItemObject(state,props),
    crumbs: selectors.catalogue.getCrumbString(state,props),
    authorized: selectors.user.getAuthorized(state,props),
    collection_type: selectors.catalogue.getCollectionType(state,props),
    catalogue_view: selectors.localstorage.getStoredCatalogueViewtype(state,props),
    found_garbage_nodes: selectors.catalogue.getFoundGarbageNodes(state,props),
    draggable_base: selectors.localstorage.getItemListBaseWidth(state,props),
  }
}

const mapDispatchToProps = {
  fetchItemData,
  setLocalValue
}

export default connect(mapStateToProps, mapDispatchToProps)(NodeViewer);
