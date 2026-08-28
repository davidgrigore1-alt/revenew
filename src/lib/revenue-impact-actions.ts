"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uuidPattern } from "@/lib/google-workspace/drive-types";
import { impactLabels,type ImpactKind } from "@/lib/revenue-impact";
export async function recordRevenueImpact(input:{opportunityId:string;kind:ImpactKind;requestId:string;revision:number;referenceId?:string;note?:string;confirmed?:boolean}){
 try{
  await requireActivePaidAccess();
  const privileged=["protected","verified_recovered","invalidated","dismissed"].includes(input.kind);
  const auth=await requirePermission(privileged?"revenue.confirm":"opportunities.update");
  const current=await getCurrentBusinessForUser({redirectIfMissing:true}),admin=createSupabaseAdminClient();
  if(!current||current.source!=="supabase"||!auth.profileId||!admin||!uuidPattern.test(input.opportunityId)||!uuidPattern.test(input.requestId)
   ||!Object.hasOwn(impactLabels,input.kind)||!Number.isInteger(input.revision)||input.revision< -1
   ||(input.referenceId&&!uuidPattern.test(input.referenceId))||(input.note?.length??0)>1000)throw new Error("invalid");
  const result=await admin.rpc("record_commercial_impact",{
   p_business:current.business.id,p_actor:auth.profileId,p_opportunity:input.opportunityId,p_kind:input.kind,p_request:input.requestId,
   p_revision:input.revision,p_reference:input.referenceId??null,p_note:input.note?.trim()??"",p_confirm:input.confirmed===true
  });
  if(result.error)throw new Error("impact_rejected");
  revalidatePath("/recoverable");revalidatePath("/dashboard");revalidatePath("/opportunities/"+input.opportunityId);
  return {ok:true};
 }catch{return {ok:false,error:"Impactul nu a fost înregistrat. Verifică permisiunea, istoricul intervenției și rezultatul, apoi reîncarcă înainte de confirmare."};}
}
