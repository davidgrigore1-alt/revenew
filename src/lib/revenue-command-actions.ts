"use server";
import { revenueCommandActor } from "@/lib/revenue-command-server";
import { verifyReviewTicket } from "@/lib/revenue-command-review";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
export async function markExecutiveBriefReviewed(token:string){
 try{
  const actor=await revenueCommandActor(),ticket=verifyReviewTicket(token,process.env.SUPABASE_SERVICE_ROLE_KEY??"",actor);
  const client=createSupabaseAdminClient();if(!client)throw new Error("review_unavailable");
  const result=await client.rpc("record_executive_review",{p_business:actor.businessId,p_actor:actor.actorId,p_scope:actor.scope,p_through:ticket.through,p_request:ticket.requestId});
  if(result.error||!result.data)throw new Error("review_failed");
  revalidatePath("/dashboard");
  return {ok:true as const};
 }catch{return {ok:false as const,error:"Revizuirea nu a putut fi înregistrată. Reîncarcă brief-ul și încearcă din nou."};}
}
