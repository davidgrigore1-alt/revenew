import "server-only";
import { cache } from "react";
import { requirePermission } from "@/lib/authz/require-permission";
import { hasPermission } from "@/lib/authz/has-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildImpactProof,impactPeriod,summarizeImpact,type ImpactCase,type ImpactEvent } from "@/lib/revenue-impact";
import { uuidPattern } from "@/lib/google-workspace/drive-types";
const caseFields="id,business_id,opportunity_id,company_id,title,actor_profile_id,created_at,detected_amount,currency,before_state";
const eventFields="id,case_id,business_id,opportunity_id,revision,kind,actor_profile_id,created_at,amount,currency,outcome_key,reference_type,reference_id,after_state,evidence,note,supersedes_id";
export async function getRevenueImpact(input:{range?:string;from?:string;to?:string;opportunityId?:string}={}){
 const auth=await requirePermission("opportunities.read");
 const current=await getCurrentBusinessForUser({redirectIfMissing:true});
 const client=createSupabaseServerClient(),period=impactPeriod(input);
 const empty={proofs:[],summary:summarizeImpact([],period.from,period.to),period,limited:false,available:false,canVerify:false,canTrack:false};
 if(!client||!current||current.source!=="supabase")return empty;
 if(input.opportunityId&&!uuidPattern.test(input.opportunityId))return empty;
 let query=client.from("commercial_impact_cases").select(caseFields).eq("business_id",current.business.id).order("created_at",{ascending:false}).order("id").limit(251);
 if(input.opportunityId)query=query.eq("opportunity_id",input.opportunityId);
 const cases=await query;if(cases.error)return empty;
 const selected=(cases.data??[]).slice(0,250) as ImpactCase[];
 const rows=selected.length?await client.from("commercial_impact_events").select(eventFields).eq("business_id",current.business.id).in("case_id",selected.map(c=>c.id)).order("case_id").order("revision").limit(2001):{data:[],error:null};
 if(rows.error)return empty;
 // Never publish monetary totals from an incomplete event chain.
 const limited=(cases.data?.length??0)>250||(rows.data?.length??0)>2000;
 const proofs=(rows.data?.length??0)>2000?[]:selected.map(c=>buildImpactProof(c,rows.data as ImpactEvent[]));
 const visibleProofs=input.opportunityId?proofs:proofs.filter(p=>p.events.some(e=>e.created_at>=period.from&&e.created_at<period.to));
 return {proofs:visibleProofs,summary:limited?summarizeImpact([],period.from,period.to):summarizeImpact(proofs,period.from,period.to),period,limited,available:true,
  canVerify:hasPermission(auth,"revenue.confirm"),canTrack:hasPermission(auth,"opportunities.update")};
}
export type RevenueImpactModel=Awaited<ReturnType<typeof getRevenueImpact>>;
/** One bounded RLS query for compact links; no truth evaluation or document bodies. */
export const getImpactLinks=cache(async(opportunityIds:string[])=>{
 await requirePermission("opportunities.read");
 const current=await getCurrentBusinessForUser({redirectIfMissing:true}),client=createSupabaseServerClient();
 if(!client||!current||current.source!=="supabase"||!opportunityIds.length)return {} as Record<string,string>;
 const result=await client.from("commercial_impact_cases").select("id,opportunity_id").eq("business_id",current.business.id).in("opportunity_id",opportunityIds.slice(0,250)).limit(250);
 return Object.fromEntries((result.data??[]).map(row=>[row.opportunity_id,"/recoverable?opportunity="+row.opportunity_id+"&case="+row.id]));
});
export async function getImpactReferences(opportunityId:string){
 await requirePermission("opportunities.read");
 const current=await getCurrentBusinessForUser({redirectIfMissing:true}),client=createSupabaseServerClient();
 if(!client||!current||!uuidPattern.test(opportunityId))return {actions:[],prepared:[]};
 const [actions,prepared,plans]=await Promise.all([
  client.from("opportunity_events").select("id,label,occurred_at").eq("business_id",current.business.id).eq("opportunity_id",opportunityId)
   .in("event_type",["commercial_details_changed","next_action_created","next_action_completed","stage_changed","email_sent"]).order("occurred_at",{ascending:false}).limit(40),
  client.from("opportunity_documents").select("id,title,created_at").eq("business_id",current.business.id).eq("opportunity_id",opportunityId).neq("status","archived").order("created_at",{ascending:false}).limit(20),
  client.from("ask_action_plans").select("id,action_type,status,created_at,executed_at").eq("business_id",current.business.id).eq("target_id",opportunityId).eq("target_type","opportunity").eq("created_by_profile_id",current.profileId).in("status",["prepared","approved","executed"]).order("created_at",{ascending:false}).limit(20)
 ]);
 return {actions:[...(actions.data??[]),...(plans.data??[]).filter(p=>p.status==="executed"&&["create_task","update_next_action","assign_owner","update_opportunity_field"].includes(p.action_type)).map(p=>({id:p.id,label:"Plan aprobat și executat",occurred_at:p.executed_at??p.created_at}))],
  prepared:[...(prepared.data??[]),...(plans.data??[]).map(p=>({id:p.id,title:"Plan pregătit pentru revizuire",created_at:p.created_at}))]};
}
