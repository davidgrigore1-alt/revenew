import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { FollowUpStudio } from "@/components/outreach/FollowUpStudio";
import { normalizeFollowUpDraft } from "@/lib/follow-up-studio";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFollowUpSendReadiness } from "@/lib/follow-up-send-actions";

export const dynamic="force-dynamic";

export default async function FollowUpStudioPage({params}:{params:{id:string}}){
 const business=await getCurrentBusinessOrDemo({redirectIfMissing:true});const supabase=createSupabaseServerClient();if(!business||!supabase)notFound();
 const{data:document,error}=await supabase.from("opportunity_documents").select("id,opportunity_id,title,body,status,generation_mode,created_at,document_type").eq("id",params.id).eq("business_id",business.id).maybeSingle();
 if(error||!document||!["outreach_email","follow_up_email","linkedin_message","whatsapp_message"].includes(document.document_type))notFound();
 const[{data:opportunity},{data:action},{data:events}]=await Promise.all([
  supabase.from("opportunities").select("id,title,contact_name,contact_email,summary,recommended_action").eq("id",document.opportunity_id).eq("business_id",business.id).maybeSingle(),
  supabase.from("opportunity_actions").select("due_at").eq("opportunity_id",document.opportunity_id).eq("business_id",business.id).eq("type","follow_up").eq("status","pending").order("due_at",{ascending:true,nullsFirst:false}).limit(1).maybeSingle(),
  supabase.from("opportunity_events").select("id,label,description,event_type,occurred_at,created_at,actor_profile_id,metadata").eq("opportunity_id",document.opportunity_id).eq("business_id",business.id).in("event_type",["document_generated","document_edited","document_copied","document_approved","document_ready_to_send","document_archived","follow_up_approval_invalidated","follow_up_readiness_checked","follow_up_confirmation_opened","follow_up_send_attempted","follow_up_provider_disabled","follow_up_test_completed","follow_up_send_succeeded","follow_up_send_failed","follow_up_replay_blocked"]).order("occurred_at",{ascending:false}).limit(50)
 ]);
 if(!opportunity)notFound();
 const relevant=(events??[]).filter(event=>{const metadata=event.metadata as Record<string,unknown>|null;return metadata?.document_id===document.id||event.event_type==="document_generated"});
 const actorIds=Array.from(new Set(relevant.map(event=>event.actor_profile_id).filter((id):id is string=>Boolean(id))));
 const{data:profiles}=actorIds.length?await supabase.from("profiles").select("id,full_name").in("id",actorIds):{data:[] as Array<{id:string;full_name:string|null}>};
 const actorNames=new Map((profiles??[]).map(profile=>[profile.id,profile.full_name??"Membru echipă"]));
 const normalized=normalizeFollowUpDraft(document.title,document.body??"");
 const timeline=relevant.map(event=>({id:event.id,label:event.label,description:event.description??"",date:event.occurred_at??event.created_at??undefined,actorName:event.actor_profile_id?actorNames.get(event.actor_profile_id):undefined}));
 const readiness=await getFollowUpSendReadiness(document.id);
 return <PageShell eyebrow="Follow-up Studio" title={normalized.subject||"Draft comercial"} description="Revizuire, confirmare umană și trimitere controlată server-side."><FollowUpStudio initialDraft={{id:document.id,opportunityId:opportunity.id,opportunityTitle:opportunity.title,subject:normalized.subject,body:normalized.body,status:document.status,generationMode:document.generation_mode??"local_fallback",recipientEmail:opportunity.contact_email??undefined,contactName:opportunity.contact_name??undefined,reason:opportunity.recommended_action??opportunity.summary??undefined,dueDate:action?.due_at??undefined}} timeline={timeline} initialReadiness={readiness}/></PageShell>
}
