import {Map, Set, List, Record} from 'immutable';

import {
  CATALOGUE_DATA_FETCH,
  ITEM_INFO_FETCH,
  CATALOGUE_ROOT_NODES_FETCH,
  NODE_CHOICE,
  NODE_UPDATE,
  ITEM_CHOICE,
  ITEMS_FETCH,
  CRUMBS_UPDATE,
  CHOOSE_COLLECTION,
  GARBAGE_SEARCH,
  NODE_CREATE,
  NODE_REMOVE,
  NODE_REBASE,
  SHOW_DELETED,
  START,
  SUCCESS,
  FAIL
 } from '../../constants'

 import {
   CatalogueService,
   ItemQueryObject
 } from '../../services/';


let defaultState = Map({
  collection_type: 0,
  catalogue_data: List([List([]),List([])]),
  items: List([]),
  current_node: null,
  current_garbage_node: null,
  current_item: null,
  item_query_object: null,
  fetching_catalogue: true,
  fetching_items: false,
  crumbs: null,
  moving_node:false,
  found_garbage_nodes: List([]),
  show_deleted:false
})

export default (catalogue = defaultState, action) => {
  catalogue = Map(catalogue);
  switch(action.type){
    case CATALOGUE_ROOT_NODES_FETCH+START:{
      return catalogue.set('fetching_catalogue',true);
      break;
    }
    case CATALOGUE_ROOT_NODES_FETCH+SUCCESS:{
      const root_nodes = List(action.payload);
      let cat_data = catalogue.get('catalogue_data');
      cat_data = cat_data.set(catalogue.get('collection_type'), root_nodes);
      return catalogue.set('fetching_catalogue',false).set('catalogue_data',cat_data);
      break;
    }
    case CATALOGUE_DATA_FETCH+START:{
      return catalogue.set('fetching_catalogue',true);
      break;
    }
    case CATALOGUE_DATA_FETCH+SUCCESS:{
      let fetched_data = List(action.payload);
      let cat_data = catalogue.get('catalogue_data');
      let fetchCatalogueData = cat_data.get(catalogue.get('collection_type'));
      fetched_data.forEach((node)=>{
        let found = fetchCatalogueData.find((existing)=>node.id===existing.id);
        if(!found){
          fetchCatalogueData = fetchCatalogueData.push(node);
        }else{
          fetchCatalogueData = fetchCatalogueData.splice(fetchCatalogueData.indexOf(found),1,node);
        }
      });
      cat_data = cat_data.set(catalogue.get('collection_type'), fetchCatalogueData);
      let response = catalogue.set('fetching_catalogue',false).set('catalogue_data',cat_data);
      return response;
      break;
    }
    case CATALOGUE_DATA_FETCH+FAIL:{
      let cat_data = List(catalogue.get('catalogue_data'));
      return catalogue.set('fetching_catalogue',false).set('catalogue_data',cat_data);
      break;
    }
    case GARBAGE_SEARCH+SUCCESS:{
      let found = action.payload;
      return catalogue.set('found_garbage_nodes',found);
    }
    case NODE_REMOVE+SUCCESS:{
      let del_id = action.payload;
      let cat_data = catalogue.get('catalogue_data');
      let fetchCatalogueData = cat_data.get(catalogue.get('collection_type'));
      let children = fetchCatalogueData.filter(item=>{
        let iterItem = item;
        while(iterItem.parent !== null){
          if(iterItem.parent===del_id){return true;}
          iterItem = fetchCatalogueData.find(par=>par.id===iterItem.parent);
        };
        return false;
      });
      children.forEach(child=>{
        fetchCatalogueData=fetchCatalogueData.splice(fetchCatalogueData.indexOf(child),1);
      });
      cat_data = cat_data.set(catalogue.get('collection_type'), fetchCatalogueData);
      return catalogue.set('fetching_catalogue',false).set('catalogue_data',cat_data);
      break;
    }
    case NODE_CHOICE:{
      let chosen = action.payload;
      let collectionType = catalogue.get('collection_type');
      let nodeKey = collectionType==0?'current_node':'current_garbage_node';
      let cat_data = catalogue.get('catalogue_data').get(collectionType);
      if(!cat_data.find(node=>node.id===chosen)){chosen = null;}
      return catalogue.set(nodeKey,chosen);
      break;
    }
    case ITEM_CHOICE:{
      return catalogue.set('current_item',action.payload);
      break;
    }
    case ITEMS_FETCH+START:{
      return catalogue.set('fetching_items',true);
      break;
    }
    case ITEMS_FETCH+SUCCESS:{
      let newItems = List(action.payload);
      let prefetchedItems = List(catalogue.get('items'));
      let chosenItem = prefetchedItems.find((item)=>item.id===catalogue.get('current_item'));
      if(chosenItem&&!newItems.find(item=>item.id===chosenItem.id))newItems = newItems.push(chosenItem);
      return catalogue.set('items',newItems).set('fetching_items',false);
      break;
    }
    case ITEM_INFO_FETCH+SUCCESS:{
      let itemData = action.payload;
      let prefetchedItems = List(catalogue.get('items'));
      let found = prefetchedItems.find(item=>item.id===itemData.id);
      if(found){
        prefetchedItems = prefetchedItems.filter(item=>item.id!==itemData.id);
      }
      prefetchedItems = prefetchedItems.push(itemData);
      return catalogue.set('items',prefetchedItems);
      break;
    }
    case CRUMBS_UPDATE:{
      let crumbs = action.payload;
      return catalogue.set('crumbs', crumbs);
      break;
    }
    case CHOOSE_COLLECTION:{
      return catalogue.set('collection_type', action.payload);
      break;
    }
    case NODE_REBASE+START:{
      return catalogue.set('moving_node', true);
    }
    case NODE_REBASE+SUCCESS:{
      return catalogue.set('moving_node', false);
    }
    case SHOW_DELETED:{
      return catalogue.set('show_deleted', action.payload);
    }
    case NODE_UPDATE+FAIL:{
      let cat_data = List(catalogue.get('catalogue_data'));
      return catalogue.set('fetching_catalogue',false).set('catalogue_data',cat_data);
    }
    case NODE_CREATE+FAIL:{
      let cat_data = List(catalogue.get('catalogue_data'));
      return catalogue.set('fetching_catalogue',false).set('catalogue_data',cat_data);
    }
    case ITEMS_FETCH+FAIL:{
      let cat_data = List(catalogue.get('catalogue_data'));
      return catalogue.set('fetching_catalogue',false).set('fetching_items',false).set('catalogue_data',cat_data);
    }
    case ITEM_INFO_FETCH+FAIL:{
      let cat_data = List(catalogue.get('catalogue_data'));
      return catalogue.set('fetching_catalogue',false).set('fetching_items',false).set('catalogue_data',cat_data);
    }
  }
  return catalogue;
};
