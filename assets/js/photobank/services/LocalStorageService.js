import $ from 'jquery';

class LocalStorageService{
  constructor(){
  }
  static _getKeys(){
    let keys = {
      "current_node": "pb_data_catalogue_current_node",
      "current_item": "pb_data_current_item",
      "pending_downloads": "pb_data_download_list",
      "list_view_type": "pb_data_list_view_type"
    }
    return keys;
  }
  static init(){
    if(typeof window.localStorage.photobank_data == "undefined"){
      window.localStorage.photobank_data = "set";
      window.localStorage.pb_data_catalogue_current_node = "1";
      window.localStorage.pb_data_current_item = "1";
      window.localStorage.pb_data_downloads = "";
      window.localStorage.pb_data_list_view_type = "1";
    }
  }

  static set(key, value){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(key) != -1){
      window.localStorage[keys[key]] = value;
    }
  }

  static get(key){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(key) != -1 && typeof window.localStorage[keys[key]] != "undefined"){
      return window.localStorage[keys[key]];
    } else {
      return null;
    }
  }

  static addTo(list, value){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(list) != -1){
      let val = window.localStorage[keys[list]] + " " + value;
      window.localStorage[keys[list]] = val;
    }
  }

  static removeFrom(list, value){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(list) != -1){
      let val = window.localStorage[keys[list]];
      let listArr = val.split(" ");
      let result = "";
      listArr.splice(listArr.indexOf(value),1);
      for(var item in listArr){
        if(listArr[item] == ""){continue}
        result = result + listArr[item]+" ";
      }
      window.localStorage[keys[list]] = result;
    }
  }

  static getList(list, delimiter=" "){
    let keys = this._getKeys();
    if(Object.keys(keys).indexOf(list) != -1){
      let storedList = window.localStorage[keys[list]];
      if(typeof storedList == "undefined" || storedList == null){
        return [];
      }
      let splitList = storedList.split(delimiter);
      return splitList;
    }
  }

}



export {LocalStorageService}
