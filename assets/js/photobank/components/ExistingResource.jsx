import React from 'react';
import {connect} from 'react-redux';

import selectors from '../selectors';
import {NotificationService, ResourceService} from '../services';
import {addResourceToDownloads, updateResourceField} from '../actionCreator';
import utility from '../services/UtilityService';
import * as constants from '../constants';

export class ExistingResource extends React.Component {

  constructor(props) {
    super(props);
    this.state={
      priority_active:false
    }
    this.fileViewClasses = ['file--icons-lg ','file--icons-sm ','file--detailed '];
  }

  /**
   * Обработчик копирования ссылки для авторизованных пользователей в буфер обмена
   * @param {Number} id Id файла
   * @param  {Event} e Событие клика
   */
  handleCopyToClipboard = (id, e)=>{
    e.stopPropagation();
    e.preventDefault();
    ResourceService.copyLinkToClipboard(id);
    NotificationService.toast("link-copied");
  }

  /**
   * Обработчик открытия изображения в новой вкладке
   * @param {Number} id Id файла
   * @param  {Event} e Событие клика
   */
  handleOpenInTab = (id, e)=>{
    e.stopPropagation();
    e.preventDefault();
    ResourceService.openInTab(id);
  }

  /**
   * Обработчик скачивания изображения ресурса
   * @param {Number} id Id файла
   * @param  {[type]} e Событие клика
   */
  handleDownloadResource = (id, e)=>{
    e.stopPropagation();
    e.preventDefault();
    ResourceService.downloadResource(id);
  }

  /**
   * Обработчик добавления изображения в очередь загрузок
   * @param {Number} id Id файла
   * @param  {[type]} e Событие клика
   */
  handleAddToDownloads = (id, e)=>{
    e.stopPropagation();
    e.preventDefault();
    let resource = e.target.dataset["resource"];
    this.props.addResourceToDownloads(resource);
    NotificationService.toast("dl-queued");
  }

  /**
   * Обработчик начала установки приоритета ресурса
   * @param  {[type]} e Событие клика
   */
  handlePriority = (e)=>{
    e.stopPropagation();
    e.preventDefault();
    if(!this.props.authorized){return}
    this.setState({
      "priority_active": !this.state.priority_active
    });
  }

  /**
   * Обработчик установки типа ресурса для файла
   * @param  {Event} e Событие клика
   */
  handleTypeUpdate = (e)=>{
    let type = e.target.value;
    this.props.updateResourceField({
      file:this.props.file,
      key:"type",
      value:type,
      item:this.props.item_id,
    }, this.props.collection_type);
  }

  /**
   * Обработчик установки приоритета 1C дополнительного ресурса
   * @param  {int} priority
   */
  handlePriorityUpdate = (priority)=>{
    this.props.updateResourceField({
      file:this.props.file,
      key:"priority",
      value:priority,
      item:this.props.item_id,
    }, this.props.collection_type);
  }

  componentDidUpdate(prevProps,prevState){
    if(this.state.priority_active&&!prevState.priority_active){
      let handler = ()=>{
        this.setState({priority_active: false});
        removeEventListener('click', handler, false);
      };
      window.addEventListener("click", handler, false);
    }
  }

