import {NotificationService} from '../../../services/NotificationService';
import {
  USER_INFO_FETCH,
  RESOURCE_PRESETS_FETCH,
  RESOURCE_TYPES_FETCH,
  LINK_CHOICE,
  LINK_ADD,
  LINK_STOP_EDITING,
  RESOURCE_SEARCH,
  RESOURCE_CHOICE,
  RESOURCE_THUMBNAIL,
  RESOURCE_ADD,
  RESOURCE_REMOVE,
  LINK_FETCH,
  LINK_SUBMIT,
  LINK_DELETE,
  LINK_UPDATE,
  LINKS_TXT_DOWNLOAD,
  SUCCESS,
  FAIL
} from '../constants';

export function init(){
  return (dispatch)=>{
    let params = {
      method: "GET",
    }
    fetch("/catalogue/resource/presets/", params)
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: RESOURCE_PRESETS_FETCH+SUCCESS,
        payload: response,
      });
      dispatch(fetchLinks());
    }).catch((error)=>{
      dispatch({
        type: RESOURCE_PRESETS_FETCH+FAIL,
        payload: response,
      });
    });
    fetch("/catalogue/resource/types/", params)
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: RESOURCE_TYPES_FETCH+SUCCESS,
        payload: response,
      });
      dispatch(fetchLinks());
    }).catch((error)=>{
      dispatch({
        type: RESOURCE_TYPES_FETCH+FAIL,
        payload: "",
      });
    });
    fetch("/account/getinfo/", params)
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: USER_INFO_FETCH+SUCCESS,
        payload: response,
      });
      dispatch(fetchLinks());
    }).catch((error)=>{
      dispatch({
        type: USER_INFO_FETCH+FAIL,
        payload: "",
      });
    });
  }
}

export function chooseLink(id){
  return {
    type: LINK_CHOICE,
    payload: id
  }
}

export function addLink(){
  return {
    type: LINK_ADD,
    payload: ''
  }
}

export function stopEditing(){
  return {
    type: LINK_STOP_EDITING,
    payload: ''
  }
}

// export function getResourceThumbnails(resources){
//   return (dispatch)=>{
//     let params = {
//       method: "GET",
//     }
//     resources.forEach((resource)=>{
//       fetch("/catalogue/node/item/resource/thumbnail/"+resource.gid,params)
//       .then((response)=>response.json())
//       .then((response)=>{
//           dispatch({
//             type: RESOURCE_THUMBNAIL+SUCCESS,
//             payload: {
//                 'id':resource.id,
//                 'thumbnail_id':response.id
//             },
//           });
//       }).catch((error)=>{
//         console.error(error);
//         }
//       );
//     });
//   }
// }

export function getResourceThumbnails(resources){
  return (dispatch)=>{
    let request = {resources:[]};
    resources.forEach((resource)=>{
      request.resources.push(resource.id);
    });
    let params = {
      method: "POST",
      body: JSON.stringify(request)
    }
    fetch("/catalogue/node/item/resource/thumbnails/",params)
    .then((response)=>response.json())
    .then((payload)=>{
        dispatch({
          type: RESOURCE_THUMBNAIL+SUCCESS,
          payload
        });
    }).catch((error)=>{
      dispatch({
        type: RESOURCE_THUMBNAIL+FAIL,
        payload
      });
      if(typeof error.error !== 'undefined'){
        NotificationService.throw("custom", error.error);
      }else{
        NotificationService.throw("thumbnail-error");
      }
    });
  }
}

export function searchResources(searchObject={}){
  return (dispatch)=>{
    let params = {
      method: "GET",
    }
    // Object.keys(searchObject).forEach((key)=>{
    //   searchObject[key] = searchObject[key].toLowerCase();
    // });
    fetch("/catalogue/search/resources"+"?"+Object.keys(searchObject).map(
      key=>{if(typeof searchObject[key] === 'undefined'){return "";}return key + '=' + searchObject[key]}).join('&'),
      params)
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: RESOURCE_SEARCH+SUCCESS,
        payload: response,
      });
      dispatch(getResourceThumbnails(response));
    }).catch((error)=>{
      dispatch({
        type: RESOURCE_SEARCH+FAIL,
        payload: response,
      });
      if(typeof error.error !== 'undefined'){
        NotificationService.throw("custom", error.error);
      }else{
        NotificationService.throw("search-error");
      }
    });
  }
}

