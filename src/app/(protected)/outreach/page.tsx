import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { OutreachBoard } from "@/components/outreach/OutreachBoard";
import { Button } from "@/components/ui/Button";
import { outreachSequences as demoSequences } from "@/lib/mock-data";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { OutreachSequence } from "@/lib/types";

export default async function OutreachPage() {
  let sequences: OutreachSequence[] = isSupabaseConfigured ? [] : demoSequences;

  if (isSupabaseConfigured) {
    const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
    const supabase = createSupabaseServerClient();
    if (business && supabase) {
      const { data, error } = await supabase
        .from("outreach_sequences")
        .select("id,name,target,status,outreach_messages(id,subject,body,status,scheduled_at)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Outreach load error: ${error.message}`);
      }

      sequences = (data ?? []).map(
        (sequence): OutreachSequence => ({
          id: sequence.id,
          name: sequence.name,
          target: sequence.target ?? "",
          status: sequence.status,
          messages: (sequence.outreach_messages ?? []).map((message) => ({
            id: message.id,
            subject: message.subject,
            body: message.body,
            status: message.status,
            dueDate: message.scheduled_at ?? undefined
          })),
          followUps: []
        })
      );

      const { data: documents, error: documentsError } = await supabase
        .from("opportunity_documents")
        .select("id,title,body,status,document_type,created_at,opportunities(title,contact_email)")
        .eq("business_id", business.id)
        .in("document_type", ["outreach_email", "follow_up_email", "linkedin_message", "whatsapp_message"])
        .order("created_at", { ascending: false });

      if (documentsError) {
        throw new Error(`Outreach document load error: ${documentsError.message}`);
      }

      const documentMessages = (documents ?? []).map((document) => {
        const opportunity = (document as { opportunities?: { title?: string } | Array<{ title?: string }> }).opportunities;

        return {
          id: document.id,
          subject: document.title,
          body: document.body ?? "",
          status: document.status === "sent" ? "sent" : "draft",
          dueDate: document.created_at ?? undefined,
          recipientCompany: Array.isArray(opportunity) ? opportunity[0]?.title : opportunity?.title
        };
      }) as OutreachSequence["messages"];

      if (documentMessages.length > 0) {
        sequences = [
          {
            id: "generated-documents",
            name: "Documente generate din oportunitati",
            target: "Oportunitati active",
            status: "draft",
            messages: documentMessages,
            followUps: []
          },
          ...sequences
        ];
      }
    }
  }

  return (
    <PageShell
      eyebrow="Outreach"
      title="Secvente, drafturi si follow-up-uri"
      description="Pregateste comunicarea comerciala fara a trimite emailuri reale. Resend nu este conectat inca."
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        {isSupabaseConfigured && sequences.length === 0 ? (
          <div className="grid gap-3">
            <EmptyState title="Nu exista mesaje reale inca" description="Mesajele generate pentru oportunitati vor aparea aici dupa ce creezi emailuri, follow-up-uri sau drafturi de oferta." />
            <div>
              <Button href="/opportunities">Vezi oportunitati</Button>
            </div>
          </div>
        ) : (
          <OutreachBoard sequences={sequences} />
        )}
      </div>
    </PageShell>
  );
}