  render() {

    if(!this.props.file){return null}

    let presets = [];

    for(let preset in utility.config['presets']){
      let presetId = utility.config['presets'][preset]['id'];
      let finished = this.props.finished_presets.find(finished=>finished.resource===this.props.file.id&&finished.preset===presetId);
      presets.push(
        <span key={this.props.file.id+"-"+presetId} className={"info__info-field info-field info__info-field--preset "+(finished?"info__info-field--preset-done":"info__info-field--preset-not-done")}>
          {finished
            ?<span className="existing-download">
              <span className="existing-download-controls">
                <i onClick={(e)=>{this.handleCopyToClipboard(finished.id, e)}} title="Скопировать ссылку" data-resource={finished.id} className="fas fa-link get-url"></i>
              <i onClick={(e)=>{this.handleOpenInTab(finished.id, e)}} title="Открыть в новой вкладке" data-resource={finished.id} className="fas fa-external-link-square-alt open-in-tab"></i>
            <i onClick={(e)=>{this.handleDownloadResource(finished.id, e)}} title="Скачать файл" data-resource={finished.id} className="fas fa-arrow-alt-circle-down dl-now"></i>
          <i onClick={(e)=>{this.handleAddToDownloads(finished.id, e)}} title="Добавить в загрузки" data-resource={finished.id} className="fas fa-plus-circle dl-cart-add"></i>
              </span>
              <a href={utility.config['resource_url']+finished.id+".jpg"} target="_blank">{utility.config['presets'][preset]['width']+'/'+utility.config['presets'][preset]['height']}</a>
            </span>
            :"Не обработан"
          }
        </span>);
    }

    let dlControls = (
      <span key={"dlcontrols"+this.props.file.id} className="existing-download-controls">
        <i onClick={(e)=>{this.handleCopyToClipboard(this.props.file.id, e)}} title="Скопировать ссылку" data-resource={this.props.file.id} className="fas fa-link get-url"></i>
        <i onClick={(e)=>{this.handleOpenInTab(this.props.file.id, e)}} title="Открыть в новой вкладке" data-resource={this.props.file.id} className="fas fa-external-link-square-alt open-in-tab"></i>
        <i onClick={(e)=>{this.handleDownloadResource(this.props.file.id, e)}} title="Скачать файл" data-resource={this.props.file.id} className="fas fa-arrow-alt-circle-down dl-now"></i>
        <i onClick={(e)=>{this.handleAddToDownloads(this.props.file.id, e)}} title="Добавить в загрузки" data-resource={this.props.file.id} className="fas fa-plus-circle dl-cart-add"></i>
      </span>
    );
    let priorityStack = [];
    let priorityCtx = "";
    if(this.state.priority_active){
      for(let j=0; j<this.props.max_add; j++){
        priorityStack.push(<div className={"item " + (this.props.file.priority === j?"active":"")} onClick={()=>{this.handlePriorityUpdate(j)}} data-priority={j}>{j}</div>);
      }
      priorityCtx = [
        <div className="edit-input__context-menu context-menu"><div className="context-menu__inner">{priorityStack}</div></div>
      ];
    }
    return ((<div className={"existing-files__file file " + this.fileViewClasses[this.props.view]} key={this.props.file.src_filename + this.props.file.filename}>
      <a className="file__file-name info-field" title={this.props.file.src_filename} href={utility.config.resource_url + this.props.file.id + ".jpg"} target="_blank">
        <div className="file__thumbnail" style={{"backgroundImage" : "url(" + (this.props.finished_presets[0]?this.props.finished_presets[0].link:utility.config.placeholder_url) + ")"}}></div>
      {constants.RESOURCES_TABLE_VIEW!==this.props.view ? dlControls : null}
        {this.props.file.src_filename}
      </a>
      <div className={"edit-input " + (parseInt(this.props.file.type,10) === constants.RESOURCE_FILE_TYPES.add?"edit-input--add-file":"")}>
        <select onChange={(e)=>{this.handleTypeUpdate(e)}} name="type" defaultValue={this.props.file.type} disabled={!this.props.authorized}>
          <option key={"res-type-option-"+constants.RESOURCE_FILE_TYPES.main} selected={constants.RESOURCE_FILE_TYPES.main===this.props.file.type} disabled={this.props.current_main >= this.props.max_main?true:false} value={constants.RESOURCE_FILE_TYPES.main}>Основноe{this.props.current_main+"/"+this.props.max_main}</option>
            <option key={"res-type-option-"+constants.RESOURCE_FILE_TYPES.add} selected={constants.RESOURCE_FILE_TYPES.add===this.props.file.type} disabled={this.props.current_add >= this.props.max_add?true:false} value={constants.RESOURCE_FILE_TYPES.add}>Доп.{this.props.current_add+"/"+this.props.max_add}</option>
          <option key={"res-type-option-"+constants.RESOURCE_FILE_TYPES.original} selected={constants.RESOURCE_FILE_TYPES.original===this.props.file.type} value={constants.RESOURCE_FILE_TYPES.original}>Без статуса</option>
        </select>
        {parseInt(this.props.file.type,10) === constants.RESOURCE_FILE_TYPES.add
            ? <span className="edit-input__priority-btn" data-file={this.props.file.id} onClick={this.handlePriority}>{this.props.file.priority}{priorityCtx}</span>
            : null
        }
      </div>
      <input type="hidden" name="id" value={this.props.file.id}/>
      <span className="info__info-field info-field info__info-field--sizemb">{Math.round((this.props.file.size_bytes / (1024 * 1024)) * 100) / 100 + "MB"}</span>
      <span className="info__info-field info-field info__info-field--uploaddate">{this.props.file.created_on}</span>
      <span className="info__info-field info-field info__info-field--username">{this.props.file.username}</span>
      <span className="info__info-field info-field info__info-field--comment">{this.props.file.comment}</span>
      <span className="info__info-field info-field info__info-field--sizepx">
        <a className="file__file-src" href={utility.config.resource_url + this.props.file.id + ".jpg"} target="_blank">
          {dlControls}
          {this.props.file.size_px}
        </a>
      </span>
      {presets}
    </div>));
  }

}

const mapStateToProps = (state,props)=>{
  return {
    finished_presets: selectors.resource.getFinishedPresets(state,props),
    max_main: selectors.resource.getMaxMainResources(state,props),
    max_add: selectors.resource.getMaxAddResources(state,props),
    current_main: selectors.resource.getCurrentMainResources(state,props),
    current_add: selectors.resource.getCurrentAddResources(state,props),
    authorized: selectors.user.getAuthorized(state,props),
    collection_type: selectors.catalogue.getCollectionType(state,props),
    view: selectors.localstorage.getStoredListViewtype(state,props)
  }
}

const mapDispatchToProps = {
  addResourceToDownloads,
  updateResourceField,

}

export default connect(mapStateToProps, mapDispatchToProps)(ExistingResource)
