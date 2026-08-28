import "server-only";
import { DRIVE_LIMITS, DRIVE_MIMES, driveId } from "./drive-core";
export const DRIVE_METADATA_FIELDS = "id,name,mimeType,modifiedTime,version,size,webViewLink,resourceKey,capabilities/canDownload";
export type DriveMetadata = { id:string; name:string; mimeType:string; modifiedTime?:string; version?:string; size?:string;
 webViewLink?:string; resourceKey?:string; capabilities?:{canDownload?:boolean} };
export class DriveError extends Error {
 constructor(public code:"access_revoked"|"unavailable"|"too_large"|"unsupported"|"extraction_failed") {super(code);}
}
export async function boundedResponseText(response:Response,limit:number) {
 if (Number(response.headers.get("content-length") ?? 0)>limit) { await response.body?.cancel();throw new DriveError("too_large"); }
 if (!response.body) return "";
 const reader=response.body.getReader();const parts:Uint8Array[]=[];let size=0;
 try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new DriveError("too_large");parts.push(value);} }
 finally {await reader.cancel();}
 return new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(parts));
}
async function googleGet(token:string,fileId:string,resourceKey:string|undefined,query:Record<string,string>,exporting=false) {
 if(!driveId(fileId)||(resourceKey!==undefined&&!driveId(resourceKey)))throw new DriveError("unavailable");
 const url=new URL("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId)+(exporting?"/export":""));
 Object.entries(query).forEach(([key,value])=>url.searchParams.set(key,value));
 const response=await fetch(url,{headers:{authorization:`Bearer ${token}`,...(resourceKey?{"X-Goog-Drive-Resource-Keys":fileId+"/"+resourceKey}:{})},
  cache:"no-store",redirect:"error",signal:AbortSignal.timeout(DRIVE_LIMITS.timeoutMs)});
 if(!response.ok){await response.body?.cancel();throw new DriveError(response.status===403||response.status===401?"access_revoked":response.status===404?"unavailable":"extraction_failed");}
 return response;
}
export function safeDriveLink(fileId:string,resourceKey?:string) {
 if(!driveId(fileId))throw new DriveError("unavailable");
 const url=new URL("https://drive.google.com/file/d/"+encodeURIComponent(fileId)+"/view");
 if(resourceKey&&driveId(resourceKey))url.searchParams.set("resourcekey",resourceKey);
 return url.toString();
}
export async function getDriveMetadata(token:string,fileId:string,resourceKey?:string):Promise<DriveMetadata>{
 const response=await googleGet(token,fileId,resourceKey,{fields:DRIVE_METADATA_FIELDS,supportsAllDrives:"true"});
 const data=JSON.parse(await boundedResponseText(response,DRIVE_LIMITS.metadataBytes)) as DriveMetadata;
 if(data.id!==fileId||typeof data.name!=="string"||typeof data.mimeType!=="string")throw new DriveError("unavailable");
 return {id:fileId,name:data.name.slice(0,500),mimeType:data.mimeType.slice(0,150),
  modifiedTime:data.modifiedTime&&Number.isFinite(Date.parse(data.modifiedTime))?data.modifiedTime:undefined,
  version:typeof data.version==="string"?data.version.slice(0,100):undefined,size:data.size,
  resourceKey:driveId(data.resourceKey)?data.resourceKey:resourceKey,
  webViewLink:safeDriveLink(fileId,driveId(data.resourceKey)?data.resourceKey:resourceKey),
  capabilities:{canDownload:data.capabilities?.canDownload===true}};
}
export async function downloadDriveText(token:string,metadata:DriveMetadata){
 if(metadata.capabilities?.canDownload!==true)throw new DriveError("access_revoked");
 if(Number(metadata.size??0)>DRIVE_LIMITS.downloadBytes)throw new DriveError("too_large");
 const native=metadata.mimeType===DRIVE_MIMES[0]||metadata.mimeType===DRIVE_MIMES[1];
 if(!native&&metadata.mimeType!=="text/plain")throw new DriveError("unsupported");
 const response=await googleGet(token,metadata.id,metadata.resourceKey,native?{mimeType:metadata.mimeType===DRIVE_MIMES[1]?"text/csv":"text/plain"}:{alt:"media",supportsAllDrives:"true"},native);
 return boundedResponseText(response,native?DRIVE_LIMITS.exportBytes:DRIVE_LIMITS.downloadBytes);
}
