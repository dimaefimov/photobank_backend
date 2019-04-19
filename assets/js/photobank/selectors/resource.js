import {createSelector, createStructuredSelector} from 'reselect';
import {Map,List,Set,Record} from 'immutable';

import utility from '../services/UtilityService';

export const existingResources = (store,props)=>store.resource.get('resources_existing');
export const finishedPresets = (store,props)=>store.resource.get('finished_presets');
export const resourceId = (store,props)=>props.file.id||null;
export const itemId = (store,props)=>props.item_id||null;
export const loadingResources = (store,props)=>store.resource.get('fetching_resources');
export const loadingPresets = (store,props)=>store.resource.get('fetching_presets');
export const downloads = (store,props)=>store.resource.get('downloads');

export const getExisting = createSelector(existingResources, itemId,(existing, id)=>{
  let resources = existing.get(id);
  if(!resources){
    return [];
  }
  resources = resources.sort((a,b)=>{
    let val = 0;
    if(a.type===2&&b.type===2){
        val = a.priority>b.priority?1:(b.priority>a.priority?-1:a.src_filename.localeCompare(b.src_filename));
        val=(a.priority==0||b.priority==0)?-val:val;
    }else{
      val = a.type>b.type?1:b.type>a.type?-1:a.src_filename.localeCompare(b.src_filename);
    }return val;
  });
  return resources;
});

export const getFinishedPresets = createSelector(finishedPresets, resourceId, itemId, (finished, id, iid)=>{
  let presets = finished.get(iid);
  if(!presets){
    return [];
  }
  if(id){
    presets = presets.filter(preset=>{
      return preset.resource===id;
    }).map(preset=>{
      preset.link = utility.config['resource_url']+ preset.id+".jpg";
      return preset;
    });
  }
  return presets;
});

export const getMaxMainResources = createSelector(()=>{
  return utility.config.max_main_resources;
});

export const getMaxAddResources = createSelector(()=>{
  return utility.config.max_additional_resources;
});

export const getCurrentMainResources = createSelector(existingResources, itemId, (existing, id)=>{
  let resources = existing.get(id);
  if(!resources){
    return 0;
  }
  return resources.filter(resource=>{
    return resource.type===1&&resource.item===id;
  }).length;
});

export const getCurrentAddResources = createSelector(existingResources, itemId, (existing, id)=>{
  let resources = existing.get(id);
  if(!resources){
    return 0;
  }
  return resources.filter(resource=>{
    return resource.type===2&&resource.item===id;
  }).length;
});

export const getLoadingResources = createSelector(loadingResources, (loading)=>{
  return loading;
});

export const getLoadingPresets = createSelector(loadingPresets, (loading)=>{
  return loading;
});

export const getDownloadData = createSelector(downloads, (downloads)=>{
  return downloads.toArray();
});
