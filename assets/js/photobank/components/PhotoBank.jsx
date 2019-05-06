import React from 'react';
import {connect} from 'react-redux';

import CatalogueTree from './CatalogueTree';
import NodeViewer from './NodeViewer';
import { Draggable } from './../../common/Draggable';
import {ItemQueryObject} from '../services/ItemQueryObject';
import {ResourceService} from './../../services/ResourceService';
import {UploadService} from '../services/UploadService';
import {CatalogueService} from '../services/CatalogueService';
import {LocalStorageService} from '../services/LocalStorageService';
import {NotificationService} from '../../services/NotificationService';
import {UtilityService} from '../services/UtilityService';
import { fetchUnfinished, getLocalStorage, getUserInfo, init,setLocalValue } from '../actionCreator'
import selectors from '../selectors';

/**
 * Верхнеуровневый компонент интерфейса загрузки/выгрузки ресурсов
 */
export class PhotoBank extends React.Component {

  /**
   * Конструктор компонента
   */
  constructor(props) {
    super(props);
    this.state = {
      ready: false
    }
  }

  /**
   * Инициализирует конфигурацию, localstorage, получает список незаконченных загрузок
   */
  componentWillMount(){
    this.props.init()
.then(()=>{
      this.setState({
        ready:true
      });
    });
  }

  handleDraggableRelease = (width)=>{
    this.props.setLocalValue('catalogue_basis', width.toString());
  }

  render() {
    if(this.props.catalogue_data === {} || !this.state.ready){return (<h1>ЗАГРУЗКА...</h1>)}
    let inner = null===this.props.show_node_viewer?<CatalogueTree />:<Draggable basew={this.props.draggable_base} maxw1="35" maxw2="85" box1={<CatalogueTree />} box2={<NodeViewer />} id="1" parent={this.refs.draggable_parent} handleRelease={this.handleDraggableRelease}/>;
    return (
      <div className="photobank-main">
        <div id="notification-overlay"></div>
      <div className="photobank-main__main-block" ref="draggable_parent">
        {inner}
        </div>
        <div className="photobank-main__butt-wrapper">
        </div>
      </div>
    );
}
}

const mapStateToProps = (state,props) =>{
  return {
    show_node_viewer: null===state.catalogue.item_query_object,
    catalogue_data: selectors.catalogue.getCatalogueData(state,props),
    draggable_base: selectors.localstorage.getCatalogueBaseWidth(state,props),
  }
}

const mapDispatchToProps = {
  fetchUnfinished,
  getLocalStorage,
  getUserInfo,
  setLocalValue,
  init
}

export default connect(mapStateToProps, mapDispatchToProps)(PhotoBank);
