import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { OutreachBoard, type OutreachDraftItem } from "@/components/outreach/OutreachBoard";
import { Button } from "@/components/ui/Button";
import { normalizeFollowUpDraft } from "@/lib/follow-up-studio";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  let drafts: OutreachDraftItem[] = [];
  if (isSupabaseConfigured) {
    const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
    const supabase = createSupabaseServerClient();
    if (business && supabase) {
      const [{ data: documents, error }, { data: actions, error: actionsError }] = await Promise.all([
        supabase.from("opportunity_documents").select("id,opportunity_id,title,body,status,generation_mode,created_at,opportunities(title)").eq("business_id", business.id).in("document_type", ["outreach_email", "follow_up_email", "linkedin_message", "whatsapp_message"]).order("created_at", { ascending: false }),
        supabase.from("opportunity_actions").select("opportunity_id,due_at").eq("business_id", business.id).eq("status", "pending").eq("type", "follow_up").order("due_at", { ascending: true, nullsFirst: false })
      ]);
      if (error) throw new Error(`Outreach document load error: ${error.message}`);
      if (actionsError) throw new Error(`Outreach action load error: ${actionsError.message}`);
      const due = new Map<string, string>();
      for (const action of actions ?? []) if (action.due_at && !due.has(action.opportunity_id)) due.set(action.opportunity_id, action.due_at);
      drafts = (documents ?? []).map((document) => {
        const relation = document.opportunities as { title?: string } | Array<{ title?: string }> | null;
        const normalized = normalizeFollowUpDraft(document.title, document.body ?? "");
        return { id: document.id, opportunityId: document.opportunity_id, opportunityTitle: (Array.isArray(relation) ? relation[0]?.title : relation?.title) ?? "Oportunitate", subject: normalized.subject, body: normalized.body, status: document.status, generationMode: document.generation_mode ?? "local_fallback", createdAt: document.created_at ?? undefined, nextDueAt: due.get(document.opportunity_id) };
      });
    }
  }

  return (
    <PageShell eyebrow="Documente" title="Follow-up Studio" description="Revizuiește, adaptează și aprobă comunicarea comercială. Niciun mesaj nu este trimis automat." actions={<Button href="/opportunities" variant="secondary">Vezi oportunitățile</Button>}>
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        {drafts.length ? <OutreachBoard drafts={drafts} /> : <div className="grid justify-items-start gap-3"><EmptyState title="Nu există drafturi comerciale încă" description="Generează un email sau un follow-up dintr-o oportunitate. Documentul va apărea aici pentru revizuire și aprobare umană." /><Button href="/opportunities">Vezi oportunitățile</Button></div>}
      </div>
    </PageShell>
  );
}
