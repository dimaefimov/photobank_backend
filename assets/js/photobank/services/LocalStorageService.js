import $ from 'jquery';
import utility from './UtilityService';
import * as constants from '../constants';

/**
 * Сервис для работы с данными, сохраненными в localstorage браузера пользователя
 */
class LocalStorageService{
  constructor(){
  }
  /**
   * Возвращает массив, устанавливающий соответствие между ключми хранящихся значений и названиями переменных в localstorage
   * @return {string[]} Массив в виде [ключ=>переменная]
   */
  static _getKeys(){
    let keys = {
      "current_node": "pb_data_catalogue_current_node",
      "current_garbage_node": "pb_data_catalogue_current_garbage_node",
      "current_item": "pb_data_current_item",
      "pending_downloads": "pb_data_download_list",
      "list_view_type": "pb_data_list_view_type",
      "catalogue_view": "pb_data_catalogue_view_type",
      "pagination_limit": "pb_data_pagination_limit",
      "collection_type": "pb_data_collection_type",
      "catalogue_basis": "pb_data_catalogue_basis",
      "itemlist_basis": "pb_data_itemlist_basis",
    }
    return keys;
  }
  /**
   * Устанавливает изначальные значения переменных для корректной работы
   */
  static init(){
    if(utility.localStorage.getItem('photobank_data') !== constants.LOCALSTORAGE_VERSION){
      utility.localStorage.setItem('photobank_data',constants.LOCALSTORAGE_VERSION);
      utility.localStorage.setItem('pb_data_current_item',"");
      utility.localStorage.setItem('pb_data_download_list',"");
      utility.localStorage.setItem('pb_data_list_view_type',constants.RESOURCE_VIEW_TYPES.large);
      utility.localStorage.setItem('pb_data_catalogue_view_type',constants.CATALOGUE_VIEW_TYPES.tree);
      utility.localStorage.setItem('pb_data_pagination_limit',constants.DEFAULT_PAGINATION_LIMIT);
      utility.localStorage.setItem('pb_data_collection_type',constants.CATALOGUE_COLLECTION);
      utility.localStorage.setItem('pb_data_catalogue_basis',constants.DRAGGABLE_CATALOGUE_BASIS);
      utility.localStorage.setItem('pb_data_itemlist_basis',constants.DRAGGABLE_ITEMLIST_BASIS);
    }
  }

  /**
   * Устанавливает значение одной переменной
   * @param {String} key Ключ, соответсвующий переменной localstorage
   * @param {String} value Значение переменной для редактирования
   */
  static set(key, value){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(key) != -1){
      utility.localStorage.setItem(keys[key], value);
    }
  }

  /**
   * Получает значение одной переменной
   * @param {String} key Ключ, соответсвующий переменной localstorage
   */
  static get(key){
    if(key==null){return this.getAll();}
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(key) != -1 && typeof utility.localStorage.getItem(keys[key]) != "undefined"){
      return utility.localStorage.getItem(keys[key]);
    } else {
      return null;
    }
  }

  /**
   * Конкатенирует строковое значение переменной с входящей строкой через пробел
   * @param {[type]} list  [description]
   * @param {String} value Значение переменной для редактирования
   */
  static addTo(list, value){
    if(typeof value == 'undefined'){return null}
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(list) != -1){
      let val = utility.localStorage.getItem(keys[list]);
      let splitVal = val.split(" ").filter(item=>item!==""&&item!==value);
      splitVal.push(value);
      utility.localStorage.setItem(keys[list], splitVal.join(" "));
    }
  }

  /**
   * Удаляет часть строки переменной
   * @param {[type]} list [description]
   * @param {String} value Значение переменной для редактирования
   */
  static removeFrom(list, value){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(list) != -1){
      let val = utility.localStorage.getItem(keys[list]);
      let listArr = val.split(" ");
      let result = "";
      listArr.splice(listArr.indexOf(value.toString()),1).filter(item=>item!=="");
      for(var item in listArr){
        if(listArr[item] == "" || listArr[item] == "undefined"){continue}
        result = result + listArr[item]+" ";
      }
      utility.localStorage.setItem(keys[list], result);
    }
  }

  /**
   * Получает строковое значение переменной localstorage в виде массива
   * @param {String} list Ключ переменной localstorage
   * @param {String} [delimiter=" "] Разделитель для разбора массива
   */
  static getList(list, delimiter=" "){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(list) != -1){
      let storedList = utility.localStorage.getItem(keys[list]);
      if(typeof storedList == "undefined" || storedList == null){
        return [];
      }
      let splitList = storedList.split(delimiter).filter(item=>item!=="");
      for(var item in splitList){
        if(splitList[item] == "undefined"){
          splitList.splice(item, 1);
        }
      }
      return splitList;
    }
  }

  static setList(list, input, delimiter=" "){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(list) != -1){
      let storedList = utility.localStorage.getItem(keys[list]);
      if(typeof storedList == "undefined" || storedList == null){
        return false;
      }
      let newValue = input.join(delimiter);
    }
  }

  /**
   * Удаляет переменную из localstorage
   * @param {String} key Ключ, соответсвующий переменной localstorage
   */
  static unset(key){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(key) != -1 && typeof utility.localStorage.getItem(keys[key]) != "undefined"){
      utility.localStorage.removeItem(keys[key]);
    }
  }

  static getAll(){
    this.init();
    let keys=this._getKeys();
    let response = {};
    Object.keys(keys).forEach(key=>{
      if(key == "pending_downloads"){
        response[key] = this.getList(key)
      }else{
        response[key] = this.get(key);
      }
    });
    return response;
  }

}

export {LocalStorageService}
