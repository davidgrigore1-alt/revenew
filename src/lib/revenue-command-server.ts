import "server-only";
import { cache } from "react";
import { randomUUID } from "node:crypto";
import { hasPermission } from "@/lib/authz/has-permission";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapOpportunity, mapOpportunityAction, mapOpportunityEvent, mapOpportunityContacts } from "@/lib/supabase/data";
import { getRevenueImpact } from "@/lib/revenue-impact-server";
import { signReviewTicket } from "@/lib/revenue-command-review";
import { assembleRevenueCommand, materialEventLabels, type CommandChange } from "@/lib/revenue-command";
import { metadataEvidence } from "@/lib/evidence-reference";
import type { CommercialSignal, OpportunityDocument } from "@/lib/types";

export async function revenueCommandActor(){
 const authorization=await requirePermission("opportunities.read"),current=await getCurrentBusinessForUser({redirectIfMissing:true});
 if(!current||!authorization.profileId||current.source!=="supabase")throw new Error("command_unavailable");
 const scope=["business_owner","business_admin","business_manager"].includes(authorization.businessRole??"")?"business" as const:"owned" as const;
 return {businessId:current.business.id,actorId:authorization.profileId,scope,authorization};
}
/** Request-local only. Fixed batches; no model, provider requests or evidence content. */
export const getRevenueCommand=cache(async(range?:string)=>{
 const actor=await revenueCommandActor(),client=await createSupabaseServerClient();if(!client)throw new Error("command_unavailable");
 const canRead=(permission:Parameters<typeof hasPermission>[1])=>hasPermission(actor.authorization,permission);
 const now=new Date(),oldest=new Date(now.getTime()-30*86400000).toISOString();
 let candidates=client.from("opportunities").select("id,business_id,organization_id,title,type,status,lifecycle_status,owner_profile_id,currency,estimated_value_low,estimated_value_high,deadline,created_at,updated_at,actual_outcome_amount,outcome_recorded_at,outcome_recorded_by_profile_id,outreach_restricted_at,outreach_restriction_reason")
 .eq("business_id",actor.businessId).order("updated_at",{ascending:false}).order("id").limit(81);
 if(actor.scope==="owned")candidates=candidates.eq("owner_profile_id",actor.actorId);
 const rows=await candidates;if(rows.error)throw new Error("command_unavailable");
 const selected=(rows.data??[]).slice(0,80),ids=selected.map(o=>o.id);
 const empty=Promise.resolve({data:[],error:null});
 const [actions,events,contacts,profiles,signals,documents,runs,checkpoint,impact]=await Promise.all([
 ids.length&&canRead("actions.read")?client.from("opportunity_actions").select("id,business_id,opportunity_id,type,title,status,due_at,priority,assigned_to_profile_id,created_at,updated_at").eq("business_id",actor.businessId).in("opportunity_id",ids).eq("status","pending").order("due_at",{ascending:true,nullsFirst:false}).limit(1001):empty,
 ids.length?client.from("opportunity_events").select("id,business_id,opportunity_id,event_type,label,metadata,actor_profile_id,occurred_at").eq("business_id",actor.businessId).in("opportunity_id",ids).gte("occurred_at",oldest).lte("occurred_at",now.toISOString()).in("event_type",[...Object.keys(materialEventLabels),"marked_contacted","contacted","follow_up_scheduled","action_cancelled","primary_contact_changed","contact_assigned","lifecycle_reopened"]).order("occurred_at",{ascending:false}).limit(401):empty,
 ids.length?client.from("opportunity_contacts").select("id,business_id,opportunity_id,contact_id,role,is_primary,created_at,updated_at,crm_contacts(id,business_id,organization_id,full_name,decision_role,crm_organizations(id,business_id,name))").eq("business_id",actor.businessId).in("opportunity_id",ids).limit(161):empty,
 client.rpc("business_assignable_profiles",{target_business_id:actor.businessId}),
 ids.length&&canRead("signals.read")&&canRead("approvals.read")?client.from("commercial_signals").select("id,business_id,title,status,review_status,detected_from_opportunity_id,converted_opportunity_id,review_due_at,created_at,updated_at").eq("business_id",actor.businessId).or("detected_from_opportunity_id.in.("+ids.join(",")+"),converted_opportunity_id.in.("+ids.join(",")+")").order("updated_at",{ascending:false}).limit(241):empty,
 ids.length&&canRead("documents.read")?client.from("opportunity_documents").select("id,opportunity_id,title,document_type,status,created_at,ready_at,sent_at").eq("business_id",actor.businessId).in("opportunity_id",ids).in("status",["approved","ready_to_send"]).limit(161):empty,
 ids.length&&canRead("workspace.audit.read")?client.from("commercial_workflow_runs").select("id,target_id,completed_at,prepared_action_plan_ids").eq("business_id",actor.businessId).in("target_id",ids).eq("is_test_run",false).gte("completed_at",oldest).order("completed_at",{ascending:false}).limit(81):empty,
 client.from("executive_review_checkpoints").select("reviewed_through").eq("business_id",actor.businessId).eq("reviewer_profile_id",actor.actorId).eq("scope",actor.scope).order("reviewed_through",{ascending:false}).limit(1),
 getRevenueImpact({range:"30",opportunityIds:ids,includeOutsidePeriod:true})
 ]);
 const names:Record<string,string>=Object.fromEntries((profiles.data??[]).map((p:{profile_id:string;full_name:string})=>[p.profile_id,p.full_name]));
 const ownSignals=(signals.data??[]).filter(s=>ids.includes(s.detected_from_opportunity_id)||ids.includes(s.converted_opportunity_id));
 const signalEvents=ownSignals.length?await client.from("commercial_signal_events").select("id,signal_id,event_type,created_at").eq("business_id",actor.businessId).in("signal_id",ownSignals.map(s=>s.id)).gte("created_at",oldest).lte("created_at",now.toISOString()).in("event_type",["signal_approved","signal_dismissed","review_postponed"]).order("created_at",{ascending:false}).limit(401):{data:[],error:null};
 const opportunities=selected.map(row=>mapOpportunity(row as Parameters<typeof mapOpportunity>[0],
  (actions.data??[]).filter(a=>a.opportunity_id===row.id).map(mapOpportunityAction),
  (documents.data??[]).filter(d=>d.opportunity_id===row.id).map(d=>({id:d.id,title:d.title,type:d.document_type,status:d.status,createdAt:d.created_at,readyAt:d.ready_at,sentAt:d.sent_at} as OpportunityDocument)),
  (events.data??[]).filter(e=>e.opportunity_id===row.id).map(mapOpportunityEvent),
  mapOpportunityContacts((contacts.data??[]).filter(c=>c.opportunity_id===row.id) as Parameters<typeof mapOpportunityContacts>[0]),[],names[row.owner_profile_id]??null));
 const mappedSignals=ownSignals.map(s=>({id:s.id,businessId:s.business_id,title:s.title,status:s.status,reviewStatus:s.review_status,detectedFromOpportunityId:s.detected_from_opportunity_id,convertedOpportunityId:s.converted_opportunity_id,reviewDueAt:s.review_due_at,createdAt:s.created_at,updatedAt:s.updated_at} as CommercialSignal));
 const changes:CommandChange[]=[];
 for(const e of signalEvents.data??[]){
  const signal=ownSignals.find(s=>s.id===e.signal_id),id=signal?.detected_from_opportunity_id??signal?.converted_opportunity_id;
  const op=opportunities.find(o=>o.id===id);if(!op)continue;
  const completed=e.event_type==="signal_approved";
  changes.push({id:"approval:"+e.id,opportunityId:op.id,title:op.title,label:completed?"Aprobare rezolvată":e.event_type==="signal_dismissed"?"Semnal respins":"Revizuire amânată",detail:"Decizie înregistrată în fluxul de aprobare.",at:e.created_at,progress:completed,
   evidence:metadataEvidence({sourceType:"approval",sourceId:e.signal_id,title:"Decizie de aprobare",occurredAt:e.created_at,entityHref:"/approvals?signal="+e.signal_id})});
 }
 for(const run of runs.data??[]){
  if(!run.completed_at||!run.prepared_action_plan_ids?.length)continue;
  const op=opportunities.find(o=>o.id===run.target_id);if(!op)continue;
  changes.push({id:"workflow:"+run.id,opportunityId:op.id,title:op.title,label:"Lucru pregătit prin workflow",detail:"Material pregătit pentru control uman; nu este execuție confirmată.",at:run.completed_at,progress:false,evidence:metadataEvidence({sourceType:"action",sourceId:run.id,title:"Lucru pregătit pentru revizuire",occurredAt:run.completed_at,entityHref:"/opportunities/"+op.id})});
 }
 const currentComplete=canRead("actions.read")&&canRead("signals.read")&&canRead("approvals.read")&&canRead("documents.read")&&![actions,events,contacts,signals,documents].some(r=>r.error)&&
 (actions.data?.length??0)<=1000&&(events.data?.length??0)<=400&&(contacts.data?.length??0)<=160&&(signals.data?.length??0)<=240&&(documents.data?.length??0)<=160;
 const changesComplete=canRead("approvals.read")&&canRead("workspace.audit.read")&&!events.error&&!runs.error&&!signalEvents.error&&(events.data?.length??0)<=400&&(runs.data?.length??0)<=80&&(signalEvents.data?.length??0)<=400;
 const model=assembleRevenueCommand({businessId:actor.businessId,opportunities,signals:mappedSignals,proofs:impact.proofs,names,changes,range,now,
 checkpoint:checkpoint.data?.[0]?.reviewed_through??null,limited:(rows.data?.length??0)>80||!currentComplete||!changesComplete||impact.limited,
 currentComplete,changesComplete,impactAvailable:impact.available&&!impact.limited});
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const reviewToken=actor.authorization.businessRole!=="business_viewer"&&!checkpoint.error&&currentComplete&&changesComplete&&(rows.data?.length??0)<=80&&secret?signReviewTicket({businessId:actor.businessId,actorId:actor.actorId,scope:actor.scope,through:model.generatedAt,requestId:randomUUID()},secret):null;
 return {...model,contextKey:actor.businessId+":"+actor.actorId,reviewToken,checkpointAvailable:!checkpoint.error,scope:actor.scope};
});
export type RevenueCommandModel=Awaited<ReturnType<typeof getRevenueCommand>>;
