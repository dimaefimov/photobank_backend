import {Map, Set, List, Record} from 'immutable';

import {
  EXISTING_RESOURCES_FETCH,
  EXISTING_PRESETS_FETCH,
  DOWNLOAD_DATA_FETCH,
  ITEM_CHOICE,
  START,
  SUCCESS,
  FAIL
 } from '../../constants'

 import {
   CatalogueService,
   ItemQueryObject
 } from '../../services/';


let defaultState = Map({
  resources_existing: Map({}),
  finished_presets: Map({}),
  downloads: List([]),
  fetching_presets: false,
  fetching_resources: true
})

export default (resource = defaultState, action) => {
  resource = Map(resource);
  switch(action.type){
    case EXISTING_RESOURCES_FETCH+START:
      return resource.set('fetching_resources',true)
      break;
    case EXISTING_RESOURCES_FETCH+SUCCESS:
      let resources = resource.get('resources_existing').set(action.payload.id, action.payload.resources);
      return resource.set('resources_existing',resources).set('fetching_resources',false)
      break;
    case EXISTING_PRESETS_FETCH+START:
      return resource.set('fetching_presets',true)
      break;
    case EXISTING_PRESETS_FETCH+SUCCESS:
      let presets = resource.get('finished_presets').set(action.payload.id, action.payload.presets);
      return resource.set('finished_presets',presets).set('fetching_presets',false)
      break;
    case DOWNLOAD_DATA_FETCH+SUCCESS:
      return resource.set('downloads',List(action.payload))
      break;
    case ITEM_CHOICE:
      return resource.set('resources_existing',Map({})).set('finished_presets', Map({}));
      break;
  }
  return resource
}
