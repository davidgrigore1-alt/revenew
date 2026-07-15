import "server-only";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
export type FollowUpWorkspaceSummary={awaitingReview:number;approvedNotSent:number;dueFollowUps:number};
export async function getFollowUpWorkspaceSummary():Promise<FollowUpWorkspaceSummary>{
 if(!isSupabaseConfigured)return{awaitingReview:0,approvedNotSent:0,dueFollowUps:0};
 const business=await getCurrentBusinessOrDemo({redirectIfMissing:true});const supabase=createSupabaseServerClient();
 if(!business||!supabase)return{awaitingReview:0,approvedNotSent:0,dueFollowUps:0};
 const now=new Date().toISOString();
 const[review,approved,due]=await Promise.all([
  supabase.from("opportunity_documents").select("id",{count:"exact",head:true}).eq("business_id",business.id).in("document_type",["outreach_email","follow_up_email","linkedin_message","whatsapp_message"]).in("status",["placeholder","draft","edited","copied"]),
  supabase.from("opportunity_documents").select("id",{count:"exact",head:true}).eq("business_id",business.id).in("document_type",["outreach_email","follow_up_email","linkedin_message","whatsapp_message"]).in("status",["approved","ready_to_send"]),
  supabase.from("opportunity_actions").select("id",{count:"exact",head:true}).eq("business_id",business.id).eq("type","follow_up").eq("status","pending").lte("due_at",now)
 ]);
 const error=review.error??approved.error??due.error;if(error)throw new Error("Follow-up summary load error: "+error.message);
 return{awaitingReview:review.count??0,approvedNotSent:approved.count??0,dueFollowUps:due.count??0};
}