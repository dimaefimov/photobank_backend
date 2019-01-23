import React from 'react';
// import $ from 'jquery';
import { hex_md5 } from '../../vendor/md5';
import {UploadService} from '../services/UploadService';
import {NotificationService} from '../../services/NotificationService';

import {connect} from 'react-redux';
import {resolveResumedUploads} from '../selectors';

/**
 * Компонент интерфейса работы с незаконченными загрузками
 */
export class UnfinishedUploads extends React.Component{
  /**
   * Конструктор компонента
   * uploads - Массив загрузок
   * unfinished - Массив незавершенных загрузок
   * loading - Находится ли компонент в состоянии ожидания
   * unfinished_hidden - Скрыты ли в приложении незаконченные загрузки
   */
  constructor(props) {
    super(props);
    this.state={
      "uploads":[],
      "unfinished_hidden":false
    };
    this.fileViewClasses = ['file--icons-lg ','file--icons-sm ','file--detailed '];
    this.removeUploadStack = [];
    this.uploadStatus = {
      "unfinished": "Прерван",
      "uploading": "Загружается",
      "resolved": "Готов к повторной загрузке"
    };
    this.handleDelete = this.handleDelete.bind(this);
    this.clearAllUnfinished = this.clearAllUnfinished.bind(this);
    this.hideUnfinished = this.hideUnfinished.bind(this);
  }

  // /**
  //  * Запрашивает список незаконченных загрузок для текущего товара
  //  * TODO loading ui
  //  */
  // fetchUnfinished(){
  //   this.setState({"loading" : true});
  // }

  /**
   * Обработчик удаления записи о незавершенной загрузке с сервера
   * @param  {Event} e обытие клика
   */
  handleDelete(e){
    let filehash = $(e.target).data("item");
    this.props.deleteHandler(filehash);
  }

  /**
   * Удаляет все незавершенные загрузки для текущего товара
   */
  clearAllUnfinished(){
    if(this.props.unfinished.length == 0){return null}
    this.setState({"loading":true});
    for(var id in this.props.unfinished){
      this.removeUploadStack.push(this.props.unfinished[id].filehash);
    }
    for(var id in this.props.unfinished){
      let unfinished = this.props.unfinished[id];
      this.props.deleteHandler(unfinished.filehash);
      this.props.clearAllHandler();
    }
    NotificationService.toast("unfinished-cleared");
  }

  /**
   * Скрывает отображение незаконченных загрузок
   */
  hideUnfinished(){
    this.setState({
      "unfinished_hidden" : !this.props.unfinished_hidden
    });
  }

  render() {
    let unfinished_uploads = this.props.unfinished.map((upload)=>
      <div key={upload.file_name+upload.file_hash+"unfinished"} className={"file-list__file-item file-item " + "file-item--unfinished " + (this.props.unfinished_hidden?"file-item--hidden":"")}>
        <i data-item={upload.file_hash} onClick={this.handleDelete} className="fas fa-trash-alt file-item__delete-upload"></i><br />
      <span className="file-item__file-name">{upload.file_name}</span>
    <span className="file-item__upload-status">Прерван</span>
      <span className="progress-bar" id={"progress_bar"+upload.file_hash}>
        <div className="progress-bar__percentage">{Math.round((upload.chunks_completed/upload.chunks_total)*100)}%</div>
        </span>
      </div>);
    return (
      <div className={"item-uploads__unfinished "+(this.state.loading?"loading":"")}>
        <div key={this.props.item.id + "unfinished"} className="item-view__subheader-wrapper">
          <h4 className="item-view__subheader">Незаконченные          <div className="button-block">
                      <button onClick={this.clearAllUnfinished} title="Удалить все незавершенные загрузки для данного товара" className="button-block__btn button-block__btn--clear"><i className="fas fa-trash-alt"></i>Очистить</button>
                    <button onClick={this.hideUnfinished} className="button-block__btn button-block__btn--clear">{this.props.unfinished_hidden?<i className='fas fa-eye'></i>:<i className='fas fa-eye-slash'></i>}{this.props.unfinished_hidden?"Показать":"Скрыть"}</button>
                    </div></h4>
        </div>
        <div className="item-uploads__unfinished-wrapper">
        <div key="unfinished-header" className="item-view__table-header">
          <span className="info__info-field info__info-field--title info__info-field--blank"></span>
                    <span className="info__info-field info__info-field--title info__info-field--sizepx">Имя файла</span>
                    <span className="info__info-field info__info-field--title info__info-field--type">Статус</span>
                    <span className="info__info-field info__info-field--title info__info-field--sizebytes">Прогресс</span>
                </div>
        {unfinished_uploads}
      </div>
      </div>
    );
  }
}

const mapStateToProps = (state) =>{
  return {
    unfinished: resolveResumedUploads(state),
  }
}

const mapDispatchToProps = {
}

export default connect(mapStateToProps, mapDispatchToProps)(UnfinishedUploads);