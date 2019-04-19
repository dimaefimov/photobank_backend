import React from 'react';
import {connect} from 'react-redux';
import selectors from '../selectors';
import JSTree from '../../common/JstreeWrapper';

import ItemSearch from './ItemSearch';
import GarbageSearch from './GarbageSearch';
import NodeCrud from './NodeCrud';
import {ItemQueryObject} from '../services/ItemQueryObject';
import {CatalogueService} from '../services/CatalogueService';
import {LocalStorageService} from '../services/LocalStorageService';
import {NotificationService} from '../../services/NotificationService';
import {
  addGarbageNode,
  chooseCatalogueViewType,
  chooseCollectionType,
  chooseNode,
  pushCrumbs,
  removeGarbageNode,
  restoreGarbageNode,
  showDeletedNodes,
  startNodeRebase,
  stopNodeRebase,
  updateGarbageNode,
  fetchNodes,
  fetchRootNodes
} from '../actionCreator';

import * as constants from '../constants';
/**
 * [state description]
 * @type {Object}
 */
export class CatalogueTree extends React.Component {

  /**
   * Конструктор компонета
   * crumbs - Массив объектов разделов каталога для хлебных крошек
   */
  constructor(props) {
    super(props);
    this.state ={
      "crumbs": [],
      show_deleted:false,
    }
    this.nodeChoiceDebounce=null;
  }

  /**
   * Обработчик выбора активного раздела каталога
   */
  handleNodeChoice = (id)=>{
    if(!this.props.clicks_disabled)this.props.chooseNode(id, this.props.catalogue_data, this.props.collection_type);
  }

  /**
   * Обработчик выбора типа предаставления
   * @param {Number} type Тип представления
   */
  handleViewChoice = (type)=>{
    if(constants.CATALOGUE_SEARCH_VIEW===parseInt(type,10)){
      this.props.chooseNode(null, this.props.catalogue_data, this.props.collection_type);
    }else{
      this.props.chooseNode(this.props.current_node, this.props.catalogue_data, this.props.collection_type);
    }
    this.props.chooseCatalogueViewType(type);
  }

  /**
   * Обработчик выбора типа коллекции (каталог/свалка)
   * @param {Number} type Тип коллекции
   *
   */
  handleCollectionChoice=(type)=>{
    if(!this.props.loading){
      this.props.chooseCollectionType(type);
    }
  }

  /**
   * [traverseUp description]
   * @type {[type]}
   */
   handleShowDeleted=()=>{
     this.props.showDeletedNodes(!this.state.show_deleted);
     this.setState({show_deleted:!this.state.show_deleted});
   }

  /**
   * Смещает выбор текущего уровня каталога на уровень выше (для кнопки "../" в представлении списка)
   */
  traverseUp = ()=>{
    let curNode = this.props.catalogue_data.filter((node)=>{return parseInt(node.id,10)===parseInt(this.props.current_node,10)})[0];
    if(!!curNode){
      this.props.chooseNode(curNode.parent, this.props.catalogue_data, this.props.collection_type);
    }
  }

  handleAddNode = (parent,text)=>{
    this.props.addGarbageNode(
      text,
      parent,
      this.props.catalogue_data,
      this.props.collection_type
    );
    this.props.fetchNodes(parent, this.props.catalogue_data, this.props.collection_type);
    this.props.chooseNode(parent, this.props.catalogue_data, this.props.collection_type);
  }

  handleDeleteNode = (id,parent)=>{
    this.props.removeGarbageNode(
      id,
      parent,
      this.props.catalogue_data,
      this.props.collection_type
    );
    this.props.chooseNode(parent, this.props.catalogue_data, this.props.collection_type);
  }

  handleRestoreNode = (id,parent)=>{
    this.props.restoreGarbageNode(
      id,
      parent,
      this.props.catalogue_data,
      this.props.collection_type
    );
    this.props.fetchNodes(id, this.props.catalogue_data, this.props.collection_type);
    this.props.chooseNode(parent, this.props.catalogue_data, this.props.collection_type);
  }

  handleRenameNode = (id, text, parent)=>{
    this.props.updateGarbageNode(
      id,
      text,
      parent,
      this.props.catalogue_data,
      this.props.collection_type
    );
    this.props.chooseNode(id, this.props.catalogue_data, this.props.collection_type);
  }

  handleMoveNode = (id, parent)=>{
    this.props.stopNodeRebase(
      this.props.catalogue_data,
      this.props.collection_type,
      id,
      parent
    );
  }

  /**
   * Выбирает созраненный раздел каталога как активный
   */
  componentWillMount(){
    this.props.chooseCollectionType(this.props.collection_type);
    this.props.fetchRootNodes(this.props.current_node, this.props.collection_type)
    .then(a=>{this.handleNodeChoice(this.props.view===constants.CATALOGUE_SEARCH_VIEW?null:this.props.current_node)});
  }

  componentDidUpdate(prevProps){
    if((this.props.current_node !== prevProps.current_node || this.props.catalogue_data !== prevProps.catalogue_data)&&this.props.catalogue_data.length){
      this.props.pushCrumbs(this.props.catalogue_data, this.props.current_node);
    }
    if(this.props.collection_type !== prevProps.collection_type){
      if(this.props.catalogue_data.length===0){
        this.props.fetchRootNodes(this.props.current_node, this.props.collection_type)
        .then(a=>{this.handleNodeChoice(this.props.view===constants.CATALOGUE_SEARCH_VIEW?null:this.props.current_node)});
      }else{
        this.handleNodeChoice(this.props.current_node);
      }
    }
  }

