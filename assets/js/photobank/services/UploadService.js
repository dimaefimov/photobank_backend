import $ from 'jquery';
import { hex_md5 } from '../../vendor/md5';
import utility from './UtilityService';

/**
 * Сервис для работы с загрузками на сервер
 */
class UploadService{

  constructor(){
    this.fileHashStack = [];
  }

  /**
   * Получает полный список незавершенных загрузок с сервера
   */
  static fetchUnfinished(){
    let unfinished = [];
    return new Promise((resolve, reject)=>{
      fetch(utility.config.unfinished_uploads_url,{'method':'GET'})
.then((data)=>{
        resolve(data);
      });
    });
  }

  /**
   * Создает инстансы Resumable.js для товаров, с незаконченными загрузками
   * @param {Object[]} container Контейнер для всех инстансев Resumable
   * @param {Object[]} uploads Загрузки, для которых нужно создать Resumable
   *
   * TODO сделать конфигурацию неглобальной
   */
  static populateResumableContainer(container, uploads){
    let newContainer = Object.assign({}, container);
    for(var upload in uploads){
      newContainer[uploads[upload]]=new Resumable({target: utility.config.upload_target_url});
    }
    return newContainer;
  }


  /**
   * Удаляет загрузки из списка незавершенных, если они были продолжены
   * @param  {Object[]} unfinished Массив объектов незаконченных загрузок
   * @param  {Object[]} pending Массив загрузок, готовых к отправке
   * @return {Object[]} Массив незаконченных загрузок, для которых нет соответствующего говотого к отправке файла
   */
  static resolveResumed(unfinished, pending){
    let resolved = unfinished.filter((unfin)=>{
      for(var i = 0; i<pending.length; i++){
        if(unfin.file_name == pending[i].fileName && unfin.file_hash == pending[i].uniqueIdentifier){
          return false;
        }
      }
      return true;
    });
    return resolved;
  }

  /**
   * Выполняет обработку файла перед загрузкой на сервер
   * @param  {String} file Содержание файла, который нужно отправить на сервер
   * @param  {Object[]} existingUploads Массив существующих готовых к отправке файлов
   * @param {String} itemId Код 1С товара
   */
  static processFile(file, existingUploads, itemId){
    return new Promise((resolve, reject)=>{
      this._getHash(file, itemId)
.then((uniqueIdentifier)=>{
        resolve(uniqueIdentifier);
      });
    });
  }

  /**
   * Удаляет запись о незаконченной загрузке с сервера
   * @param  {String} uniqueIdentifier Уникальная строка-идентификатор файла
   * @param  {String} itemId Код 1С товара
   */
  static deleteUpload(uniqueIdentifier, itemId){
    let obj = {
      'filehash': uniqueIdentifier,
      'itemid': itemId
    }
    let formData = new FormData();
    for(let i = 0; i<Object.keys(obj).length; i++){
      formData.set(Object.keys(obj)[i],obj[Object.keys(obj)[i]]);
    }
    return fetch(utility.config.remove_upload_url, {method: 'POST', body:formData});
  }

  /**
   * Получает сгенерированный ключ md5 для загружаемого файла
   * @param  {String} file Содержание файла, который нужно отправить на сервер
   * @param {Object} item Объект товара каталога
   */
  static _getHash(file, item){
    return new Promise((resolve, reject)=>{
      let fileObj = file.file;
      let reader = new FileReader();
      reader.onload = (e)=>{
        let hashable = e.target.result;
        hashable = new Uint8Array(hashable);
        hashable = CRC32.buf(hashable).toString();
        let identifier = hex_md5(hashable+item.id + file.file.size);
        resolve(identifier);
      };
      reader.readAsArrayBuffer(fileObj.slice(0,100000000));
    });
  }

  /**
   * Отправляет запрос на создание записи о начатой загрузке на сервер
   * @param  {Object} fileParams Параметры загрузки. Хеш-идентификатор, объект файла, код 1С товара
   * @param  {Object[]} existingUploads Массив существующих готовых к отправке файлов
   */
  static commitUpload(fileParams, existingUploads){
    return new Promise((resolve, reject)=>{
      let allowed = true;
      let self = existingUploads.indexOf(fileParams.file);
      for(var existingUpload in existingUploads){
        if(existingUploads[existingUpload].uniqueIdentifier == fileParams.uniqueIdentifier && existingUpload != self){
          allowed = false;
          existingUploads.splice(self, 1);
          resolve(false);
        }
      }
      if(allowed){
        let obj = {
          'filehash': fileParams.uniqueIdentifier,
          'filename': fileParams.file.fileName,
          'itemid': fileParams.itemId,
          'totalchuks': fileParams.file.chunks.length
        }
        let formData = new FormData();
        for(let i = 0; i<Object.keys(obj).length; i++){
          formData.set(Object.keys(obj)[i],obj[Object.keys(obj)[i]]);
        }
        fetch(utility.config.commit_upload_url, {method: 'POST', body: formData})
.then(()=>{
          resolve(true);
        });
      }
    });
  }

}

export {UploadService}
