import "server-only";
import { cache } from "react";
import { getCommercialSignalsForOpportunity } from "@/lib/commercial-inbox";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { buildOpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import { requirePermission } from "@/lib/authz/require-permission";
import { hasPermission } from "@/lib/authz/has-permission";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { requireGoogleConnectorActor,getOwnedExternalContext } from "@/lib/google-workspace/repository";
import { GOOGLE_GMAIL_SCOPE,GOOGLE_CALENDAR_SCOPE } from "@/lib/google-workspace/oauth";
import { uuidPattern } from "@/lib/google-workspace/drive-types";
import { assembleCommercialTruth,TRUTH_LIMITS,type TruthSegment,type TruthPrivateContext } from "@/lib/commercial-truth";

/** Structured current facts: no model, source segments, Google calls, or document bodies. */
export const getCurrentCommercialStateForOpportunity=cache(async(opportunityId:string)=>{
 await requirePermission("opportunities.read");
 const current=await getCurrentBusinessForUser({redirectIfMissing:true});
 if(!current||!uuidPattern.test(opportunityId))throw new Error("truth_scope_forbidden");
 const opportunity=await getOpportunityForCurrentBusiness(opportunityId,{includeDocumentContent:false});
 if(!opportunity||opportunity.businessId!==current.business.id)throw new Error("truth_scope_forbidden");
 const linkedSignals=await getCommercialSignalsForOpportunity(opportunityId);
 return buildOpportunityCommercialState(opportunity,{businessId:current.business.id,linkedSignals});
});

/** React cache is request-local: no persisted/private derived claims shared across actors. */
export const getCommercialTruthForOpportunity=cache(async(opportunityId:string)=>{
 const authorization=await requirePermission("opportunities.read");
 const actor=await requireGoogleConnectorActor();
 if(!uuidPattern.test(opportunityId))throw new Error("truth_scope_forbidden");
 const opportunity=await getOpportunityForCurrentBusiness(opportunityId);
 if(!opportunity||opportunity.businessId!==actor.businessId)throw new Error("truth_scope_forbidden");
 const limitations:string[]=[],segments:TruthSegment[]=[];
 let companyName:string|null=null;
 const client=createSupabaseServerClient();
 if(client&&opportunity.organizationId&&hasPermission(authorization,"workspace.read")){
  const company=await client.from("crm_organizations").select("name").eq("id",opportunity.organizationId).eq("business_id",actor.businessId).maybeSingle();
  if(!company.error)companyName=company.data?.name??null;
 }
 if(!companyName)limitations.push("Identitatea companiei nu este confirmată din înregistrarea CRM; nu se compară automat nume sau valori.");
 const admin=createSupabaseAdminClient();
 if(admin&&hasPermission(authorization,"documents.read")){
  try{
   const sources=await admin.from("external_document_sources")
    .select("id,business_id,opportunity_id,name,document_kind,mime_type,modified_time,last_synced_at,web_view_link")
    .eq("business_id",actor.businessId).eq("opportunity_id",opportunityId).eq("state","synced")
    .order("modified_time",{ascending:false,nullsFirst:false}).order("id").limit(TRUTH_LIMITS.sources+1);
   if(sources.error)throw new Error("truth_source_unavailable");
   if((sources.data?.length??0)>TRUTH_LIMITS.sources)limitations.push("Sunt evaluate cele mai recente șase documente disponibile, nu întreaga arhivă.");
   const selected=sources.data?.slice(0,TRUTH_LIMITS.sources)??[];
   if(selected.length){
    const rows=await admin.from("external_document_segments")
     .select("id,source_id,text,location_label").eq("business_id",actor.businessId)
     .in("source_id",selected.map(source=>source.id)).order("ordinal").order("source_id").limit(TRUTH_LIMITS.segments+1);
    if(rows.error)throw new Error("truth_source_unavailable");
    if((rows.data?.length??0)>TRUTH_LIMITS.segments)limitations.push("Documentele lungi sunt evaluate pe fragmente limitate; absența unui câmp nu confirmă absența lui în document.");
    for(const row of rows.data?.slice(0,TRUTH_LIMITS.segments)??[]){
     const source=selected.find(item=>item.id===row.source_id);if(!source)continue;
     segments.push({businessId:actor.businessId,opportunityId,sourceId:source.id,segmentId:row.id,title:source.name,
      kind:source.document_kind,mime:source.mime_type,text:row.text,location:row.location_label,
      modifiedAt:source.modified_time,syncedAt:source.last_synced_at,originalHref:source.web_view_link??undefined});
    }
   }
  }catch{limitations.push("Dovezile Drive nu sunt disponibile momentan; nu au fost înlocuite cu informații presupuse.");}
 }else limitations.push("Dovezile documentare nu sunt disponibile cu permisiunile curente.");
 const privateContext:TruthPrivateContext={emails:[],meetings:[]};
 if(hasPermission(authorization,"workspace.read")){
  try{
   const external=await getOwnedExternalContext({actor,opportunityId,limit:6});
   // The canonical loader is owner-private. Revoked/unsynchronized sources cannot establish current facts.
   if(external.connection?.gmail_status==="connected"&&external.connection.granted_scopes.includes(GOOGLE_GMAIL_SCOPE))privateContext.emails=external.emails
    .filter(email=>email.linked_opportunity_id===opportunityId).slice(0,6).map(email=>({id:email.id,sentAt:email.sent_at,direction:email.direction}));
   if(external.connection?.calendar_status==="connected"&&external.connection.granted_scopes.includes(GOOGLE_CALENDAR_SCOPE))privateContext.meetings=external.events
    .filter(event=>event.linked_opportunity_id===opportunityId).slice(0,4).map(event=>({id:event.id,title:event.title??"Întâlnire",startsAt:event.starts_at,endsAt:event.ends_at,status:event.event_status}));
   if(!external.connection)limitations.push("Contextul privat Google nu este conectat pentru acest profil.");
  }catch{limitations.push("Contextul privat Gmail/Calendar nu este disponibil pentru această verificare.");}
 }
 const linkedSignals=await getCommercialSignalsForOpportunity(opportunityId);
 return assembleCommercialTruth({businessId:actor.businessId,opportunity,companyName,segments,privateContext,limitations,linkedSignals});
});

/** Explicitly bounded cross-record scope, using the existing RLS client for candidate visibility. */
export async function getCommercialTruthScope(scope:{opportunityId?:string;organizationId?:string;preferDocuments?:boolean}){
 const authorization=await requirePermission("opportunities.read");
 const actor=await requireGoogleConnectorActor();
 if(scope.opportunityId)return {items:[await getCommercialTruthForOpportunity(scope.opportunityId)],limited:false,label:"Această oportunitate"};
 if(scope.organizationId&&!uuidPattern.test(scope.organizationId))throw new Error("truth_scope_forbidden");
 const client=createSupabaseServerClient();if(!client)throw new Error("truth_unavailable");
 let query=client.from("opportunities").select("id").eq("business_id",actor.businessId)
  .order("updated_at",{ascending:false}).order("id").limit(TRUTH_LIMITS.scopeOpportunities+1);
 if(!["business_owner","business_admin","business_manager"].includes(authorization.businessRole??""))query=query.eq("owner_profile_id",actor.profileId);
 if(scope.organizationId)query=query.eq("organization_id",scope.organizationId);
 const result=await query;if(result.error)throw new Error("truth_unavailable");
 const recent=result.data??[];
 const documentIds:string[]=[];
 if(scope.preferDocuments&&hasPermission(authorization,"documents.read")){
  const admin=createSupabaseAdminClient();
  if(admin){
   const sources=await admin.from("external_document_sources").select("opportunity_id").eq("business_id",actor.businessId).eq("state","synced").order("last_synced_at",{ascending:false}).limit(50);
   const candidates=Array.from(new Set((sources.data??[]).map(s=>s.opportunity_id)));
   if(candidates.length){
    let visible=client.from("opportunities").select("id").eq("business_id",actor.businessId).in("id",candidates).order("updated_at",{ascending:false}).limit(TRUTH_LIMITS.scopeOpportunities);
    if(!["business_owner","business_admin","business_manager"].includes(authorization.businessRole??""))visible=visible.eq("owner_profile_id",actor.profileId);
    if(scope.organizationId)visible=visible.eq("organization_id",scope.organizationId);
    const allowed=await visible;
    if(!allowed.error)documentIds.push(...(allowed.data??[]).map(o=>o.id));
   }
  }
 }
 const ids=Array.from(new Map([...documentIds.map(id=>({id})),...recent].map(row=>[row.id,row])).values()),items=[];
 // Sequential bounded reads avoid a fan-out of private source lookups or any model calls.
 for(const row of ids.slice(0,TRUTH_LIMITS.scopeOpportunities)){
  try{items.push(await getCommercialTruthForOpportunity(row.id));}catch{/* Unavailable records are never replaced with fabricated facts. */}
 }
 return {items,limited:ids.length>TRUTH_LIMITS.scopeOpportunities||items.length!==Math.min(ids.length,TRUTH_LIMITS.scopeOpportunities),
  label:scope.organizationId?"Compania selectată":"Workspace autorizat"};
}
