import React, {Component} from 'react';
import {connect} from 'react-redux';
import { getLinkTargets } from '../selectors';
import { chooseLink, addLink, fetchLinks, deleteLink } from '../actionCreator'
import {NotificationService} from '../../../services/NotificationService';
export class LinkList extends React.Component{

  constructor(props){
    super(props);
    this.state={
      target:"Все"
    };
  }

  componentDidMount(){
    this.props.fetchLinks();
  }

  // handleLinkClick = (e)=>{
  //   this.props.chooseLink(e.target.dataset['linkid']);
  // }

  handleLinkClick = (id)=>{
    this.props.chooseLink(id);
  }

  handleLinkAdd = (e)=>{
    this.props.addLink();
  }

  handleTargetChoice = (e)=>{
    e.preventDefault();
    this.setState({
      target:e.target.dataset['target']
    });
  }

  handleLinkDelete = (e)=>{
    e.preventDefault();
    this.props.deleteLink(e.target.dataset['link']);
  }

  handleCopyAllToClipboard = ()=>{
    let links = [];
    this.props.links.forEach((link)=>{
      if(link.target !== this.state.target && this.state.target !== "Все"){return false;}
      links.push(link.external_url);
    });
    if(typeof navigator.clipboard !== "undefined"){navigator.clipboard.writeText(links.join(",\n"))}else{NotificationService.throw('clipboard-error')};
    NotificationService.toast("link-copied");
  }

  render(){
    let links = this.props.links.map(
      (link)=>{
        if(link.target !== this.state.target && this.state.target !== "Все"){return false;}
        let thumb = this.props.thumbs.find((thumb)=>thumb.id === link.resource_id);
        return(
          <div data-linkid={link.link_id} key={"link"+link.link_id} className="link " onClick={()=>{this.handleLinkClick(link.link_id)}}>
            <i className="fas fa-trash-alt delete-link" data-link={link.link_id} onClick={this.handleLinkDelete}></i>
            <div><b>Ссылка:</b>{link.external_url}</div>
          <div><b>Товар: </b>{link.item_name}({link.item_id})</div>
    <span className={"resource-preview"+(typeof thumb === 'undefined'?" resource-preview--loading":"")} style={{backgroundImage:typeof thumb === 'undefined'?"none":"url(/catalogue/node/item/resource/"+thumb.thumb_id+".jpg)"}}></span>
          </div>
        )
      }
    );
    let tabs = ["Все"].concat(this.props.targets).map((target)=>{
        return(
          <button className={(target===this.state.target?" active":"")} data-target={target} onClick={this.handleTargetChoice}>{target}</button>
        )
    })
    return(
      <div className="link-list  ">
        <div className="component-header">
          <h2 className="component-title">
            Ссылки
          </h2>
        </div>
        <div className="component-body">
          <div className="component-body__top-section">
            <div className="button-block">
              <button onClick={this.handleLinkAdd} style={{float:"none"}} className=" waves-effect hoverable waves-light btn add-button" type="button"><i className="fas fa-plus-circle"></i>Добавить</button>
              <button onClick={this.handleCopyAllToClipboard} style={{float:"none"}} className=" waves-effect hoverable waves-light btn add-button" type="button"><i className="fas fa-copy"></i>Скопировать все</button>
            </div>
            <div className="link-list__tabs button-block">
              {tabs}
            </div>
            {links.length==0?(<div className="resource plaque warning"><i className="fas fa-times-circle"></i>Нет ссылок</div>):links}
          </div>
        </div>
      </div>
    );
  }

}

const mapStateToProps = (state) =>{
  return {
    links: state.link.links_done,
    editing: state.link.link_editing,
    adding: state.link.link_adding,
    targets: getLinkTargets(state),
    thumbs: state.resource.resources_thumbnails
  }
}

const mapDispatchToProps = {
    chooseLink,
    addLink,
    fetchLinks,
    deleteLink
}

export default connect(mapStateToProps, mapDispatchToProps)(LinkList);
