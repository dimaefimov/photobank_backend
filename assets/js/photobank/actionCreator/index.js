import {UploadService, NotificationService, CatalogueService, ResourceService, ItemQueryObject, GarbageQueryObject, ItemService, LocalStorageService} from '../services/';
import utility from '../services/UtilityService';

import {
  UPLOADS_UNFINISHED_FETCH,
  CATALOGUE_DATA_FETCH,
  CATALOGUE_ROOT_NODES_FETCH,
  EXISTING_RESOURCES_FETCH,
  EXISTING_PRESETS_FETCH,
  NODE_CHOICE,
  ITEM_CHOICE,
  ITEMS_FETCH,
  FILE_PROCESSED,
  RESUMABLE_PUSH,
  UPLOAD_DELETE,
  DELETE_ALL_PENDING,
  DELETE_ALL_UNFINISHED,
  LOCAL_STORAGE_VALUE_SET,
  PURGE_EMPTY_ITEMS,
  USER_INFO_FETCH,
  ITEM_INFO_FETCH,
  CRUMBS_UPDATE,
  CONFIG_GET,
  DOWNLOAD_DATA_FETCH,
  CHOOSE_COLLECTION,
  GARBAGE_SEARCH,
  NODE_CREATE,
  NODE_UPDATE,
  NODE_REMOVE,
  NODE_RESTORE,
  NODE_REBASE,
  SHOW_DELETED,
  UPLOAD_COMPLETE,
  START,
  SUCCESS,
  FAIL,
  ALL
} from '../constants/';

import * as constants from '../constants';

/**
 * Инициализвация приложения. Получает конфигурацию, данные из localStorage, незаконченные загрузки и данные о текущем пользователе
 */
export function init(){
  return dispatch=>{
    return Promise.all([
      getLocalStorage()(dispatch),
      fetchUnfinished()(dispatch),
      getUserInfo()(dispatch),
    ]);
  };
}

/**
 * Запрашивает данные о незаконченных загрузках с сервера
 */
