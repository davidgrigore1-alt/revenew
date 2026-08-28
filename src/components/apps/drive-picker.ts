"use client";
import { DRIVE_SCOPE, DRIVE_MIMES, DRIVE_LIMITS, driveId, pickerScopeIsSafe } from "@/lib/google-workspace/drive-types";
type PickedFile={fileId:string;resourceKey?:string};
type PickerResponse={action:string;docs?:Array<{id?:string;resourceKey?:string}>};
type Picker={setVisible:(visible:boolean)=>void;dispose:()=>void};
type View={setMimeTypes:(value:string)=>View;setMode:(value:unknown)=>View;setIncludeFolders:(value:boolean)=>View;setSelectFolderEnabled:(value:boolean)=>View};
type Builder={setOAuthToken:(value:string)=>Builder;setAppId:(value:string)=>Builder;setDeveloperKey:(value:string)=>Builder;
 setOrigin:(value:string)=>Builder;addView:(value:View)=>Builder;enableFeature:(value:unknown)=>Builder;
 setMaxItems:(value:number)=>Builder;setCallback:(value:(result:PickerResponse)=>void)=>Builder;build:()=>Picker};
type PickerApi={PickerBuilder:new()=>Builder;DocsView:new()=>View;DocsViewMode:{LIST:unknown};Feature:{MULTISELECT_ENABLED:unknown};Action:{PICKED:string;CANCEL:string}};
type TokenResponse={access_token?:string;expires_in?:number;scope?:string;error?:string};
type TokenClient={requestAccessToken:()=>void};
type GoogleOAuth={initTokenClient:(config:{client_id:string;scope:string;include_granted_scopes:false;login_hint?:string;prompt:string;
 callback:(response:TokenResponse)=>void;error_callback:(error:{type?:string})=>void})=>TokenClient};
type PickerConfiguration={clientId:string;appId:string;developerKey:string;connectionId:string;loginHint?:string};
declare global {interface Window{gapi?:{load:(name:string,options:{callback:()=>void;onerror:()=>void;timeout:number;ontimeout:()=>void})=>void};
 google?:{picker?:PickerApi;accounts?:{oauth2?:GoogleOAuth}}}}
let library:Promise<void>|undefined,identityLibrary:Promise<void>|undefined;
let preparation:{connectionId:string;result:Promise<PickerConfiguration>}|undefined;
function loadPicker(){
 library??=new Promise<void>((resolve,reject)=>{
  const initialize=()=>window.gapi?.load("picker",{callback:resolve,onerror:()=>reject(new Error("picker_unavailable")),timeout:15000,ontimeout:()=>reject(new Error("picker_unavailable"))});
  if(window.gapi){initialize();return;}
  const script=document.createElement("script");script.src="https://apis.google.com/js/api.js";script.async=true;
  script.onload=initialize;script.onerror=()=>{script.remove();reject(new Error("picker_unavailable"));};document.head.appendChild(script);
 }).catch(error=>{library=undefined;throw error;});
 return library;
}
function loadIdentity(){
 identityLibrary??=new Promise<void>((resolve,reject)=>{
  if(window.google?.accounts?.oauth2){resolve();return;}
  const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;
  script.onload=()=>window.google?.accounts?.oauth2?resolve():reject(new Error("picker_unavailable"));
  script.onerror=()=>{script.remove();reject(new Error("picker_unavailable"));};document.head.appendChild(script);
 }).catch(error=>{identityLibrary=undefined;throw error;});
 return identityLibrary;
}
/** Prepare SDKs and public configuration, never a token. Keeps popup launch close to the click. */
export function prepareDrivePicker(connectionId:string):Promise<PickerConfiguration>{
 if(preparation?.connectionId===connectionId)return preparation.result;
 const result=Promise.all([loadPicker(),loadIdentity(),fetch("/api/integrations/google/drive",{method:"POST",
  headers:{"content-type":"application/json"},body:JSON.stringify({action:"picker_config",connectionId}),cache:"no-store"})
  .then(async response=>{if(!response.ok)throw new Error("picker_unavailable");return await response.json() as PickerConfiguration;})])
  .then(([, ,configuration])=>configuration).catch(error=>{if(preparation?.result===result)preparation=undefined;throw error;});
 preparation={connectionId,result};return result;
}
/** Called only by a user click. The GIS bearer never crosses the ReveNew server boundary. */
export async function selectDriveFiles(connectionId:string,signal?:AbortSignal):Promise<PickedFile[]>{
 const configuration=await prepareDrivePicker(connectionId);
 if(signal?.aborted)throw new Error("picker_cancelled");
 const api=window.google?.picker,oauth=window.google?.accounts?.oauth2;
 if(!api||!oauth||configuration.connectionId!==connectionId)throw new Error("picker_unavailable");
 return new Promise((resolve,reject)=>{
  let picker:Picker|undefined,tokenClient:TokenClient|undefined,timer:ReturnType<typeof setTimeout>|undefined,settled=false;
  const finish=(files:PickedFile[],failed=false)=>{
   if(settled)return;settled=true;
   if(timer)clearTimeout(timer);signal?.removeEventListener("abort",abort);
   picker?.setVisible(false);picker?.dispose();picker=undefined;tokenClient=undefined;
   if(failed)reject(new Error("picker_unavailable"));else resolve(files);
  };
  const abort=()=>finish([]);
  signal?.addEventListener("abort",abort,{once:true});
  timer=setTimeout(()=>finish([],true),300000);
  try{
   tokenClient=oauth.initTokenClient({
    client_id:configuration.clientId,scope:DRIVE_SCOPE,include_granted_scopes:false,
    login_hint:configuration.loginHint,prompt:"",
    error_callback:error=>finish([],error.type!=="popup_closed"),
    callback:response=>{
     let ephemeralDriveFileToken=response.access_token??"";response.access_token="";
     try{
      if(settled||signal?.aborted){finish([]);return;}
      // Strict scope applies only to the separate browser token, never persistent server grants.
      if(response.error||!ephemeralDriveFileToken||!pickerScopeIsSafe(response.scope)||
       !response.expires_in||response.expires_in<=0||response.expires_in>3600){finish([],true);return;}
      const view=new api.DocsView().setMimeTypes(DRIVE_MIMES.join(",")).setMode(api.DocsViewMode.LIST).setIncludeFolders(false).setSelectFolderEnabled(false);
      picker=new api.PickerBuilder().setOAuthToken(ephemeralDriveFileToken).setAppId(configuration.appId).setDeveloperKey(configuration.developerKey)
       .setOrigin(window.location.origin).addView(view).enableFeature(api.Feature.MULTISELECT_ENABLED).setMaxItems(DRIVE_LIMITS.batch)
       .setCallback(result=>{
        if(result.action===api.Action.CANCEL)finish([]);
        if(result.action===api.Action.PICKED)finish((result.docs??[]).filter(doc=>driveId(doc.id)).slice(0,DRIVE_LIMITS.batch)
         .map(doc=>({fileId:doc.id!,...(driveId(doc.resourceKey)?{resourceKey:doc.resourceKey}:{})})));
       }).build();
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>finish([],true),Math.min(response.expires_in*1000,300000));picker.setVisible(true);
     }catch{finish([],true);}
     finally{ephemeralDriveFileToken="";}
    }
   });
   if(signal?.aborted)finish([]);else tokenClient.requestAccessToken();
  }catch{finish([],true);}
 });
}
