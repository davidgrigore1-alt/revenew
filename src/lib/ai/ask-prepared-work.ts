import "server-only";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PreparedWorkItem } from "@/lib/prepared-work";
import type { CopilotPreparedAction } from "./copilot-types";

export async function getAskPreparedWork():Promise<Array<PreparedWorkItem & {askAction:CopilotPreparedAction}>> {
  const authorization=await requirePermission("documents.read"),current=await getCurrentBusinessForUser({redirectIfMissing:false}),client=await createSupabaseServerClient();
  if(!authorization.profileId||!current||!client)return [];
  const result=await client.from("ask_action_plans").select("id,target_id,target_label,action_type,risk_level,proposal,created_at,status").eq("business_id",current.business.id).eq("created_by_profile_id",authorization.profileId).eq("target_type","opportunity").eq("status","prepared").order("created_at",{ascending:false}).limit(100);
  if(result.error)throw new Error("prepared_plans_unavailable");
  if(!result.data?.length)return [];
  const targets=await client.from("opportunities").select("id,title").eq("business_id",current.business.id).in("id",result.data.map(r=>r.target_id));
  if(targets.error)throw new Error("prepared_targets_unavailable");
  return result.data.flatMap(row=>{
    const target=targets.data?.find(t=>t.id===row.target_id);if(!target)return [];
    const proposal=row.proposal as Record<string,unknown>,type=row.action_type as NonNullable<CopilotPreparedAction["actionType"]>;
    const text=(value:unknown)=>typeof value==="string"?value:"";
    const title=text(proposal.title)||text(proposal.subject)||"Propunere comercială";
    const body=text(proposal.description)||text(proposal.body)||text(proposal.note);
    const id=`ask:${row.id}`;
    const action:CopilotPreparedAction={id:row.id,planId:row.id,type:type==="prepare_email"?"email_draft":type==="create_task"?"task_draft":"record_update_draft",actionType:type,riskLevel:row.risk_level,title,status:"prepared_not_executed",editable:true,subject:title,body,rationale:"Propunere salvată pentru revizuire; accesul și ținta se reverifică la aplicare.",evidenceSourceIds:[],executionNotice:"Pregătită, fără execuție. Aplicarea necesită confirmare separată.",target:{type:"opportunity",id:target.id,label:target.title},proposal};
    return [{id,documentId:row.id,type:type==="prepare_email"?"prepared_email" as const:type==="create_task"?"prepared_task" as const:"prepared_opportunity_update" as const,status:"ready_for_review" as const,target:{type:"opportunity" as const,id:target.id,label:target.title,href:`/opportunities/${target.id}`},currency:"",title,proposal:body,reason:"Solicitare explicită în Ask",evidence:[],provenance:{label:"Ask · propunere persistentă",createdAt:row.created_at},willChange:["Numai câmpurile propunerii după aprobare"],willNotChange:["Nicio trimitere automată"],approver:"Creatorul autorizat al propunerii",reviewHref:`/prepared?item=${encodeURIComponent(id)}`,reviewLabel:"Revizuiește propunerea",editable:true,preparedAt:row.created_at,askAction:action}];
  });
}
