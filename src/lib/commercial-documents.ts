import "server-only";
import { requirePermission } from "@/lib/authz/require-permission";
import { hasPermission } from "@/lib/authz/has-permission";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireGoogleConnectorActor,getOwnedGoogleConnection } from "@/lib/google-workspace/repository";
import { DRIVE_SCOPE,documentKinds,sourceStateLabels,uuidPattern,type DocumentKind,type SourceState } from "@/lib/google-workspace/drive-types";
import { safeOriginalEvidenceHref } from "@/lib/evidence-reference";

export const internalCommercialTypes=["offer_draft","offer","procurement_checklist","checklist","grant_summary"] as const;
const internalLabels:Record<string,string>={offer_draft:"Ofertă",offer:"Ofertă",procurement_checklist:"Listă de achiziții",checklist:"Listă de verificare",grant_summary:"Sinteză finanțare"};
export type CommercialDocumentListItem={
 id:string;kind:"external_source"|"internal_document";title:string;provider:"google_drive"|"revenew";
 mime:string;commercialType:string;linkedContext:{id:string;title:string;href:string};
 sourceModifiedAt:string|null;lastSyncedAt:string|null;status:string;detailHref:string;sourceHref?:string;
 availableActions:{sync:boolean;remove:boolean};
};
type Context={id:string;title:string;business_id:string};
type MetadataRow={
 id:string;opportunity_id:string;owner_profile_id?:string;connection_id?:string;name?:string;title?:string;
 mime_type?:string;document_kind?:DocumentKind;document_type?:string;state?:SourceState;status?:string;
 modified_time?:string|null;last_synced_at?:string|null;updated_at?:string|null;web_view_link?:string|null;
 opportunities:Context|Context[];
};
const driveFields="id,opportunity_id,owner_profile_id,connection_id,name,mime_type,document_kind,state,modified_time,last_synced_at,web_view_link,opportunities!inner(id,title,business_id)";
const internalFields="id,opportunity_id,title,document_type,status,updated_at,opportunities!inner(id,title,business_id)";
function db(){const client=createSupabaseAdminClient();if(!client)throw new Error("document_storage_unavailable");return client;}

/** Metadata-only union. Each search branch is bounded and merged by stable source identity. */
export async function getCommercialDocuments(input:{query?:string;provider?:string;page?:string}={}){
 const authorization=await requirePermission("documents.read");
 const actor=await requireGoogleConnectorActor();
 const connection=await getOwnedGoogleConnection(actor);
 const query=(input.query??"").trim().slice(0,100);
 const provider=input.provider==="google_drive"||input.provider==="revenew"?input.provider:"all";
 const page=Math.min(1000,Math.max(1,Number.parseInt(input.page??"1",10)||1)),pageSize=25,take=page*pageSize+1;
 const client=db();
 async function rows(kind:"external_source"|"internal_document",contextSearch=false){
  const collected:MetadataRow[]=[];
  for(let offset=0;offset<take;offset+=250){
   const external=kind==="external_source";
   let request=client.from(external?"external_document_sources":"opportunity_documents")
    .select(external?driveFields:internalFields).eq("business_id",actor.businessId)
    .eq("opportunities.business_id",actor.businessId)
    .order(external?"last_synced_at":"updated_at",{ascending:false,nullsFirst:false}).order("id",{ascending:true})
    .range(offset,Math.min(take-1,offset+249));
   request=external?request.neq("state","removed"):request.in("document_type",[...internalCommercialTypes]).neq("status","archived");
   // ilike values are SDK-encoded, never interpolated into a PostgREST filter expression.
   if(query)request=request.ilike(contextSearch?"opportunities.title":external?"name":"title","%"+query.replace(/[%_\\]/g,"\\$&")+"%");
   const result = await request;

if (result.error) {
  console.error("[commercial-documents] document list query failed", {
    code: result.error.code,
    message: result.error.message,
    details: result.error.details,
    hint: result.error.hint,
  });

  throw new Error("document_list_unavailable");
}
   const batch=result.data as unknown as MetadataRow[];collected.push(...batch);
   if(batch.length<Math.min(250,take-offset))break;
  }
  return collected.map(row=>({row,kind}));
 }
 const branches=[];
 if(provider!=="revenew"){branches.push(rows("external_source"));if(query)branches.push(rows("external_source",true));}
 if(provider!=="google_drive"){branches.push(rows("internal_document"));if(query)branches.push(rows("internal_document",true));}
 const result=await Promise.all(branches);
 const items=new Map<string,CommercialDocumentListItem>();
 for(const {row,kind} of result.flat()){
  const context=Array.isArray(row.opportunities)?row.opportunities[0]:row.opportunities;
  if(!context||context.business_id!==actor.businessId)continue;
  const external=kind==="external_source",owns=row.owner_profile_id===actor.profileId;
  const authorized=owns&&!!connection&&connection.id===row.connection_id&&connection.status!=="disconnected"&&
   connection.drive_status==="connected"&&connection.granted_scopes.includes(DRIVE_SCOPE);
  items.set(kind+":"+row.id,{
   id:row.id,kind,title:(external?row.name:row.title)||"Document comercial",provider:external?"google_drive":"revenew",
   mime:row.mime_type??"text/plain",commercialType:external?documentKinds[row.document_kind!]:internalLabels[row.document_type!]??"Document",
   linkedContext:{id:context.id,title:context.title,href:`/opportunities/${context.id}?tab=files`},
   sourceModifiedAt:external?row.modified_time??null:row.updated_at??null,lastSyncedAt:row.last_synced_at??null,
   status:external?sourceStateLabels[row.state!]??"Necesită atenție":
    row.status==="approved"?"Aprobat":row.status==="sent"?"Trimis":"În lucru",
   detailHref:external?`/opportunities/${context.id}/sources/${row.id}`:`/documents/${row.id}`,
   sourceHref:external?safeOriginalEvidenceHref(row.web_view_link??undefined)??undefined:undefined,
   availableActions:{sync:!!authorized&&hasPermission(authorization,"documents.generate"),remove:external&&owns&&hasPermission(authorization,"documents.update")}
  });
 }
 const sorted=Array.from(items.values()).sort((a,b)=>(Date.parse(b.lastSyncedAt??b.sourceModifiedAt??"")||0)-(Date.parse(a.lastSyncedAt??a.sourceModifiedAt??"")||0)||a.id.localeCompare(b.id)||a.kind.localeCompare(b.kind));
 return {items:sorted.slice((page-1)*pageSize,page*pageSize),hasMore:sorted.length>page*pageSize,page,pageSize,query,provider,
  canSelect:hasPermission(authorization,"documents.generate")};
}
export async function getInternalCommercialDocument(id:string){
 await requirePermission("documents.read");const actor=await requireGoogleConnectorActor();
 if(!uuidPattern.test(id))return null;
 const result=await db().from("opportunity_documents")
  .select(internalFields+",body").eq("id",id).eq("business_id",actor.businessId).eq("opportunities.business_id",actor.businessId)
  .in("document_type",[...internalCommercialTypes]).neq("status","archived").maybeSingle();
 if(result.error)throw new Error("document_detail_unavailable");
 if(!result.data)return null;
 const row=result.data as unknown as MetadataRow&{body:string|null};
 const context=Array.isArray(row.opportunities)?row.opportunities[0]:row.opportunities;
 if(!context||context.business_id!==actor.businessId)return null;
 return {id:row.id,title:row.title!,body:row.body??"",context,type:internalLabels[row.document_type!],updatedAt:row.updated_at,status:row.status};
}
