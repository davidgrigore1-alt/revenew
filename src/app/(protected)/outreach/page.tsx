import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { OutreachBoard, type OutreachDraftItem } from "@/components/outreach/OutreachBoard";
import { Button } from "@/components/ui/Button";
import { normalizeFollowUpDraft } from "@/lib/follow-up-studio";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
export const dynamic="force-dynamic";
export default async function OutreachPage(){
 let drafts:OutreachDraftItem[]=[];
 if(isSupabaseConfigured){const business=await getCurrentBusinessOrDemo({redirectIfMissing:true});const supabase=createSupabaseServerClient();if(business&&supabase){
  const[{data:documents,error},{data:actions,error:actionsError}]=await Promise.all([
   supabase.from("opportunity_documents").select("id,opportunity_id,title,body,status,generation_mode,created_at,opportunities(title)").eq("business_id",business.id).in("document_type",["outreach_email","follow_up_email","linkedin_message","whatsapp_message"]).order("created_at",{ascending:false}),
   supabase.from("opportunity_actions").select("opportunity_id,due_at").eq("business_id",business.id).eq("status","pending").eq("type","follow_up").order("due_at",{ascending:true,nullsFirst:false})
  ]);if(error)throw new Error(`Outreach document load error: ${error.message}`);if(actionsError)throw new Error(`Outreach action load error: ${actionsError.message}`);
  const due=new Map<string,string>();for(const a of actions??[])if(a.due_at&&!due.has(a.opportunity_id))due.set(a.opportunity_id,a.due_at);
  drafts=(documents??[]).map(d=>{const rel=d.opportunities as {title?:string}|Array<{title?:string}>|null;const normalized=normalizeFollowUpDraft(d.title,d.body??"");return{id:d.id,opportunityId:d.opportunity_id,opportunityTitle:(Array.isArray(rel)?rel[0]?.title:rel?.title)??"Oportunitate",subject:normalized.subject,body:normalized.body,status:d.status,generationMode:d.generation_mode??"local_fallback",createdAt:d.created_at??undefined,nextDueAt:due.get(d.opportunity_id)}})
 }}
 return <PageShell eyebrow="Documente" title="Follow-up Studio" description="Revizuiește, adaptează și aprobă drafturile comerciale. Niciun mesaj nu este trimis automat."><div className="grid gap-6">{!isSupabaseConfigured?<DemoNotice/>:null}{drafts.length?<OutreachBoard drafts={drafts}/>:<div className="grid gap-3"><EmptyState title="Nu există drafturi comerciale încă" description="Generează un email sau un follow-up dintr-o oportunitate, apoi revizuiește-l aici."/><div><Button href="/opportunities">Vezi oportunități</Button></div></div>}</div></PageShell>
}