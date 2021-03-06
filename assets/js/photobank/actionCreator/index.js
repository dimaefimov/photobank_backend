import {UploadService, NotificationService, CatalogueService, ResourceService, ItemQueryObject, ItemService, LocalStorageService} from '../services/';
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
  START,
  SUCCESS,
  FAIL,
  ALL
} from '../constants/';

/**
 * Инициализвация приложения. Получает конфигурацию, данные из localStorage, незаконченные загрузки и данные о текущем пользователе
 */
export function init(){
  return dispatch=>{
    return Promise.all([
      utility.fetchConfig(),
      utility.initLocalstorage(),
    ]).then(()=>{
      Promise.all([
        getLocalStorage()(dispatch),
        fetchUnfinished()(dispatch),
        getUserInfo()(dispatch),
      ]);
    }).catch((e)=>{
      console.log(e);
    });
  }
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
        dispatch({
          type: RESUMABLE_PUSH,
          payload: item.id
        });
      });
    }).catch((error)=>{
      console.log(error);
      dispatch({
        type: UPLOADS_UNFINISHED_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('custom',error);
    });
  }
}

/**
 * Добавляет товар в контейнер resumable.js
 * @param  {[String]} itemId Код 1С товара
 */
export function pushResumable(itemId){
  return {
    type: RESUMABLE_PUSH,
    payload: itemId
  }
}

/**
 * Рекурсивно запрашивает структура каталога от текущего раздела до корня
 * @param  {Number} id Id текущего раздела
 */
export function fetchRootNodes(id){
  return (dispatch)=>{
    dispatch({
      type: CATALOGUE_ROOT_NODES_FETCH+START,
      payload: id
    });
    return CatalogueService.fetchRootNodes(id).then((data)=>{
      dispatch({
        type: CATALOGUE_ROOT_NODES_FETCH+SUCCESS,
        payload: data
      });
    }).catch((error)=>{
      console.log(error);
      dispatch({
        type: CATALOGUE_ROOT_NODES_FETCH+FAIL,
        payload: id
      });
      NotificationService.throw('custom',error);
    });
  }
}

/**
 * Получает дочерние разделы каталога по id родителя
 * @param  {Number} id   Код 1C родителя
 * @param  {Object[]} data Уже имеющиеся данныe каталога
 */
export function fetchNodes(id, data){
  return (dispatch)=>{
    if(data.length === 0){
      return dispatch(fetchRootNodes(id));
    }
    dispatch({
      type: CATALOGUE_DATA_FETCH+START,
      payload: ''
    });
    return CatalogueService.fetchNodes(id)
    .then((response)=>response.json())
    .then((data)=>{
      dispatch({
        type: CATALOGUE_DATA_FETCH+SUCCESS,
        payload: data
      });
    }).catch((error)=>{
      console.log(error);
      dispatch({
        type: CATALOGUE_DATA_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('custom',error);
    });
  }
}

/**
 * Выбирает кативный раздел каталога
 * @param  {String} id   Код 1С раздела каталога
 * @param  {Object[]} data Уже имеющиеся данныe каталога
 */
export function chooseNode(id, data){
  return (dispatch)=> {
    let qo = new ItemQueryObject();
    qo.nodeId = id;
    let actions = [
      dispatch(fetchItems(qo)),
      dispatch(setLocalValue('current_node', id)),
      dispatch(fetchNodes(id, data))
    ];
    return Promise.all(actions).then(result=>{
      dispatch({
        type: NODE_CHOICE,
        payload: id
      })
    });
  }
}

/**
 * Получает данные о существующих ресурсах, привязанных к товару каталога
 * @param  {String} id Код 1С товара
 */
export function fetchExisting(id){
  return (dispatch)=>{
    dispatch({
      type: EXISTING_RESOURCES_FETCH+START,
      payload: ''
    });
    return ResourceService.fetchExisting(id).then((data)=>{
      dispatch({
        type: EXISTING_RESOURCES_FETCH+SUCCESS,
        payload: data
      });
    }).catch((error)=>{
      console.log(error);
      dispatch({
        type: EXISTING_RESOURCES_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('custom',error);
    });
  }
}

/**
 * Получает список сгенерированных пресетов для ресурса
 * @param  {Object} pagination Данные пагинации. Начало, лимит
 * @param  {Object[]} existing   Данные о существующих ресурсах
 */
export function fetchPresets(pagination, existing){
  return (dispatch)=>{
    dispatch({
      type: EXISTING_PRESETS_FETCH+START,
      payload: ''
    });
    return ResourceService.fetchExistingPresets(pagination, existing).then((data)=>{
      dispatch({
        type: EXISTING_PRESETS_FETCH+SUCCESS,
        payload: data
      });
    }).catch((error)=>{
      dispatch({
        type: EXISTING_PRESETS_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('custom',error);
    });
  }
}

/**
 * Выбирает активный товар
 * @param  {String} id Код 1С товара
 */
export function chooseItem(id){
  return dispatch=>{
    let actions = [
      dispatch(pushResumable(id)),
      dispatch(purgeEmptyItems()),
      dispatch(setLocalValue('current_item',id)),
    ];
    return Promise.all(actions).then(result=>{
      dispatch({
        type: ITEM_CHOICE,
        payload: id
      });
    })
  }
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
      console.log(error);
      dispatch({
        type: ITEMS_FETCH+FAIL,
        payload: ''
      });
      NotificationService.throw('custom',error);
    });
  }
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
    return UploadService.processFile(file, existing, item).then((uniqueIdentifier)=>{
      let fileParams = {uniqueIdentifier,itemId,itemCode,file};
      dispatch({
        type: FILE_PROCESSED,
        payload: fileParams
      });
      UploadService.commitUpload(fileParams,existing);
    });
  }
}

/**
 * Удаляет активную или незаконченную загрузку
 * @param  {String} filehash Сгенерированный хеш-идентификатор загрузки
 * @param  {String} item     Код 1С товара
 */
export function deleteUpload(filehash, item){
  return (dispatch)=>{
    return UploadService.deleteUpload(filehash,item).then((response)=>{
      dispatch({
        type: UPLOAD_DELETE,
        payload: {hash:filehash,item}
      });
    }).catch((e)=>{
      console.log(e);
      NotificationService.throw('custom', e)
    });
  }
}

/**
 * Удаляет записи об активных загрузках, запрашивает информацию о существующих ресурсах и незаконченных загрузках после завершения загрузки на сервер
 * @param  {[type]} id    [description]
 * @param  {[type]} files [description]
 * @return {[type]}       [description]
 */
export function completeUpload(id, files){
  return dispatch=>{
    return dispatch(deletePendingUploads(id,files)).then(()=>{
      dispatch(fetchExisting(id));
      dispatch(fetchUnfinished());
    });
  }
}

/**
 * Удаляет записи об активных загрузках
 * @param  {String} id    Код 1С товара
 * @param  {ResumableFile[]} files Объекты загрузок из resumable.js
 */
export function deletePendingUploads(id, files){
  return dispatch=>{
    let deleteStack = [];
    files.forEach(file=>{deleteStack.push(dispatch(deleteUpload(file.uniqueIdentifier, id)))});
    return Promise.all(deleteStack,(result)=>{
      dispatch({
        type:DELETE_ALL_PENDING,
        payload:id
      })
    });
  }
}

/**
 * Удаляет записи о незаконченных загрузках
 * @param  {Object} uploads Объекты загрузок
 * @param  {String} id      Код 1С товара
 */
export function deleteUnfinishedUploads(uploads, id){
  return dispatch=>{
    let deleteStack = [];
    uploads.forEach((upload)=>{deleteStack.push(dispatch(deleteUpload(upload.file_hash, id)))});
    return Promise.all(deleteStack,(result)=>{
      dispatch({
        type:DELETE_ALL_UNFINISHED,
        payload:id
      })
    });
  }
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
  }
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
  }
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
  }
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
  }
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
  }
}

