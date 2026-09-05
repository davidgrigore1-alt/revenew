import "server-only";
import { requirePermission } from "@/lib/authz/require-permission";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireGoogleConnectorActor, getOwnedGoogleConnection, updateConnection, type Actor } from "./repository";
import { decryptGoogleRefreshCredential } from "./crypto";
import { refreshGoogleAccessToken } from "./oauth";
import { DRIVE_SCOPE, DRIVE_LIMITS, DRIVE_MIMES, parseSelections, extractDriveText, boundedBatch, driveId, uuidPattern,
 type DriveSelection, type DocumentKind, type SourceState, type SourceSegment } from "./drive-core";
import { getDriveMetadata, downloadDriveText, DriveError } from "./drive-provider";
import { metadataEvidence, type EvidenceReference } from "@/lib/evidence-reference";

export type DocumentSource = {
 id:string;business_id:string;owner_profile_id:string;connection_id:string;opportunity_id:string|null;
 provider_file_id:string;resource_key:string|null;name:string;mime_type:string;modified_time:string|null;
 provider_version:string|null;web_view_link:string|null;document_kind:DocumentKind;state:SourceState;
 content_hash:string|null;last_synced_at:string|null;created_at?:string;extraction_note:string|null;revision:number;
};
const sourceFields="id,business_id,owner_profile_id,connection_id,opportunity_id,provider_file_id,resource_key,name,mime_type,modified_time,provider_version,web_view_link,document_kind,state,content_hash,last_synced_at,created_at,extraction_note,revision";
function db(){const client=createSupabaseAdminClient();if(!client)throw new Error("storage_unavailable");return client;}
export async function requireDriveConnection(actor:Actor,connectionId?:string) {
 const connection=await getOwnedGoogleConnection(actor);
 if(!connection||connection.owner_profile_id!==actor.profileId||connection.business_id!==actor.businessId
  ||(connectionId!==undefined&&connection.id!==connectionId)||connection.status==="disconnected")throw new Error("connection_forbidden");
 if(connection.drive_status!=="connected"||!connection.granted_scopes.includes(DRIVE_SCOPE)||!connection.encrypted_refresh_credential)throw new Error("drive_authorization_required");
 return connection;
}
export async function driveAccessToken(actor:Actor,connectionId?:string){
 const connection=await requireDriveConnection(actor,connectionId);
 try{
  const token=await refreshGoogleAccessToken(decryptGoogleRefreshCredential(connection.encrypted_refresh_credential!));
  // Persistent server grants may legitimately combine Gmail, Calendar and Drive.
  // Missing scope in a refresh response falls back to the stored grant and Google resource checks.
  if(token.scope && !token.scope.split(/\s+/).includes(DRIVE_SCOPE)){
   await updateConnection(connection.id,actor,{drive_status:"action_required"});
   throw new Error("drive_authorization_required");
  }
  return {connection,accessToken:token.access_token};
 }catch(error){
  if(error instanceof Error&&error.message==="google_refresh_invalid")await updateConnection(connection.id,actor,{drive_status:"action_required"});
  throw new Error("drive_authorization_required");
 }
}
/** Public configuration only. Never refresh or return a server bearer for Picker. */
export async function getPickerConfiguration(actor:Actor,connectionId?:string){
 const connection=await requireDriveConnection(actor,connectionId);
 const appId=process.env.GOOGLE_PICKER_APP_ID?.trim(),developerKey=process.env.GOOGLE_PICKER_BROWSER_KEY?.trim();
 const clientId=process.env.GOOGLE_CLIENT_ID?.trim();
 if(!appId||!/^\d+$/.test(appId)||!developerKey||!clientId)throw new Error("picker_not_configured");
 return {clientId,appId,developerKey,connectionId:connection.id,loginHint:connection.external_email};
}
async function target(actor:Actor,id:string){
 if(!uuidPattern.test(id))throw new Error("target_forbidden");
 const result=await db().from("opportunities").select("id").eq("id",id).eq("business_id",actor.businessId).maybeSingle();
 if(result.error||!result.data)throw new Error("target_forbidden");
}
async function ownedSource(actor:Actor,sourceId:string){
 if(!uuidPattern.test(sourceId))throw new Error("source_forbidden");
 const result=await db().from("external_document_sources").select(sourceFields).eq("id",sourceId)
  .eq("business_id",actor.businessId).eq("owner_profile_id",actor.profileId).maybeSingle();
 if(result.error||!result.data)throw new Error("source_forbidden");
 return result.data as DocumentSource;
}
async function sourceForFile(actor:Actor,connectionId:string,fileId:string){
 const result=await db().from("external_document_sources").select(sourceFields).eq("business_id",actor.businessId)
  .eq("owner_profile_id",actor.profileId).eq("connection_id",connectionId).eq("provider_file_id",fileId).maybeSingle();
 if(result.error)throw new Error("storage_unavailable");return result.data as DocumentSource|null;
}
async function commit(actor:Actor,connectionId:string,fileId:string,existing:DocumentSource|null,mode:string,source:Record<string,unknown>,segments:SourceSegment[]){
 const {data,error}=await db().rpc("commit_external_document",{p_business:actor.businessId,p_actor:actor.profileId,p_connection:connectionId,
  p_file:fileId,p_expected_revision:existing?.revision??-1,p_mode:mode,p_source:source,p_segments:segments});
 if(error||!data)throw new Error("source_changed");return data as string;
}
export async function reviewDriveSelection(actor:Actor,input:unknown,connectionId?:string){
 if(!Array.isArray(input)||!input.length||input.length>DRIVE_LIMITS.batch)throw new Error("invalid_selection");
 const files=Array.from(new Map(input.map(item=>{
  if(!item||!driveId(item.fileId)||(item.resourceKey!==undefined&&!driveId(item.resourceKey)))throw new Error("invalid_selection");
  return [item.fileId,{fileId:item.fileId as string,resourceKey:item.resourceKey as string|undefined}] as const;
 })).values());
 const {connection,accessToken}=await driveAccessToken(actor,connectionId);
 const results=await boundedBatch(files,async file=>{
  const existing=await sourceForFile(actor,connection.id,file.fileId);
  let metadata;
  try { metadata=await getDriveMetadata(accessToken,file.fileId,file.resourceKey); }
  catch(error) {
   if(existing&&existing.state!=="removed"&&error instanceof DriveError&&["access_revoked","unavailable"].includes(error.code)){
    await commit(actor,connection.id,file.fileId,existing,"sync",{...existing,state:error.code,content_hash:null},[]);
   }
   throw error;
  }
  if(existing&&existing.state!=="removed"&&metadata.capabilities?.canDownload!==true){
   await commit(actor,connection.id,file.fileId,existing,"sync",{...existing,state:"access_revoked",content_hash:null},[]);
  }
  return {fileId:metadata.id,resourceKey:metadata.resourceKey,name:metadata.name,mime:metadata.mimeType,modifiedAt:metadata.modifiedTime,
   existing:!!existing&&existing.state!=="removed",existingOpportunityId:existing?.opportunity_id,
   state:metadata.capabilities?.canDownload!==true?"access_revoked":Number(metadata.size??0)>DRIVE_LIMITS.downloadBytes?"too_large":
    !(DRIVE_MIMES as readonly string[]).includes(metadata.mimeType)?"unsupported":metadata.mimeType==="application/pdf"?"metadata_only":"ready"};
 });
 return results.map((result,index)=>result.status==="fulfilled"?result.value:{fileId:files[index].fileId,name:"Document indisponibil",mime:"",state:"unavailable",existing:false});
}
async function ingestOne(actor:Actor,connectionId:string,accessToken:string,item:DriveSelection,mode:"add"|"sync",provided?:DocumentSource){
 await target(actor,item.opportunityId);
 const existing=provided??await sourceForFile(actor,connectionId,item.fileId);
 let metadata;
 try{metadata=await getDriveMetadata(accessToken,item.fileId,item.resourceKey);}
 catch(error){
  if(existing&&existing.state!=="removed"&&error instanceof DriveError&&["access_revoked","unavailable"].includes(error.code)){
   const id=await commit(actor,connectionId,item.fileId,existing,mode,{...existing,state:error.code,content_hash:null},[]);
   return {id,state:error.code,unchanged:false};
  }
  throw error;
 }
 const base={opportunity_id:item.opportunityId,document_kind:item.kind,name:metadata.name,mime_type:metadata.mimeType,
  resource_key:metadata.resourceKey??null,modified_time:metadata.modifiedTime??null,provider_version:metadata.version??null,web_view_link:metadata.webViewLink??null};
 let state:SourceState="synced",segments:SourceSegment[]=[],contentHash:string|null=null,note:string|null=null,unchanged=false;
 if(metadata.capabilities?.canDownload!==true)state="access_revoked";
 else if(Number(metadata.size??0)>DRIVE_LIMITS.downloadBytes)state="too_large";
 else if(metadata.mimeType==="application/pdf"){state="metadata_only";unchanged=existing?.state==="metadata_only"&&existing.mime_type===metadata.mimeType&&!!metadata.version&&existing.provider_version===metadata.version&&existing.modified_time===metadata.modifiedTime;note="PDF: doar metadate. Nu este disponibil un parser verificat; conținutul nu a fost extras.";}
 else if(!(DRIVE_MIMES as readonly string[]).includes(metadata.mimeType))state="unsupported";
 else if(existing?.state==="synced"&&existing.mime_type===metadata.mimeType&&metadata.version&&metadata.modifiedTime
  &&existing.provider_version===metadata.version&&existing.modified_time===metadata.modifiedTime){
  contentHash=existing.content_hash;note=existing.extraction_note;unchanged=true;
 }else{
  try{
   const raw=await downloadDriveText(accessToken,metadata);
   const extracted=extractDriveText(raw,metadata.mimeType);
   // Re-read revision after export: never label bytes with metadata from a different revision.
   const after=await getDriveMetadata(accessToken,item.fileId,metadata.resourceKey);
   if(after.version!==metadata.version||after.modifiedTime!==metadata.modifiedTime)throw new Error("source_changed");
   segments=extracted.segments;contentHash=extracted.contentHash;note=extracted.note;
   unchanged=existing?.content_hash===contentHash;
  }catch(error){state=error instanceof DriveError?error.code:error instanceof Error&&error.message==="too_large"?"too_large":"extraction_failed";}
 }
 const id=await commit(actor,connectionId,item.fileId,existing,mode,{...base,state,content_hash:state==="synced"?contentHash:null,extraction_note:note},state==="synced"?segments:[]);
 return {id,state,unchanged};
}
export async function ingestDriveSelection(actor:Actor,input:unknown,connectionId?:string){
 const selections=parseSelections(input);const {connection,accessToken}=await driveAccessToken(actor,connectionId);
 const results=await boundedBatch(selections,item=>ingestOne(actor,connection.id,accessToken,item,"add"));
 return results.map((result,index)=>({fileId:selections[index].fileId,...(result.status==="fulfilled"?result.value:{state:"extraction_failed",error:"Documentul nu a fost adăugat. Verifică accesul și contextul."})}));
}
export async function syncDriveSource(actor:Actor,sourceId:string){
 const existing=await ownedSource(actor,sourceId);
 if(existing.state==="removed"||!existing.opportunity_id)throw new Error("source_inactive");
 const {connection,accessToken}=await driveAccessToken(actor,existing.connection_id);
 return ingestOne(actor,connection.id,accessToken,{fileId:existing.provider_file_id,resourceKey:existing.resource_key??undefined,
  opportunityId:existing.opportunity_id,kind:existing.document_kind},"sync",existing);
}
/** All confirmed sources for the owned connection, keyset-paged independently of UI limits. */
export async function syncSelectedDriveSources(actor:Actor,connectionId:string){
 await requirePermission("documents.generate");
 await requireDriveConnection(actor,connectionId);
 const summary:{status:"completed"|"partial"|"failed";selected:number;synced:number;unchanged:number;failed:number;errorCategory?:string}={status:"completed",selected:0,synced:0,unchanged:0,failed:0};
 let after:string|null=null;
 let credential:Awaited<ReturnType<typeof driveAccessToken>>|null=null;
 try { for(;;){
  // Recheck authority between batches; the commit RPC also verifies current grants.
  await requireDriveConnection(actor,connectionId);
  let query=db().from("external_document_sources").select(sourceFields,{count:"exact"})
   .eq("business_id",actor.businessId).eq("owner_profile_id",actor.profileId).eq("connection_id",connectionId)
   .neq("state","removed").order("id",{ascending:true}).limit(100);
  if(after)query=query.gt("id",after);
  const page=await query;
  if(page.error)throw new Error("storage_unavailable");
  const sources=(page.data??[]) as DocumentSource[];
  if(!sources.length)break;
  if(!after)summary.selected=page.count??sources.length;
  // Refresh once per page, keeping a long manual batch within normal token lifetime.
  credential=await driveAccessToken(actor,connectionId);
  const results=await boundedBatch(sources,source=>{
   if(!source.opportunity_id)throw new Error("source_inactive");
   return ingestOne(actor,connectionId,credential!.accessToken,{
    fileId:source.provider_file_id,resourceKey:source.resource_key??undefined,
    opportunityId:source.opportunity_id,kind:source.document_kind
   },"sync",source);
  });
  for(const result of results){
   if(result.status==="rejected"||!["synced","metadata_only"].includes(result.value.state))summary.failed++;
   else if(result.value.unchanged)summary.unchanged++;
   else summary.synced++;
  }
  after=sources[sources.length-1].id;
  if(sources.length<100)break;
 }} catch {
  // Preserve earlier successes even if storage or connection authority disappears mid-batch.
  summary.failed=Math.max(summary.failed,summary.selected-summary.synced-summary.unchanged);
  summary.errorCategory="drive_sync_unavailable";
 }
 summary.status=summary.failed||summary.errorCategory?(summary.synced+summary.unchanged?"partial":"failed"):"completed";
 return summary;
}
export async function removeDriveSource(actor:Actor,sourceId:string){
 const existing=await ownedSource(actor,sourceId);
 if(existing.state==="removed")return {id:existing.id};
 // Removing cached content needs source ownership, not a live Google token or the latest account.
 return {id:await commit(actor,existing.connection_id,existing.provider_file_id,existing,"remove",{},[])};
}
export async function getDriveWorkspace(opportunityId?:string){
 await requirePermission("documents.read");
 const actor=await requireGoogleConnectorActor();if(opportunityId)await target(actor,opportunityId);
 const connection=await getOwnedGoogleConnection(actor);
 let query=db().from("external_document_sources").select(sourceFields).eq("business_id",actor.businessId).neq("state","removed")
  .order("last_synced_at",{ascending:false}).limit(100);
 query=opportunityId?query.eq("opportunity_id",opportunityId):query.eq("owner_profile_id",actor.profileId);
 const [sources,opportunities]=await Promise.all([query,opportunityId ? db().from("opportunities").select("id,title").eq("business_id",actor.businessId).eq("id",opportunityId) : db().from("opportunities").select("id,title").eq("business_id",actor.businessId).order("title").limit(100)]);
 if(sources.error||opportunities.error)throw new Error("storage_unavailable");
 return {connectionId:connection?.id??null,authorized:!!connection&&connection.drive_status==="connected"&&connection.granted_scopes.includes(DRIVE_SCOPE),
  sources:(sources.data as DocumentSource[]).map(source=>({...source,canManage:source.owner_profile_id===actor.profileId})),
  opportunities:opportunities.data as Array<{id:string;title:string}>};
}
export async function getDocumentSourceDetail(sourceId:string){
 await requirePermission("documents.read");
 const actor=await requireGoogleConnectorActor();if(!uuidPattern.test(sourceId))return null;
 const {data,error}=await db().from("external_document_sources").select(sourceFields).eq("business_id",actor.businessId).eq("id",sourceId).neq("state","removed").maybeSingle();
 if(error)throw new Error("document_source_unavailable");
 if(!data)return null;const source=data as DocumentSource;
 const segments=source.state==="synced"?await db().from("external_document_segments").select("id,ordinal,text,text_hash,location_type,location_label")
  .eq("business_id",actor.businessId).eq("source_id",source.id).order("ordinal").limit(DRIVE_LIMITS.segments):{data:[],error:null};
 if(segments.error)throw new Error("storage_unavailable");
 const [connection,context,authorization]=await Promise.all([getOwnedGoogleConnection(actor),
  db().from("opportunities").select("id,title").eq("business_id",actor.businessId).eq("id",source.opportunity_id!).maybeSingle(),
  requirePermission("documents.read")]);
 if(context.error)throw new Error("document_context_unavailable");
 if(!context.data)return null;
 const owned=source.owner_profile_id===actor.profileId;
 return {source,segments:segments.data as Array<SourceSegment&{id:string}>,context:context.data as {id:string;title:string},
  canSync:owned&&connection?.id===source.connection_id&&connection.status!=="disconnected"&&connection.drive_status==="connected"&&connection.granted_scopes.includes(DRIVE_SCOPE)&&authorization.permissions.includes("documents.generate"),
  canRemove:owned&&authorization.permissions.includes("documents.update")};
}
export async function getDriveEvidence(opportunityIds:string[]):Promise<Record<string,EvidenceReference[]>>{
 if(!opportunityIds.length)return {};
 await requirePermission("documents.read");
 const actor=await requireGoogleConnectorActor();const ids=opportunityIds.filter(id=>uuidPattern.test(id)).slice(0,200);
 if(!ids.length)return {};
 const {data,error}=await db().from("external_document_sources").select(sourceFields).eq("business_id",actor.businessId)
  .in("opportunity_id",ids).eq("state","synced").order("last_synced_at",{ascending:false}).limit(200);
 if(error)throw new Error("storage_unavailable");
 const sources=(data??[]) as DocumentSource[];
 if(!sources.length)return {};
 const result=await db().from("external_document_segments").select("id,source_id,location_label").eq("business_id",actor.businessId)
  .in("source_id",sources.map(s=>s.id)).eq("ordinal",0).limit(200);
 if(result.error)throw new Error("storage_unavailable");
 const evidence:Record<string,EvidenceReference[]>={};
 for(const source of sources){
  const segment=result.data?.find(s=>s.source_id===source.id);if(!segment||!source.opportunity_id)continue;
  (evidence[source.opportunity_id]??=[]).push(metadataEvidence({sourceType:"document",provider:"google_drive",sourceId:source.id,title:source.name,mimeType:source.mime_type,
   occurredAt:source.modified_time,syncedAt:source.last_synced_at,sourceVersion:source.provider_version??undefined,sourceDocumentId:source.id,sourceSegmentId:segment.id,sourceLocation:segment.location_label,
   supportingFact:segment.location_label,entityHref:`/opportunities/${source.opportunity_id}/sources/${source.id}#segment-${segment.id}`,
   originalHref:source.web_view_link??undefined,commercialRelationship:source.opportunity_id}));
 }
 return evidence;
}