export function chooseResource(id){
  return{
    type: RESOURCE_CHOICE,
    payload: id
  }
}

export function addResourceToPool(id){
  return{
    type: RESOURCE_ADD,
    payload: id
  }
}

export function removeResourceFromPool(id){
  return{
    type: RESOURCE_REMOVE,
    payload: id
  }
}

export function deleteLink(id){
  return (dispatch)=>{
    let params = {
      method: "GET",
    }
    fetch("/api/links/delete/"+id, params)
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: LINK_DELETE+SUCCESS,
        payload: response,
      });
      setTimeout(()=>{dispatch(fetchLinks())},400);
    }).catch((error)=>{
      dispatch({
        type: LINK_DELETE+FAIL,
        payload: response,
      });
      if(typeof error.error !== 'undefined'){
        NotificationService.throw("custom", error.error);
      }else{
        NotificationService.throw("link-delete-error");
      }
    });
  }
}

export function fetchLinks(){
  return (dispatch)=>{
    let params = {
      method: "GET",
    }
    fetch("/api/links/fetchall", params)
    .then((response)=>response.json())
    .then((response)=>{
      dispatch({
        type: LINK_FETCH+SUCCESS,
        payload: response,
      });
      let resources = response.map((link)=>{
        return {
          id:link.resource_id
        }
      })
      dispatch(getResourceThumbnails(resources));
    }).catch((error)=>{
      dispatch({
        type: LINK_FETCH+FAIL,
        payload: "",
      });
      if(typeof error.error !== 'undefined'){
        NotificationService.throw("custom", error.error);
      }else{
        NotificationService.throw("link-fetch-error");
      }
    });
  }
}

export function submitLink(form){
  return (dispatch)=>{
    let params = {
      method: "POST",
      body: JSON.stringify(form)
    }
    fetch("/api/links/submit", params)
    .then((response)=>{
      console.log(response);
      if(response.status === 200){
        dispatch({
          type: LINK_SUBMIT+SUCCESS,
          payload: form,
        });
        NotificationService.toast("link-added");
        setTimeout(()=>{dispatch(fetchLinks())}, 400);
        return;
      }else{
          response.json().then((response)=>{
            dispatch({
              type: LINK_SUBMIT+FAIL,
              payload: form,
            });
            console.log(typeof response.error !== 'undefined');
            if(typeof response.error !== 'undefined'){
              console.log("CUSTOM");
              NotificationService.throw("custom", response.error);
            }else{
              console.log("NOT CUSTOM NOT CUSTOM");
              NotificationService.throw("link-add-error");
            }
          });
      }
    });
  }
}

export function updateLink(form, link){
  return (dispatch)=>{
    form['id'] = link;
    let params = {
      method: "POST",
      body: JSON.stringify(form)
    }
    fetch("/api/links/update/"+link, params).then((response)=>{
      if(response.status === 200){
        dispatch({
          type: LINK_UPDATE+SUCCESS,
          payload: form,
        });
        NotificationService.toast("link-updated");
        dispatch(fetchLinks());
      } else{
        dispatch({
          type: LINK_UPDATE+FAIL,
          payload: form,
        });
        if(typeof error.error !== 'undefined'){
          NotificationService.throw("custom", error.error);
        }else{
          NotificationService.throw("link-update-error");
        }
      }
    }).catch((error)=>{
      dispatch({
        type: LINK_UPDATE+FAIL,
        payload: form,
      });
      if(typeof error.error !== 'undefined'){
        NotificationService.throw("custom", error.error);
      }else{
        NotificationService.throw("link-update-error");
      }
    });
  }
}