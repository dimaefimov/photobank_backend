import {ItemQueryObject} from './ItemQueryObject';
import utility from './UtilityService';
import $ from 'jquery';

/**
 * Сервис для получения и обновления данных о товарах каталога
 */
class ItemService{
  constructor(){

  }
  /**
   * Получает список товаров, при необходимости запрашивает с сервера, фильтрует полученные данные
   * @param  {ItemQueryObject}  query  Объект поискового запроса
   */
  static fetchItems(query){
    return new Promise((resolve, reject)=>{
        this._getItems(query)
        .then((data)=>{
          if(data.length == 0){resolve([])}
          resolve(data);
        }).catch((e)=>{
          reject(e);
        });
    });
  }

  /**
   * Получает все данные товара каталога по его идентификатору
   * @param  {Number} id Идентификатор товара
   */
  static getIdentity(id){
    return new Promise((resolve,reject)=>{
        fetch(utility.config.item_url+id, {method: 'GET'})
.then((data)=>{
          resolve(data);
        });
    });
  }

  /**
   * Получает с сервера список товаров по поисковому объекту
   * @param  {ItemQueryObject}  queryObject  Объект поискового запроса
   */
  static _getItems(queryObject){
    return new Promise((resolve,reject)=>{
      if(!queryObject instanceof ItemQueryObject){reject("Invalid query object")}
      if(queryObject.nodeId != null){
        fetch(utility.config.get_items_url+queryObject.nodeId, {'method':'GET'})
        .then((response)=>response.json())
        .then((data)=>{
          resolve(data);
        }).catch((e)=>{reject([])});
      }else{
        let fetchBody = {"item_search_name":queryObject.name||"","item_search_code":queryObject.code||"","item_search_parent_name":queryObject.parent_name||"","item_search_search_nested":queryObject.search_nested, "item_search_article":queryObject.article||""};
        let getParams = "?"+Object.entries(fetchBody).map(entry=>entry[0]+"="+encodeURIComponent(entry[1])).join("&");
        fetch(utility.config.item_search_url+getParams)
        .then((response)=>response.json())
        .then((data)=>{
          resolve(data);
        }).catch((e)=>{reject(e)});
      }
    })
  }

  /**
   * Фильтрует полученные данные
   * @param  {Object[]} data Данные о товарах
   * @param  {String} query Строка фильтра
   */
  static _filterData(data, query){
    let filtered = [];
    if(query == ""){
      filtered = data;
    } else {
      filtered = data.filter((item)=>{return item.itemCode.toLowerCase().includes(query.toLowerCase()) || item.name.toLowerCase().includes(query.toLowerCase())});
    }
    return filtered;
  }

}

export {ItemService}
