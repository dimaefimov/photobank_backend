import React from 'react';
// import $ from 'jquery';
import { hex_md5 } from '../vendor/md5';
import {ResourceService} from './services/ResourceService';
import {NotificationService} from './services/NotificationService';

export class ExistingResources extends React.Component{
  constructor(props) {
    super(props);
    this.state={
      "existing": [],
      "view_type": this.props.default_view,
      "finished_presets": [],
      "busy" : false,
      "loading" : true,
      "list_start": 0,
      "list_limit": 20,
      "list_end": 20,
      "list_current_page": 1,
      "list_total_pages": 0,
    };
    this.containerViewClasses = ['item-view__inner--icons-lg ','item-view__inner--icons-sm ','item-view__inner--detailed '];
    this.fileViewClasses = ['file--icons-lg ','file--icons-sm ','file--detailed '];
    this.finishedPresetRequestStack = [];
    this.paginationControls = "";
    this.preset_headers = [];

    this.presetCache = [];

    this.handleResourceUpdate = this.handleResourceUpdate.bind(this);
    this.handlePagination = this.handlePagination.bind(this);
    this.fetchExisting = this.fetchExisting.bind(this);

    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this);
    this.handleOpenInTab = this.handleOpenInTab.bind(this);
    this.handleDownloadResource = this.handleDownloadResource.bind(this);
    this.handleAddToDownloads = this.handleAddToDownloads.bind(this);
  }

  fetchExisting(){
    ResourceService.fetchExisting(this.props.item_id).then((data)=>{
      this.setState({
        "existing": data
      });
    }).catch((error)=>{
      NotificationService.throw(error);
    });
  }

  fetchPresets(){
    ResourceService.fetchExistingPresets(
      this.props.item_id,
      this.state.existing,
      this.state.list_start,
      this.state.list_end,
      this.state.finished_presets).then((data)=>{
        this.setState({
          "finished_presets": this.state.finished_presets.concat(data),
          "loading": false
        });
    }
    ).catch((error)=>{
      NotificationService.throw(error);
    });
  }

  handleResourceUpdate(e){
    let form = $(e.target).parent().parent();
    ResourceService.updateResource(form).then((data)=>{
      this.fetchExisting();
    }).catch((error)=>{
      NotificationService.throw(error);
    });
  }

  handlePagination(e){
    let changed = false;
    let start = this.state.list_start;
    let limit = this.state.list_limit;
    let target = e.target;
    if(e.type == "click"){
      if(target.tagName != "BUTTON"){
        target = target.parentNode;
      }
      if(target.dataset.direction == 0){
        if((start-=limit)<0){start=0};
        changed = true;
      }else{
        if(!(start+limit>this.state.existing.length)){start = parseInt(start+limit)};
        changed = true;
      }
    }else if(e.type = "keyUp"){
      switch(e.keyCode){
        case 13:
          if(target.name != "pagination_limit"){break;}
          limit = parseInt(target.value);
          start = start-(start%limit);
          if(limit!=this.state.list_limit){changed = true;}
          break;
        case 37:
          if((start-=limit)<0){start=0;}else{changed = true;};
          break;
        case 39:
          if(!(start+limit>this.state.existing.length)){start = parseInt(start+limit);changed = true;};
          break;
      }
    }
    if(changed){
      this.setState({
        "list_start": start,
        "list_limit": limit,
        "list_end": start+limit,
        "loading": true,
        "list_current_page": Math.floor(this.state.list_start/this.state.list_limit)+1,
        "list_total_pages": Math.ceil(this.state.existing.length/this.state.list_limit)
      });
    }
  }

  handleCopyToClipboard(e){
    e.preventDefault();
    let resource = e.target.dataset["resource"];
    console.log("handleCopyToClipboard "+ resource);
    ResourceService.copyLinkToClipboard(resource);
    NotificationService.toast("link-copied");
  }

  handleOpenInTab(e){
    e.preventDefault();
    let resource = e.target.dataset["resource"];
    console.log("handleOpenInTab "+ resource);
    ResourceService.openInTab(resource);
  }

  handleDownloadResource(e){
    e.preventDefault();
    let resource = e.target.dataset["resource"];
    console.log("handleDownloadResource "+ resource);
    ResourceService.downloadResource(resource);
  }

  handleAddToDownloads(e){
    e.preventDefault();
    let resource = e.target.dataset["resource"];
    console.log("handleAddToDownloads "+ resource);
    this.props.addDownloadHandler(resource);
    NotificationService.toast("dl-queued");
  }

  componentDidMount(){
    let presets = [];
    for(var preset in window.config['presets']){
      presets.push(<span key={"preset"+preset} className="info__info-field info__info-field--title info__info-field--preset">{preset}</span>);
    }
    this.preset_headers = presets;
    $(document).on("keyup.pagination", (e)=>{
      this.handlePagination(e);
    });
    this.fetchExisting();
  }

  componentDidUpdate(prevProps, prevState){
    if(this.props != prevProps){
      this.setState({
        "view_type": this.props.default_view,
      });
      if(this.props.need_refresh){
        this.fetchExisting();
      }
    }
    if(this.state.existing != prevState.existing){
      this.setState({
        "loading": true,
        "list_total_pages": Math.ceil(this.state.existing.length/this.state.list_limit),
        "list_current_page": Math.floor(this.state.list_start/this.state.list_limit)+1,
        "list_total_pages": Math.ceil(this.state.existing.length/this.state.list_limit)
      });
      this.fetchPresets();
    }
    if(prevState.list_start != this.state.list_start || prevState.list_limit != this.state.list_limit){
      this.fetchPresets();
      this.setState({
        "list_current_page": Math.floor(this.state.list_start/this.state.list_limit)+1,
      });
    }
  }

  componentWillUnmount(){
    $(document).off(".pagination");
  }

  render() {
    let maxMain = window.config.max_main_resources;
    let maxAdd = window.config.max_additional_resources;
    let currMain = this.state.existing.filter((file)=>{return file.type == 1}).length;
    let currAdd = this.state.existing.filter((file)=>{return file.type == 2}).length;
    let mainStatus = currMain+"/"+maxMain;
    let addStatus = currAdd+"/"+maxAdd;
    let existingListMarkupData = [];
    for(var i = this.state.list_start; i<this.state.list_end; i++){
      if(typeof this.state.existing[i]=='undefined'){break};
      let file = this.state.existing[i];
      let presets = [];
      let presetLinks = [];
      for(var preset in window.config['presets']){
        let presetId = window.config['presets'][preset]['id'];
        let finishedPreset = this.state.finished_presets.filter((preset)=>{return (preset.resource==file.id && preset.preset == presetId)})[0];
        let finished = typeof finishedPreset != "undefined";
        presetLinks.push(window.config['resource_url']+ (finished?finishedPreset.id:"0")+".jpg");
        presets.push(
          <span key={file.id+"-"+presetId} className={"info__info-field info__info-field--preset "+finished?"info__info-field--preset-done":"info__info-field--preset-not-done"}>
            {finished
              //?<span className="existing-preset"><a href={window.config['resource_url']+finishedPreset.id+".jpg"} target="_blank">{window.config['presets'][preset]['width']+'/'+window.config['presets'][preset]['height']}</a></span>
              ?<span className="existing-download">
                <span className="existing-download-controls">
                  <i onClick={this.handleCopyToClipboard} title="Скопировать ссылку" data-resource={finishedPreset.id} className="fas fa-link get-url"></i>
                <i onClick={this.handleOpenInTab} title="Открыть в новой вкладке" data-resource={finishedPreset.id} className="fas fa-external-link-square-alt open-in-tab"></i>
              <i onClick={this.handleDownloadResource} title="Скачать файл" data-resource={finishedPreset.id} className="fas fa-arrow-alt-circle-down dl-now"></i>
            <i onClick={this.handleAddToDownloads} title="Добавить в загрузки" data-resource={finishedPreset.id} className="fas fa-plus-circle dl-cart-add"></i>
                </span>
                <a href={window.config['resource_url']+finishedPreset.id+".jpg"} target="_blank">{window.config['presets'][preset]['width']+'/'+window.config['presets'][preset]['height']}</a>
              </span>
              :"Не обработан"
            }
          </span>);
      }
      existingListMarkupData.push(

        <div className={"existing-files__file file "+this.fileViewClasses[this.state.view_type]} key={file.src_filename+file.filename}>
        <a className="file__file-name" href={window.config.resource_url+file.id+".jpg"} target="_blank"><div className="file__thumbnail" style={{"backgroundImage":"url("+presetLinks[0]+")"}}></div><span className="existing-download-controls">
          <i onClick={this.handleCopyToClipboard} title="Скопировать ссылку" data-resource={file.id} className="fas fa-link get-url"></i>
        <i onClick={this.handleOpenInTab} title="Открыть в новой вкладке" data-resource={file.id} className="fas fa-external-link-square-alt open-in-tab"></i>
      <i onClick={this.handleDownloadResource} title="Скачать файл" data-resource={file.id} className="fas fa-arrow-alt-circle-down dl-now"></i>
    <i onClick={this.handleAddToDownloads} title="Добавить в загрузки" data-resource={file.id} className="fas fa-plus-circle dl-cart-add"></i>
        </span>{file.src_filename}</a>
      {/* <div className="file__edit-fields edit-fields"> */}
          <div className={"edit-input " + (file.type=="2"?"edit-input--add-file":"")}>
            <select onChange={this.handleResourceUpdate} name="type" defaultValue={file.type}>
              <option disabled={currMain>=maxMain?true:false} value="1">Основноe{mainStatus}</option>
            <option disabled={currAdd>=maxAdd?true:false} value="2">Доп.{addStatus}</option>
              <option value="3">Исходник</option>
            </select>
            {file.type=="2"?<input type="text" name="priority" defaultValue={file.priority} onBlur={this.handleResourceUpdate}></input>:null}
          </div>
          {/* <span className="edit-input"><input onClick={this.handleResourceUpdate} type="checkbox" defaultChecked={file.isDeleted} name="deleted"/><label htmlFor="deleted">Удален</label></span> */}
          <input type="hidden" name="id" value={file.id}/>
      {/* </div> */}
        {/* <div className="file__info info"> */}
          <span className="info__info-field info-field info__info-field--sizepx">
            {file.size_px}
          </span>
          <span className="info__info-field info-field info__info-field--sizemb">
            {Math.round((file.size_bytes/(1024*1024))*100)/100 + "MB"}
          </span>
          <span className="info__info-field info-field info__info-field--uploaddate">
            {file.created_on}
          </span>
          <span className="info__info-field info-field info__info-field--username">
            {file.username}
          </span>
          <span className="info__info-field info-field info__info-field--comment">
            {file.comment}
          </span>
            {presets}
        {/* </div> */}
      </div>)
    }

    let paginationControls = this.state.existing.length!=0?(
      <div className="item-view__pagination-controls pagination-controls">
          <button onClick={this.handlePagination} className="pagination-controls__btn pagination-controls__btn--bck-btn" data-direction="0" type="button" disabled={this.state.list_start==0}><i className="fas fa-arrow-left"></i></button>
        <p>{this.state.list_current_page}/{this.state.list_total_pages}</p>
      <button onClick={this.handlePagination} className="pagination-controls__btn pagination-controls__btn--bck-btn" data-direction="1" type="button" disabled={this.state.list_end>=this.state.existing.length}><i className="fas fa-arrow-right"></i></button>
    <p>На странице:</p><input onKeyUp={this.handlePagination} type="text" name="pagination_limit" defaultValue={this.state.list_limit}></input>
        </div>
    ):null;

    return (
      <div className="item-view__existing">
        <h4 className="item-view__subheader">Файлы товара<div className="button-block"><button type="button" onClick={()=>{this.fetchExisting();this.fetchPresets();}}><i className="fas fa-redo-alt"></i>Обновить</button></div></h4>
        {paginationControls}
        {this.state.existing.length==0?"Нет загруженных файлов":null}
        <div className={(this.state.loading?"loading ":"") + "item-resources"}>
          <div className="item-view__file-list existing-files">
            <div className="item-view__table-header">
              <span className="info__info-field info__info-field--title info__info-field--sizepx">Имя файла</span>
              <span className="info__info-field info__info-field--title info__info-field--type">Тип ресурса</span>
              <span className="info__info-field info__info-field--title info__info-field--sizebytes">Размер изображения</span>
              <span className="info__info-field info__info-field--title info__info-field--sizemb">Размер файла</span>
              <span className="info__info-field info__info-field--title info__info-field--uploaddate">Дата создания</span>
              <span className="info__info-field info__info-field--title info__info-field--username">Пользователь</span>
              <span className="info__info-field info__info-field--title info__info-field--comment">Комментарий</span>
              {this.preset_headers}
            </div>
            {existingListMarkupData}
          </div>
        </div>
      </div>
    );
  }
}