  render() {
    let view = "";
    let viewClass = "";
    switch(this.props.view){
      case 1:
        let children = this.props.catalogue_data.filter(node=>node.parent===this.props.current_node);
        let list = [];
        if(!!this.props.current_node){list.push(<div onClick={this.traverseUp} className="list-view__cat_item list-view__cat_item--parent">../</div>);}
        for(var i = 0; i< children.length; i++){
          let child = children[i];
          if(!child.deleted||this.state.show_deleted){
            list.push(
              <div key={child.id} title={child.id} className={"list-view__cat_item list-view__cat_item--parent"+(child.deleted?" deleted":"")} onClick={()=>{this.handleNodeChoice(child.id)}} data-node={child.id}><b data-node={child.id}>{child.name}</b></div>
            );
          }
        }
        view = list;
        viewClass = "list-view";
        break;
      case 2:
        if(0===this.props.catalogue_data.length){view = "";break;}
        let crud_enabled = this.props.isAuthorizedGarbage&&this.props.collection_type===1;
        view = <JSTree key="catalogue" collection={this.props.collection_type} catalogue_data={this.props.catalogue_data} current_node={this.props.current_node} crud_enabled={crud_enabled} onSelect={this.handleNodeChoice} onCreate={this.handleAddNode} onDelete={this.handleDeleteNode} onRestore={this.handleRestoreNode} onRename={this.handleRenameNode} onMove={this.handleMoveNode} />;
        viewClass = "tree-view";
        break;
      case 3:
        view = this.props.collection_type===0?<ItemSearch searchQueryHandler={this.handleQuery} filterid="srch" />:<GarbageSearch searchQueryHandler={this.handleQuery} filterid="gsrch" />;
        viewClass = "search-view";
        break;
    }

    let crumbs = this.props.crumbs&&this.props.crumbs.map((crumb)=><span key={crumb.name} data-node={crumb.id} className={crumb.active?"crumbs__crumb crumbs__crumb--active":"crumbs__crumb"} onClick={()=>{this.handleNodeChoice(crumb.id)}}>{crumb.name}</span>);

    return (
      <div className={"catalogue-tree"}>
        <span className="titlefix"><h2 className="catalogue-tree__component-title component-title">
          Каталог
          <span className="component-title__view-icons"><i className="fas fa-sitemap" title="Дерево" data-view="2" onClick={()=>{this.handleViewChoice("2")}}></i><i className="fas fa-list" title="Список" data-view="1" onClick={()=>{this.handleViewChoice("1")}}></i>
        <i title="Поиск" data-view="3" onClick={()=>{this.handleViewChoice("3")}} className="fas fa-search"></i>
        </span>
        </h2>
        <div className="collection-tabs">
          <span className={"collection-tabs__tab--catalogue "+"collection-tabs__tab" + (0==parseInt(this.props.collection_type,10)?" active":"")} onClick={()=>{this.handleCollectionChoice(0)}}>Товары</span>
        <span className={"collection-tabs__tab--garbage "+"collection-tabs__tab" + (1==parseInt(this.props.collection_type,10)?" active":"")} onClick={()=>{this.handleCollectionChoice(1)}}>Свалка</span>
        </div>
        {this.props.isAuthorizedGarbage&&this.props.collection_type===1?<div onClick={this.handleShowDeleted} className="show-deleted-nodes"><input type="checkbox" onChange={this.handleShowDeleted} checked={this.state.show_deleted} /><span className="lever" style={{marginLeft:"20px"}}>Показать удаленное</span></div>:null}
      </span>
      <div className="inner-bump">
          <div className="catalogue-tree__crumbs crumbs">
            {this.props.view===1?crumbs:null}
          </div>
          <div className={(this.props.loading?"loading ":"")+"catalogue-tree__view-inner view-inner"}>
            <div className={"view-inner__"+viewClass + " " + viewClass}>
              {view}
            </div>
          </div>
          {this.props.collection_type===1&&this.props.isAuthorized&&this.props.current_node?<NodeCrud onSelect={this.handleNodeChoice} onCreate={this.handleAddNode} onDelete={this.handleDeleteNode} onRestore={this.handleRestoreNode} onRename={this.handleRenameNode} onMove={this.handleMoveNode} />:null}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state,props) =>{
  return {
    collection_type: selectors.catalogue.getCollectionType(state,props),
    catalogue_data: selectors.catalogue.getCatalogueData(state,props),
    current_node: selectors.catalogue.getCurrentNode(state,props),
    view: selectors.localstorage.getStoredCatalogueViewtype(state,props),
    loading: selectors.catalogue.getLoadingCatalogue(state,props),
    crumbs: selectors.catalogue.getCrumbs(state,props),
    isAuthorized: selectors.user.getAuthorized(state,props),
    isAuthorizedGarbage: selectors.user.getAuthorizedGarbage(state,props),
    clicks_disabled: selectors.catalogue.getNodeMoving(state,props)
  }
}

const mapDispatchToProps = {
  chooseNode,
  chooseCatalogueViewType,
  pushCrumbs,
  chooseCollectionType,
  showDeletedNodes,
  addGarbageNode,
  updateGarbageNode,
  removeGarbageNode,
  restoreGarbageNode,
  startNodeRebase,
  stopNodeRebase,
  fetchNodes,
  fetchRootNodes
}

export default connect(mapStateToProps, mapDispatchToProps)(CatalogueTree);