/**
 * Выбирает тип предсавления для элементов списка загрузок и существующих ресурсов
 * @param  {Number} [id=1] id типа представления
 */
export function chooseListViewType(id=1){
  return dispatch=>{
    return dispatch(setLocalValue('list_view_type', id));
  }
}

/**
 * Выбирает тип предсавления для браузера каталога
 * @param  {Number} [id=1] id типа представления
 */
export function chooseCatalogueViewType(id=1){
  return dispatch=>{
    return dispatch(setLocalValue('catalogue_view', id));
  }
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
    });
  }
}

/**
 * Получает данные одного товара по коду 1С
 * @param  {String} id Код 1С товара
 */
export function fetchItemData(id){
  return dispatch=>{
    return fetch("/catalogue/node/item/"+id, {method:"GET"})
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
    });
  }
}

/**
 * Добавляет ресурс к списку для скачивания
 * @param {Number} id Id ресурса
 */
export function addResourceToDownloads(id){
  return dispatch=>{
    return dispatch(addToLocalValue('pending_downloads',id));
  }
}

/**
 * Обновляет поле тип/приоритет ресурса
 * @param  {Object} params Данные для обновления
 */
export function updateResourceField(params){
  return dispatch=>{
    let fetchBody = {
      id:params.file.id,
      type:params.file.type
    };
    fetchBody[params.key] = params.value;
    return fetch(utility.config.resource_url+params.file.id, {method:"PATCH", body:JSON.stringify(fetchBody)}).then(response=>{
      dispatch(fetchExisting(params.item));
    });
  }
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
  }
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
    return dispatch(spliceFromLocalValue("pending_downloads", id))
  }
}

/**
 *  Получает доп поля для скачиваемых ресурсов
 *  @param {Number[]} resources Массив id ресурсов для скачивания
 */
export function getDownloadResourceData(resources){
  return dispatch=>{
    let downloads = [];
    return ResourceService.getResource(resources).then((res)=>{
      for(var r in res){
        if(res[r] == ""){continue;}
        downloads.push({
          "id": res[r].id,
          "preset": Object.keys(utility.config["presets"])[res[r].preset],
          "name": res[r].src_filename,
          "sizepx": res[r].size_px
        });
      }
      dispatch({
        type: DOWNLOAD_DATA_FETCH+SUCCESS,
        payload: downloads
      });
    });
  }
}

/**
 *  Скачивает ресурсы из очереди
 *  @param {Number[]} resources Массив id ресурсов для скачивания
 */
export function downloadResources(resources){
  return dispatch=>{
    ResourceService.downloadResource(resources);
    dispatch(clearDownloads());
  }
}
