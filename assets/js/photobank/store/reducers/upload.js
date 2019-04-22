import {Map, Set, List, Record} from 'immutable';

import utility from '../../services/UtilityService';

import {
  UPLOADS_UNFINISHED_FETCH,
  FILE_PROCESSED,
  RESUMABLE_PUSH,
  RESUMABLE_POP,
  UPLOAD_DELETE,
  DELETE_ALL_PENDING,
  DELETE_ALL_UNFINISHED,
  CLEAR_RESUMABLE_EVENTS,
  PURGE_EMPTY_ITEMS,
  SUCCESS,
  FAIL
} from '../../constants'

import {
  UploadService
} from '../../services/';

let defaultState = Map({
  resumable_container: List([]),
  uploads_unfinished: List([]),
});

export default (upload = defaultState, action) => {
  upload = Map(upload);
  switch(action.type){
    case UPLOADS_UNFINISHED_FETCH+SUCCESS:{
      let uploads = List(action.payload);
      return upload.set('uploads_unfinished',uploads);
      break;
    }
    case FILE_PROCESSED:{
      let fileParams = action.payload;
      let container = List(upload.get('resumable_container'));
      let resumable = container.find(resumable=>resumable.get('id')===fileParams.itemId);
      let instance = resumable.get('instance');
      let files = instance.get('files');
      let file = files.find(file=>file===fileParams.file);
      Object.keys(fileParams).forEach((key)=>{
        if(key!=="file"){file[key] = fileParams[key]}
      });
      file.ready = true;
      instance = instance.set('files',files);
      resumable = resumable.set('instance',instance);
      container = container.splice(container.indexOf(resumable),1);
      container = container.push(resumable);
      let resolved = upload.get('uploads_unfinished');
      resolved = resolved.filter((upload)=>upload.file_hash!==fileParams.uniqueIdentifier);
      return upload.set('resumable_container',container).set('uploads_unfinished', resolved);
      break;
    }
    case RESUMABLE_PUSH:{
      let itemId = action.payload.id;
      let container = List(upload.get('resumable_container'));
      if(!container.find(resumable=>resumable.get('id')===itemId)){
        container = container.push(Map({
          collection:action.payload.collection,
          id:itemId,
          instance: Map(new Resumable({target: utility.config.upload_target_url}))
        }));
      }
      return upload.set('resumable_container',container)
      break;
    }
    case CLEAR_RESUMABLE_EVENTS:{
      let container = List(upload.get('resumable_container'));
      let resumable = container.find(resumable=>{console.log(resumable.get('id'),action.payload, resumable.get('id')===action.payload);return resumable.get('id')===action.payload});
      if(!resumable){
        return upload;
      }
      let newInstance = resumable.get('instance').set('events', []);
      let newResumable = resumable.set('instance', newInstance);
      container = container.splice(container.indexOf(resumable),1,newResumable);
      return upload.set('resumable_container',container);
      break;
    }
    case RESUMABLE_POP:{
      let itemId = action.payload;
      let container = List(upload.get('resumable_container'));
      let resumable = container.find(resumable=>resumable.get('id')===itemId);
      if(resumable){
        container = container.splice(container.indexOf(resumable),1);
      }
      return upload.set('resumable_container',container);
      break;
    }
    case UPLOAD_DELETE:{
      let filehash = action.payload.hash;
      let item = action.payload.item;
      let container = List(upload.get('resumable_container'));
      let resumable = container.find(resumable=>resumable.get('id')===item);
      container = container.splice(container.indexOf(resumable),1);
      resumable.get('instance').get('files')
      .filter(file=>file.uniqueIdentifier===filehash)
      .forEach(file=>{
        let files = resumable.get('instance').get('files');
        files.splice(files.indexOf(file),1);
        resumable.get('instance').set('files', files);
      });
      let unfinished = upload.get('uploads_unfinished');
      let unfinishedIndex = unfinished.indexOf(unfinished.find((upload)=>upload.file_hash===filehash&&upload.id===item));
      if(unfinishedIndex>=0)unfinished = unfinished.splice(unfinishedIndex, 1);
      container = container.push(resumable);
      return upload.set('resumable_container',container).set('uploads_unfinished', unfinished);
    }
    case DELETE_ALL_PENDING:{
      let itemId = action.payload;
      let container = List(upload.get('resumable_container'));
      let resumable = container.find(resumable=>resumable.get('id')===itemId);
      container = container.splice(indexOf(resumable),1);
      resumable.get('instance').files = [];
      container = container.push(resumable);
      return upload.set('resumable_container', container)
    }
    case DELETE_ALL_UNFINISHED:{
      let itemId = action.payload;
      let unfinished = upload.uploads_unfinished;
      unfinished = unfinished.filter(uploadUnfinished=>uploadUnfinished.id!==itemId);
      return upload.set('uploads_unfnished', unfinished)
    }
    case PURGE_EMPTY_ITEMS:{
      let container = List(upload.get('resumable_container'));
      const unfinished = List(upload.get('uploads_unfinished'));
      container = container.filter(resumable=>{
        let files = resumable.get('instance').get('files');
        return files.length||unfinished.filter(upload=>upload.id===resumable.get('id')).size;
      });
      return upload.set('resumable_container',container);
    }
  }
  return upload
}
