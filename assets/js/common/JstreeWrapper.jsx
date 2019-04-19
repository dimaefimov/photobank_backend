import React, {Component} from 'react';
import $ from 'jquery';
import 'jstree/dist/jstree.min';
import 'jstree/dist/themes/default/style.css';

class JSTree extends React.Component {

  constructor(props){
    super(props);
    this.baseSettings = { core: { data: [] }, 'selected':[]};
    this.state = {
      settings : this.baseSettings,
      scrolled: false
    };
    this.treeContainer = React.createRef();
    this.crudPlugins = ['contextmenu', 'dnd', 'themes', 'html_data'];
    this.basePlugins = ['themes', 'html_data'];
  }

  makeTree=()=>{
    if($(this.treeContainer).jstree(true)){$(this.treeContainer).jstree(true).destroy();}
    let treeData = this.populateTree();
    let settings=this.state.settings;
    settings = {...this.state.settings, ...treeData};
    if(this.props.crud_enabled){
      settings = this.configureCrud(settings);
    }else{
      settings.plugins = this.basePlugins;
    }
    this.assignHandlers();
    $(this.treeContainer).jstree(settings);
    $(this.treeContainer).jstree(true).refresh(true);
  }

  updateTree = ()=>{
    let treeData = this.populateTree();
    let settings = this.state.settings;
    $(this.treeContainer).jstree(true).settings.core.data = treeData.core.data;
    $(this.treeContainer).jstree(true).settings.selected = treeData.selected;
    $(this.treeContainer).jstree(true).refresh(true);
  }

  populateTree = ()=>{
    let settings = this.state.settings;
    let treeData = this.props.catalogue_data.map((item)=>{
      let node = {
        'text':item.name,
        'parent':item.parent||"#",
        'id':item.id,
        'li_attr':{class:item.deleted?"deleted":""},
        'state':{
          'selected':this.props.current_node===item.id,
          'opened':this.props.current_node===item.id||!!settings.core.data.find(op=>op.id===item.id&&op.state.opened),
        }
      };
      return node;
    });
    let nodeToOpen = treeData.find(item=>item.state.selected===true);
    if(!!nodeToOpen)settings.selected=[nodeToOpen.id];
    while(typeof nodeToOpen != "undefined"){
      nodeToOpen.state.opened = true;
      nodeToOpen = treeData.find((parent)=>{return parent.id === nodeToOpen.parent});
    }
    settings.core.data = treeData;
    return settings;
  }

  configureCrud = (settings)=>{
    settings.plugins = this.crudPlugins;
    settings.core.check_callback = true;
    settings.contextmenu = {
      show_at_node: true,
      select_node:false,
      items: (node)=>{
        let tree = $.jstree.reference($(this.treeContainer));
        let deleteElement;
        if(node.li_attr.class==="deleted"){
          deleteElement = {
            "label": "Восстановить",
            "action": () => {
              this.handleRestoreNode(node.id,node.parent);
            }
          }
        }else{
          deleteElement = {
            "label": "Удалить",
            "action": () => {
              this.handleDeleteNode(node.id,node.parent);
            }
          }
        }
        return{
          "add": {
            "label": "Создать подкаталог...",
            "action": () => {
              tree.select_node(node);
              setTimeout(()=>{
                let newNode = tree.create_node(node.id, {id:"%", text:"Новая папка"});
                tree.edit(newNode);
              },600);
            }
          },
          "rename": {
            "label": "Переименовать...",
            "action": () => {
              tree.edit(node);
            }
          },
          "delete": deleteElement
        };
      }
    };
    settings.dnd = {
      check_while_dragging:false,
      use_html5:true,
      is_draggable:()=>true,
      responsive:true
    };
    return settings;
  }

  handleRenameNode = (id,text,parent)=>{
    if(parent==="#")parent=null;
    this.props.onRename(id,text,parent);
  }

  handleDeleteNode = (id,parent)=>{
    if(parent==="#")parent=null;
    this.props.onDelete(id,parent);
  }

  handleRestoreNode = (id,parent)=>{
    if(parent==="#")parent=null;
    this.props.onRestore(id,parent);
  }

  handleAddNode = (parent, text)=>{
    if(parent==="#")parent=null;
    this.props.onCreate(parent,text);
  }

  handleMoveNode = (id, parent)=>{
    if(parent==="#")parent=null;
    this.props.onMove(id,parent);
  }

  handleSelectNode = (id)=>{
    if(this.props.current_node!==id)this.props.onSelect(id);
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.current_node !== this.props.current_node ||  nextProps.catalogue_data !== this.props.catalogue_data;
  }

  assignHandlers = ()=>{
    if(!$.jstree.reference($(this.treeContainer))){
      $(this.treeContainer).on('move_node.jstree', (e, data) => {
        this.handleMoveNode(data.node.id, data.parent);
        data.instance.refresh(true);
      });
      $(this.treeContainer).on('select_node.jstree', (e, data) => {
        let settings = data.instance.settings;
        this.handleSelectNode(data.node.id);
        this.setState({settings});
      });
      $(this.treeContainer).on('rename_node.jstree', (e, data) => {
        data.node.id === "%"
        ?this.handleAddNode(data.node.parent, data.text)
        :this.handleRenameNode(data.node.id, data.text, data.node.parent);
      });
      $(this.treeContainer).on('after_open.jstree after_close.jstree', (e, data) => {
          data.instance.settings.core.data.find(item=>item.id===data.node.id).state.opened = data.node.state.opened;
          data.instance.refresh(true);
      });
      $(this.treeContainer).on('loaded.jstree', (e, data) => {
        if(!this.state.scrolled){
          this.setState({scrolled:true});
          this.scrollToSelected();
        }
      });
      $(this.treeContainer).on('deselect_all.jstree', (e, data) => {
          // jstree - бессмысленный и беспощадный. Не трогай эту строчку
          if(data.node.length===2)data.instance.refresh(true);
      });
    }
  }

  scrollToSelected = ()=>{
    let active = $('li.jstree-node[aria-selected=true]');
    let parent = $(this.treeContainer).parent().parent().parent();
    if(active.position()){
      parent.scrollTop(parent.scrollTop() + active.position().top - parent.height()/2 + active.height()/2);
    }
  }

  componentDidMount() {
    this.makeTree();
    this.assignHandlers();
  }

  componentDidUpdate(prevProps) {
    this.props.collection!==prevProps.collection?this.makeTree():this.updateTree();
  }

  render() {
    return (<div ref={div => this.treeContainer = div}/>);
  }
}

export default JSTree;
