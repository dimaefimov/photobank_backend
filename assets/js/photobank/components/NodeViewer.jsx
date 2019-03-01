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

  }

  /**
   * Обработчик открытия интерфейса очереди загрузки/выгрузки
   * @param  {Event} e Событие клика
   */
  handlePoolClick = (pool)=>{
    let view_pool = (this.state.view_pool==pool)?0:pool;
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

  render() {
    let itemSection = this.props.current_item!=null?(<ItemSection item_id={this.props.item.id} />):"Не выбран товар";

    let section = "";
    switch(parseInt(this.state.view_pool)){
      case 0:
        section = itemSection;
        break;
      case 1:
        section = <DownloadPool />
        break;
      case 2:
        section = <UploadPool />
        break;
      default:
        section = itemSection;
        break;
    }
    return (

      <div className="node-viewer">
        <div className="node-viewer__view-inner view-inner">
          {0===this.props.collection_type?<ItemList />:null}
          {0===this.props.collection_type?<Draggable box1=".view-inner__item-list" box2=".view-inner__item-section" id="2" />:null}
          <div className="view-inner__item-section" key={this.props.current_item!=null?this.props.current_item.id:""}>
            <span className="titlefix">
              <h2 className="node-viewer__component-title component-title">
                <p>Файлы</p>
                <i className="crumb-string">{this.props.crumbs}</i>
                <div className="view-switcher-button-block">
                  <button type="button" className="item-section-switcher" data-pool="1" onClick={()=>{this.handlePoolClick(1)}}>{1===this.state.view_pool?"К последнему товару":"Выгрузка"}</button>
                {this.props.authorized?<button type="button" className="item-section-switcher" data-pool="2" onClick={()=>{this.handlePoolClick(2)}}>{2===this.state.view_pool?"К последнему товару":"Загрузка"}</button>:null}
                </div>
              </h2>
        </span>
          <div className="view-inner__container inner-bump">
            {section}
          </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state,props) =>{
  return {
    current_item: selectors.catalogue.getItemObject(state,props)||selectors.localstorage.getStoredItem(state,props),
    item: selectors.catalogue.getItemObject(state,props)||{id:selectors.localstorage.getStoredItemId(state,props)},
    crumbs: selectors.catalogue.getCrumbString(state,props),
    authorized: selectors.user.getAuthorized(state,props),
    collection_type: selectors.catalogue.getCollectionType(state,props),
  }
}

const mapDispatchToProps = {
}

export default connect(mapStateToProps, mapDispatchToProps)(NodeViewer);
