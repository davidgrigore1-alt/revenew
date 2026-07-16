import { notFound } from "next/navigation";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { getOpportunityTypeLabel } from "@/components/dashboard/OpportunityCard";
import { Button } from "@/components/ui/Button";
import { CreateTaskForm } from "@/components/revenue/TaskControls";
import { OpportunityControlCenter } from "@/components/opportunities/OpportunityControlCenter";
import { CommercialResponsePanel } from "@/components/opportunities/CommercialResponsePanel";
import { getCommercialSignalForOpportunity } from "@/lib/commercial-inbox";
import { OpportunityWorkflow } from "@/components/opportunities/OpportunityWorkflow";
import { getCurrentBusinessOrDemo, getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { opportunities } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { isOpenAIConfigured } from "@/lib/openai/client";

export function generateStaticParams() {
  return opportunities.map((opportunity) => ({ id: opportunity.id }));
}

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const opportunity = await getOpportunityForCurrentBusiness(params.id);
  const demoBusiness = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const sourceSignal = await getCommercialSignalForOpportunity(params.id);
  const [crm, assignableProfiles] = await Promise.all([
    getCrmWorkspaceForCurrentBusiness(),
    getAssignableProfilesForCurrentBusiness()
  ]);

  if (!opportunity) {
    notFound();
  }

  if (!demoBusiness) {
    notFound();
  }

  const workflowOpportunity = sourceSignal ? {
    ...opportunity,
    relevance: Array.from(new Set([
      sourceSignal.primaryRecoveryReason,
      sourceSignal.detectedCommercialIntent,
      sourceSignal.relationshipContext
    ].filter((item): item is string => Boolean(item)))),
    risks: Array.from(new Set([...(sourceSignal.riskNotes ?? []), ...sourceSignal.uncertaintyNotes]))
  } : opportunity;

  return (
    <PageShell
      eyebrow={getOpportunityTypeLabel(opportunity.type)}
      title={opportunity.title}
      description={opportunity.summary}
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        {sourceSignal ? (
          <DataCard
            title="Creata din Inbox Comercial"
            description="Aceasta oportunitate a pornit dintr-un semnal comercial revizuit."
            action={<Button href="/inbox" variant="secondary">Inapoi la inbox</Button>}
          >
            <div className="grid gap-4 text-sm leading-6 text-zinc-300 md:grid-cols-3">
              <p>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Sursa</span>
                {sourceSignal.sourceLabel ?? sourceSignal.source}
              </p>
              <p>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Contact</span>
                {[sourceSignal.contactName, sourceSignal.contactCompany].filter(Boolean).join(" | ") || "Contact neconfirmat"}
              </p>
              <p>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Sumar initial</span>
                {sourceSignal.extractedSummary || sourceSignal.detectedNeed || "Fara sumar initial."}
              </p>
            </div>
          </DataCard>
        ) : null}
        <OpportunityControlCenter opportunity={opportunity} assignableProfiles={assignableProfiles} />
        <CommercialResponsePanel opportunity={opportunity} />
        <DataCard title="Programează o acțiune internă" description="Creează un follow-up sau task intern. Nu se trimite nimic către client.">
          <CreateTaskForm opportunityId={opportunity.id} assignableProfiles={assignableProfiles} />
        </DataCard>
        <OpportunityWorkflow
          opportunity={workflowOpportunity}
          business={demoBusiness}
          openAIConfigured={isOpenAIConfigured()}
          existingContacts={crm.ready ? crm.contacts.map((contact) => ({
            id: contact.id,
            fullName: contact.fullName,
            organizationName: contact.organization?.name,
            email: contact.email
          })) : []}
        />
      </div>
    </PageShell>
  );
}