export function fetchUnfinished(){
  return (dispatch)=>{
    dispatch({
      type: UPLOADS_UNFINISHED_FETCH+START,
      payload: ''
    });
    return UploadService.fetchUnfinished()
    .then((response)=>response.json())
    .then((items)=>{
      dispatch({
        type: UPLOADS_UNFINISHED_FETCH+SUCCESS,
        payload: items
      });
      items.forEach((item)=>{
        let collection = item.id.substring(0,1)==="9"?constants.GARBAGE_COLLECTION:constants.CATALOGUE_COLLECTION;
        dispatch({
          type: RESUMABLE_PUSH,
          payload: {id:item.id, collection:collection}
        });
      });
    }).catch((error)=>{
      dispatch({
        type: UPLOADS_UNFINISHED_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('server-error');
    });
  };
}

/**
 * Добавляет товар в контейнер resumable.js
 * @param  {[String]} itemId Код 1С товара
 */
export function pushResumable(itemId, collection){
  return dispatch=>{
    if(itemId===null){return null;}
    dispatch({
      type: RESUMABLE_PUSH,
      payload: {id:itemId, collection:collection}
    });
  };
}

/**
 * Рекурсивно запрашивает структура каталога от текущего раздела до корня
 * @param  {Number} id Id текущего раздела
 * @param  {Number} collection Тип коллекции (каталог/свалка)
 */
export function fetchRootNodes(id, collection){
  return (dispatch)=>{
    dispatch({
      type: CATALOGUE_ROOT_NODES_FETCH+START,
      payload: id
    });
    return CatalogueService.fetchRootNodes(collection, id)
      .then((data)=>{
      dispatch({
        type: CATALOGUE_ROOT_NODES_FETCH+SUCCESS,
        payload: data
      });
    }).catch((error)=>{
      dispatch({
        type: CATALOGUE_ROOT_NODES_FETCH+FAIL,
        payload: id
      });
      NotificationService.throw('failed-root-nodes');
    });
  };
}

/**
 * Получает дочерние разделы каталога по id родителя
 * @param  {Number} id   Код 1C родителя
 * @param  {Object[]} data Уже имеющиеся данныe каталога
 * @param  {Number} collection Тип коллекции (каталог/свалка)
 */
export function fetchNodes(id, data, collection){
  return (dispatch)=>{
    dispatch({
      type: CATALOGUE_DATA_FETCH+START,
      payload: ''
    });
    let searchNode = (id!=null?id:"");
    let url = constants.CATALOGUE_COLLECTION===collection?utility.config.get_nodes_url:utility.config.get_garbage_nodes_url;
    return fetch(url+searchNode,{'method':'GET'})
    .then((response)=>{
      if(!response.ok){
        dispatch({
          type: CATALOGUE_DATA_FETCH+FAIL,
          payload: ''
        });
        NotificationService.throw('fetch-nodes-fail');
      }else{
        return response.json();
      }
    })
    .then((data)=>{
      dispatch({
        type: CATALOGUE_DATA_FETCH+SUCCESS,
        payload: data
      });
    }).catch((error)=>{
      dispatch({
        type: CATALOGUE_DATA_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('fetch-nodes-fail');
    });
  };
}

/**
 * Выбирает активный раздел каталога
 * @param  {String} id   Код 1С раздела каталога
 * @param  {Object[]} data Уже имеющиеся данныe каталога
 * @param  {Number} collection Тип коллекции (каталог/свалка)
 */
export function chooseNode(id, data, collection){
  return (dispatch)=> {
    let qo = new ItemQueryObject();
    qo.nodeId = id;
    let storageKey = 0===parseInt(collection,10)?'current_node':'current_garbage_node';
    let actions = [
      dispatch(setLocalValue(storageKey, id)),
      dispatch(fetchNodes(id, data, collection))
    ];
    constants.CATALOGUE_COLLECTION===parseInt(collection,10)?
    actions.push(dispatch(fetchItems(qo))):
    actions.push(dispatch(purgeEmptyItems()),dispatch(pushResumable(id, collection)));
    return Promise.all(actions)
    .then(result=>{
      dispatch({
        type: NODE_CHOICE,
        payload: id
      });
    });
  };
}

/**
 * Получает данные о существующих ресурсах, привязанных к товару каталога
 * @param  {String} id Код 1С товара
 * @param  {Number} collection Тип коллекции (каталог/свалка)
 */
export function fetchExisting(id, collection){
  return (dispatch)=>{
    dispatch({
      type: EXISTING_RESOURCES_FETCH+START,
      payload: ''
    });
    let url = collection===0?utility.config.existing_uploads_url+id:utility.config.dump_existing_uploads_url+id;
    return fetch(url, {method: "GET"})
    .then(response=>response.json())
    .then((data)=>{
      dispatch({
        type: EXISTING_RESOURCES_FETCH+SUCCESS,
        payload: {
          id,resources:data
        }
      });
    }).catch((error)=>{
      dispatch({
        type: EXISTING_RESOURCES_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('server-error');
    });
  };
}

/**
 * Получает список сгенерированных пресетов для ресурса
 * @param  {Object} pagination Данные пагинации. Начало, лимит
 * @param  {Object[]} existing   Данные о существующих ресурсах
 */
export function fetchPresets(pagination, existing, id){
  return (dispatch)=>{
    dispatch({
      type: EXISTING_PRESETS_FETCH+START,
      payload: ''
    });
    return ResourceService.fetchExistingPresets(pagination, existing)
    .then((data)=>{
      dispatch({
        type: EXISTING_PRESETS_FETCH+SUCCESS,
        payload: {
          id,presets:data
        }
      });
    }).catch((error)=>{
      dispatch({
        type: EXISTING_PRESETS_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('server-error');
    });
  };
}

/**
 * Выбирает активный товар
 * @param  {String} id Код 1С товара
 */
export function chooseItem(id, collection){
  return dispatch=>{
    let actions = [
      dispatch(purgeEmptyItems()),
      dispatch(pushResumable(id, collection)),
      dispatch(setLocalValue('current_item',id)),
    ];
    return Promise.all(actions)
    .then(result=>{
      dispatch({
        type: ITEM_CHOICE,
        payload: id
      });
    });
  };
}

/**
 * Получает товары по разделу каталога
 * @param  {ItemQueryObject} query Объект поиска
 */
export function fetchItems(query){
  return (dispatch)=>{
    dispatch({
      type: ITEMS_FETCH+START,
      payload: ''
    });
    return ItemService.fetchItems(query)
    .then((data)=>{
      dispatch({
        type: ITEMS_FETCH+SUCCESS,
        payload: data
      });
    }).catch((error)=>{
      dispatch({
        type: ITEMS_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('server-error');
    });
  };
}

/**
 * Выполняет обработку файла перед отправкой на сервер
 * @param  {ResumableFile} file     Объект файла из resumable.js
 * @param  {Object[]} existing Данные о существующих ресурсах товара
 * @param  {Object} item     Объект товара, к которому относится загрузка
 */
export function prepareFileForUpload(file, existing, item){
  return (dispatch)=>{
    const itemId = item.id;
    const itemCode = item.itemCode;
    return UploadService.processFile(file, existing, item)
    .then((uniqueIdentifier)=>{
      let fileParams = {uniqueIdentifier,itemId,itemCode,file};
      dispatch({
        type: FILE_PROCESSED,
        payload: fileParams
      });
      UploadService.commitUpload(fileParams,existing);
    });
  };
}

/**
 * Удаляет активную или незаконченную загрузку
 * @param  {String} filehash Сгенерированный хеш-идентификатор загрузки
 * @param  {String} item     Код 1С товара
 */
export function deleteUpload(filehash, item){
  return (dispatch)=>{
    return UploadService.deleteUpload(filehash,item)
    .then((response)=>{
      dispatch({
        type: UPLOAD_DELETE,
        payload: {hash:filehash,item}
      });
    }).catch((e)=>{
      NotificationService.throw('remove-upload-error');
    });
  };
}

/**
 * Удаляет записи об активных загрузках, запрашивает информацию о существующих ресурсах и незаконченных загрузках после завершения загрузки на сервер
 * @param  {[type]} id    [description]
 * @param  {[type]} files [description]
 * @return {[type]}       [description]
 */
export function completeUpload(id, files, collection){
  return dispatch=>{
    return dispatch(deletePendingUploads(id,files))
    .then(()=>{
      dispatch(fetchItemData(id,collection));
      dispatch(fetchExisting(id,collection));
      dispatch(fetchUnfinished());
      NotificationService.toast('up-done');
    });
  };
}

/**
 * Удаляет записи об активных загрузках
 * @param  {String} id    Код 1С товара
 * @param  {ResumableFile[]} files Объекты загрузок из resumable.js
 */
export function deletePendingUploads(id, files){
  return dispatch=>{
    let deleteStack = [];
    files.forEach(file=>{deleteStack.push(dispatch(deleteUpload(file.uniqueIdentifier, id)));});
    return Promise.all(deleteStack,(result)=>{
      dispatch({
        type:DELETE_ALL_PENDING,
        payload:id
      });
    });
  };
}

/**
 * Удаляет записи о незаконченных загрузках
 * @param  {Object} uploads Объекты загрузок
 * @param  {String} id      Код 1С товара
 */
export function deleteUnfinishedUploads(uploads, id){
  return dispatch=>{
    let deleteStack = [];
    uploads.forEach((upload)=>{deleteStack.push(dispatch(deleteUpload(upload.file_hash, id)));});
    return Promise.all(deleteStack,(result)=>{
      dispatch({
        type:DELETE_ALL_UNFINISHED,
        payload:id
      });
    });
  };
}

/**
 * Устанавливает значение переменной localstorage по ключу
 * @param {String} key   Ключ параметра
 * @param {String} value Новое значение
 */
export function setLocalValue(key,value){
  return dispatch=>{
    if(typeof value !== "undefined" && value !== null){
      LocalStorageService.set(key,value);
      return dispatch({
        type:LOCAL_STORAGE_VALUE_SET,
        payload:{key,value}
      });
    }
  };
}

/**
 * Добавляет значение к массиву localstorage по ключу
 * @param {String} key   Ключ параметра
 * @param {String} add Новое значение
 */
export function addToLocalValue(key,add){
  return dispatch=>{
    LocalStorageService.addTo(key,add);
    let value = LocalStorageService.getList(key);
    return dispatch({
      type:LOCAL_STORAGE_VALUE_SET,
      payload:{key,value}
    });
  };
}

/**
 * Удаляет значение из массива localstorage по ключу
 * @param {String} key   Ключ параметра
 * @param {String} remove Новое значение
 */
export function spliceFromLocalValue(key,remove){
  return dispatch=>{
    LocalStorageService.removeFrom(key,remove);
    let value = LocalStorageService.getList(key);
    return dispatch({
      type:LOCAL_STORAGE_VALUE_SET,
      payload:{key,value}
    });
  };
}

/**
 * Сбравывает список файлов для скачивания в localStorage
 */
export function clearDownloads(){
  return dispatch=>{
    LocalStorageService.set("pending_downloads", "");
    let value = LocalStorageService.getList("pending_downloads");
    return dispatch({
      type:LOCAL_STORAGE_VALUE_SET,
      payload:{key:"pending_downloads",value}
    });
  };
}

/**
 * Получает значение переменной localStorage, либо всех переменных localStorage, если ключ не указан
 * @param  {String} [key=null] Ключ переменной
 */
export function getLocalStorage(key = null){
  return dispatch=>{
    const data = LocalStorageService.get(key);
    return dispatch({
      type:LOCAL_STORAGE_VALUE_SET+(!key&&ALL),
      payload:data
    });
  };
}

/**
 * Выбирает тип предсавления для элементов списка загрузок и существующих ресурсов
 * @param  {Number} [id=1] id типа представления
 */
export function chooseListViewType(id=1){
  return dispatch=>{
    return dispatch(setLocalValue('list_view_type', id));
  };
}

/**
 * Выбирает тип предсавления для браузера каталога
 * @param  {Number} [id=1] id типа представления
 */
export function chooseCatalogueViewType(id=1){
  return dispatch=>{
    return dispatch(setLocalValue('catalogue_view', id));
  };
}

/**
 * Удаляет из памяти товары, для которых нет активных и незаконченных загрузок
 */
export function purgeEmptyItems(){
  return {
      type:PURGE_EMPTY_ITEMS,
      payload: ""
    };
}

/**
 * Запрашивает информацию о текущем пользователе
 */
export function getUserInfo(){
  return dispatch=>{
    return fetch("/account/getinfo/", {method:"GET"})
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: USER_INFO_FETCH+SUCCESS,
        payload: response,
      });
    }).catch((error)=>{
      dispatch({
        type: USER_INFO_FETCH+FAIL,
        payload: "",
      });
      NotificationService.throw('server-error');
    });
  };
}

/**
 * Получает данные одного товара по коду 1С
 * @param  {String} id Код 1С товара
 */
export function fetchItemData(id, collection){
  return dispatch=>{
    let url = collection===constants.CATALOGUE_COLLECTION?"/catalogue/node/item/":"/garbage/node/";
    return fetch(url+id, {method:"GET"})
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: ITEM_INFO_FETCH+SUCCESS,
        payload: response,
      });
    }).catch((error)=>{
      dispatch({
        type: ITEM_INFO_FETCH+FAIL,
        payload: "",
      });
      NotificationService.throw('server-error');
    });
  };
}

/**
 * Добавляет ресурс к списку для скачивания
 * @param {Number} id Id ресурса
 */
export function addResourceToDownloads(id){
  return dispatch=>{
    return dispatch(addToLocalValue('pending_downloads',id));
  };
}

/**
 * Обновляет поле тип/приоритет ресурса
 * @param  {Object} params Данные для обновления
 */
export function updateResourceField(params, collection){
  return dispatch=>{
    let fetchBody = {
      id:params.file.id,
      type:params.file.type
    };
    fetchBody[params.key] = params.value;
    return fetch(utility.config.resource_url+params.file.id, {method:"PATCH", body:JSON.stringify(fetchBody)})
    .then(response=>{
      dispatch(fetchExisting(params.item,collection));
    });
  };
}

/**
 * Отправляет на сервер запрос на поиск товаров
 * @param  {ItemQueryObject} query Объект поиска
 */
export function searchItems(query){
  return dispatch=>{
    let qo = new ItemQueryObject();
    Object.keys(query).forEach(key=>{
      qo[key]=query[key];
    });
    return dispatch(fetchItems(qo));
  };
}

/**
 * Отправляет на сервер запрос на поиск нод свалки
 * @param  {GarbageQueryObject} query Объект поиска
 */
export function searchGarbage(query){
  return dispatch=>{
    let fetchBody = {"node_name":query.node_name||"","file_name":query.file_name||""};
    let getParams = "?"+Object.entries(fetchBody).map(entry=>entry[0]+"="+entry[1]).join("&");
    return fetch(utility.config.garbage_search_url+getParams)
    .then((response)=>response.json())
    .then((data)=>{
      dispatch({
        type:GARBAGE_SEARCH+SUCCESS,
        payload:data
      });
      dispatch({
        type:CATALOGUE_DATA_FETCH+SUCCESS,
        payload:data
      });
    });
  };
}

/**
 * Устанавливает значение массива разделов каталога для создания хлебных крошек к текущему разделу
 * @param  {Object[]} data Данные каталога
 * @param  {String} node Код 1С текущего раздела
 */
export function pushCrumbs(data, node){
    let crumbs = CatalogueService.getCrumbs(data,node);
    return {
      type: CRUMBS_UPDATE,
      payload: crumbs
    };
}

/**
 * Удаляет файл из списка для скачивания
 * @param  {Number} id Id файла
 */
export function removeDownload(id){
  return dispatch=>{
    return dispatch(spliceFromLocalValue("pending_downloads", id));
  };
}

/**
 *  Получает доп поля для скачиваемых ресурсов
 *  @param {Number[]} resources Массив id ресурсов для скачивания
 */
export function getDownloadResourceData(resources){
  return dispatch=>{
    let downloads = [];
    return ResourceService.getResource(resources)
    .then((res)=>{
      for(var r in res){
        if(res[r] == ""){continue;}
        downloads.push({
          "id": res[r].id,
          "preset": Object.keys(utility.config.presets)[res[r].preset],
          "name": res[r].src_filename,
          "sizepx": res[r].size_px
        });
      }
      dispatch({
        type: DOWNLOAD_DATA_FETCH+SUCCESS,
        payload: downloads
      });
    });
  };
}

/**
 *  Скачивает ресурсы из очереди
 *  @param {Number[]} resources Массив id ресурсов для скачивания
 */
export function downloadResources(resources){
  return dispatch=>{
    ResourceService.downloadResource(resources);
    dispatch(clearDownloads());
  };
}

/**
 * Выбор типа коллекции для отображения в дереве каталога
 * @param {Number} type Тип коллекции. 0-каталог 1-свалка
 */
export function chooseCollectionType(type){
  return dispatch=>{
    dispatch(setLocalValue('collection_type', type));
    return dispatch({
      type: CHOOSE_COLLECTION,
      payload: type
    });
  };
}

/**
 * Создает новую ноду свалки
 * @param {String} name   Имя новой ноды
 * @param {Number} parent Id родителя
 * @param {Object} data   Структура каталога
 * @param {Number} type   Тип коллекции
 */
export function addGarbageNode(name,parent,data,type){
  return dispatch=>{
    let body = JSON.stringify({name,parent});
    return fetch(utility.config.add_garbage_node_url,{method:"POST", body})
    .then((response)=>{
      if(response.ok){
        dispatch({
          type: NODE_CREATE+SUCCESS,
          payload: name
        });
      }else{
        dispatch({
          type: NODE_CREATE+FAIL,
          payload: name
        });
        NotificationService.throw('node-create-fail');
      }
      dispatch(fetchNodes(parent,data,type));
    }).catch((e)=>{
      dispatch({
        type: NODE_CREATE+FAIL,
        payload: e
      });
      NotificationService.throw('node-create-fail');
    });
  };
}

/**
 * Обновляет ноду свалки
 * @param {Number} id     Id ноды для обновления
 * @param {String} name   Имя новой ноды
 * @param {Number} parent Id родителя
 * @param {Object} data   Структура каталога
 * @param {Number} type   Тип коллекции
 */
export function updateGarbageNode(id,name,parent,data,type){
  return dispatch=>{
    let body = JSON.stringify(Object.assign({},{id,name,parent}));
    return fetch(utility.config.update_garbage_node_url,{method:"POST", body})
    .then((response)=>{
      if(response.ok){
        dispatch({
          type: NODE_UPDATE+SUCCESS,
          payload: id
        });
      }else{
        dispatch({
          type: NODE_UPDATE+FAIL,
          payload: id
        });
        NotificationService.throw('node-update-fail');
      }
      dispatch(fetchNodes(parent,data,type));
    }).catch((e)=>{
      dispatch({
        type: NODE_UPDATE+FAIL,
        payload: e
      });
      NotificationService.throw('node-update-fail');
    });
  };
}

/**
 * Удаляет ноду свалки
 * @param {Number} id     Id ноды для обновления
 * @param {Number} parent Id родителя
 * @param {Object} data   Структура каталога
 * @param {Number} type   Тип коллекции
 */
export function removeGarbageNode(id,parent,data,type){
  return dispatch=>{
    let body = JSON.stringify({id});
    return fetch(utility.config.remove_garbage_node_url,{method:"POST", body})
    .then((response)=>{
      if(response.ok){
        dispatch({
          type: NODE_REMOVE+SUCCESS,
          payload: id
        });
      }else{
        dispatch({
          type: NODE_REMOVE+FAIL,
          payload: id
        });
        NotificationService.throw('node-remove-fail');
      }
    }).catch((e)=>{
      dispatch({
        type: NODE_REMOVE+FAIL,
        payload: id
      });
      NotificationService.throw('node-remove-fail');
    });
  };
}

/**
 * Восстанавливает ноду свалки
 * @param {Number} id     Id ноды для обновления
 * @param {Number} parent Id родителя
 * @param {Object} data   Структура каталога
 * @param {Number} type   Тип коллекции
 */
export function restoreGarbageNode(id,parent,data,type){
  return dispatch=>{
    let body = JSON.stringify({id});
    return fetch(utility.config.restore_garbage_node_url,{method:"POST", body})
    .then((response)=>{
      if(response.ok){
        dispatch({
          type: NODE_RESTORE+SUCCESS,
          payload: id
        });
        dispatch(fetchNodes(parent,data,type));
      }else{
        dispatch({
          type: NODE_RESTORE+FAIL,
          payload: id
        });
        NotificationService.throw('node-restore-fail');
      }
    }).catch((e)=>{
      dispatch({
        type: NODE_RESTORE+FAIL,
        payload: id
      });
      NotificationService.throw('node-restore-fail');
    });
  };
}

/**
 * Начало перемещения ноды свалки
 */
export function startNodeRebase(){
  return dispatch=>{
    dispatch({
      type:NODE_REBASE+START,
      payload:''
    });
  };
}

/**
 * Конец перемещения ноды свалки
 */
export function stopNodeRebase(data, type, node_id=null, parent_id=null){
  return dispatch=>{
    dispatch(updateGarbageNode(node_id, null, parent_id, data, type)).then((result)=>{
      dispatch({
        type:NODE_REBASE+SUCCESS,
        payload:{node_id, parent_id}
      });
    });
  };
}

/**
 * Показать удаленные ноды свалки
 */
export function showDeletedNodes(val){
  return dispatch=>{
    dispatch({
      type: SHOW_DELETED,
      payload:val
    });
  };
}
