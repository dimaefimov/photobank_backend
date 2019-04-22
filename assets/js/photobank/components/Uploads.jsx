import React from 'react';
import { hex_md5 } from '../../vendor/md5';
import {connect} from 'react-redux';

import UnfinishedUploads from './UnfinishedUploads';
import { UploadService } from '../services/UploadService';
import { NotificationService} from '../../services/NotificationService';
import selectors from '../selectors';
import {completeUpload, clearResumableEvents, deleteUpload, deleteUnfinishedUploads, prepareFileForUpload} from '../actionCreator';
/**
 * Компонент работы с активными и незаконченными загрузками
 */
export class Uploads extends React.Component{
  /**
   * Конструктор компонента
   * busy - Идет ли в данный момент загрузка файлов на сервер
   * loading - Находится ли компонент в состоянии ожидания
   */
  constructor(props) {
    super(props);
    this.state={
      loading : false,
      busy:false
    };
    this.fileViewClasses = ['file--icons-lg ','file--icons-sm ','file--detailed '];
    this.fileHashStack = [];
    this.removeUploadStack = [];
    this.uploadCommitQueue = [];
    this.uploadStatus = {
      "unfinished": "Прерван",
      "uploading": "Загружается",
      "unfinished": "Прерван",
      "resolved": "Готов к повторной загрузке",
      "pending": "Готов к загрузке",
      "processing": "Обрабатывается",
      "completed": "Загружен"
    };
  }

  /**
   * Обработчик начала отправки файлов на сервер
   */
  handleSubmit=()=>{
    this.props.resumable.upload();
  }

  /**
   * Обработчик удаления всех незавершенных загрузок из списка и записей из базы
   */
  handleClearUnfinished=()=>{
    this.props.deleteUnfinishedUploads();
    this.props.purgeEmptyItems();
  }

  /**
   * Определяет действия по событиям из resumable
   */
  assignResumableEvents=()=>{
    if(!this.props.resumable){return null}
    this.props.resumable.on('fileAdded', (file, event)=>{
      this.props.prepareFileForUpload(file,this.props.uploads,this.props.item);
      $("#drop_target" + this.props.item.id).removeClass('file-list__drop-target--active');
    });
    this.props.resumable.on('fileProgress', (file,event)=>{
      this.setState({
          "need_refresh":true
      });
    });
    this.props.resumable.on('uploadStart', (file,event)=>{
      this.state.busy = true;
    });
    this.props.resumable.on('complete', ()=>{
      this.state.busy = false;
      this.props.completeUpload(this.props.item.id, this.props.resumable.files, this.props.collection_type);
    });
    this.props.resumable.on('fileError', (file,message)=>{
      this.state.busy = false;
      if("Unsupported media type"===message){NotificationService.throw("ext-not-supported");}else{
        NotificationService.throw("unknown-error");
      }
    });
  }

  /**
   * Определяет drag&drop зону и кнопку для выбора файлов в файловой системе, вызывает запуск функции, которая определяет события resumable
   */
  componentDidMount(){
    if(!this.props.item||!this.props.resumable){return null}
    this.props.resumable.assignBrowse(document.getElementById("browse" + this.props.item.id));
    this.props.resumable.assignDrop(document.getElementById("drop_target" + this.props.item.id));
    var dragTimer;
    $(".item-view").on('dragover', (e)=>{
      var dt = e.originalEvent.dataTransfer;
      if (dt.types && (dt.types.indexOf ? dt.types.indexOf('Files') != -1 : dt.types.contains('Files'))) {
        $("#drop_target" + this.props.item.id).addClass('file-list__drop-target--active');
        window.clearTimeout(dragTimer);
      }
    });
    $("#drop_target" + this.props.item.id).on('dragleave', (e)=>{
      dragTimer = window.setTimeout(()=>{
        $("#drop_target" + this.props.item.id).removeClass('file-list__drop-target--active');
      }, 100);
    });
    this.assignResumableEvents();
  }

  componentWillUnmount(){
    this.props.clearResumableEvents(this.props.item.id);
  }

  render() {

    if(!this.props.item||!this.props.resumable){return null}

    let uploadsMarkup = this.props.uploads.map(upload=>{
      let status = "";
      if(upload.isComplete()){
        status = "completed";
      }else{
        if(upload.isUploading()){
          status = "uploading";
        }else if(!upload.ready){
          status = "processing";
        }else{
          status = "pending";
        }
      }
      return (
          <div key={upload.fileName+upload.uniqueIdentifier+"pending"} className={"file-list__file-item file-item " + "file-item"+(upload.isComplete()?"--completed":"--pending") +" "+ (upload.ready? "": "file-item--processing ")+this.fileViewClasses[this.state.view_type]}>
            <i data-item={upload.uniqueIdentifier} onClick={()=>{this.props.deleteUpload(upload.uniqueIdentifier, this.props.item.id)}} className="fas fa-trash-alt file-item__delete-upload"></i><br />
          <span className="file-item__file-name">{upload.fileName}</span>
        <span className="file-item__upload-status">{this.uploadStatus[status]}</span>
      <span className="progress-bar" id={"progress_bar"+upload.uniqueIdentifier}>
            <div className="progress-bar__percentage">{Math.round(upload.progress() * 100) + "%"}</div>
          <div className="progress-bar__bar" style={{"width":Math.round(upload.progress() * 100) + "%"}}></div>
            </span>
          </div>
      );
    });

    const ready = this.props.uploads_ready.length!==0 && this.props.uploads.length === this.props.uploads_ready.length ;

    return (
      <div className={"item-view__file-list file-list"} id={"file_list" + this.props.item.id}>
          <div className="file-list__button-block button-block">
            <button type="button" className="browse-files-btn" id={"browse" + this.props.item.id}><i className="fas fa-folder-open"></i>Выбрать файлы</button>
          <button type="button" className="upload-files-btn" disabled={!ready} onClick={this.handleSubmit} id={"submit" + this.props.item.id}><i className="fas fa-file-upload"></i>Загрузить выбранное</button>

          </div>
      <div className="item-uploads">
        {this.props.uploads.length>0?<div key={this.props.item.id + "uploads"} className="item-view__subheader-wrapper"><h4 className="item-view__subheader">Загрузки</h4></div>:""}
        {this.props.uploads.length>0?<div className={"item-uploads__upload-wrapper "+(!ready?"loading ":"")}>
        <div className="item-view__table-header">
          <span className="info__info-field info__info-field--title info__info-field--blank"></span>
          <span className="info__info-field info__info-field--title info__info-field--sizepx">Имя файла</span>
          <span className="info__info-field info__info-field--title info__info-field--type">Статус</span>
          <span className="info__info-field info__info-field--title info__info-field--sizebytes">Прогресс</span>
        </div>
        {uploadsMarkup}
      </div>:null}
        <UnfinishedUploads item_id={this.props.item_id} item={this.props.item} />
      </div>
    </div>
    );
  }
}

const mapStateToProps = (state,props) =>{
  return {
    resumable: selectors.upload.getResumableInstance(state,props),
    uploads: selectors.upload.getUploads(state,props),
    uploads_ready: selectors.upload.getReadyUploads(state,props),
    collection_type: selectors.catalogue.getCollectionType(state,props)
  }
}

const mapDispatchToProps = {
  prepareFileForUpload,
  deleteUpload,
  completeUpload,
  deleteUnfinishedUploads,
  clearResumableEvents
}

export default connect(mapStateToProps, mapDispatchToProps)(Uploads);
