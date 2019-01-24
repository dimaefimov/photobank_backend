import {
  CATALOGUE_DATA_FETCH,
  CATALOGUE_ROOT_NODES_FETCH,
  NODE_CHOICE,
  ITEM_CHOICE,
  ITEMS_FETCH,
  SUCCESS,
  FAIL
 } from '../../constants'

 import {
   CatalogueService,
   ItemQueryObject
 } from '../../services/';


let defaultState = {
  catalogue_data: [],
  items: [],
  current_node: null,
  current_item: null,
  item_query_object: null
}

export default (catalogue = defaultState, action) => {
  switch(action.type){
    case CATALOGUE_ROOT_NODES_FETCH+SUCCESS:
      const root_nodes = action.payload;
      return {...catalogue, catalogue_data:root_nodes}
      break;
    case CATALOGUE_DATA_FETCH+SUCCESS:
      let fetched_data = action.payload;
      let newData = fetched_data.concat(catalogue.catalogue_data);
      return {...catalogue, catalogue_data:newData}
      break;
    case NODE_CHOICE:
      return {...catalogue, current_node:action.payload}
      break;
    case ITEM_CHOICE:
      return {...catalogue, current_item:action.payload}
      break;
    case ITEMS_FETCH+SUCCESS:
      let newItems = action.payload;
      let curItem = catalogue.items.find(item=>item.id===catalogue.current_item);
      if(curItem&&catalogue.current_node!==curItem.node){
        newItems.push(curItem);
      }
      return {...catalogue, items:newItems}
      break;
  }
  return catalogue
}
