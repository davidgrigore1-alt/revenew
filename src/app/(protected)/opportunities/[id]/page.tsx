import { notFound } from "next/navigation";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { getOpportunityTypeLabel } from "@/components/dashboard/OpportunityCard";
import { Button } from "@/components/ui/Button";
import { CreateTaskForm } from "@/components/revenue/TaskControls";
import { OpportunityControlCenter } from "@/components/opportunities/OpportunityControlCenter";
import { CommercialResponsePanel } from "@/components/opportunities/CommercialResponsePanel";
import { AssistedPreparation } from "@/components/recovery/AssistedPreparation";
import { approvalStateForSignal } from "@/lib/approval-center";
import { getCommercialSignalsForOpportunity } from "@/lib/commercial-inbox";
import { OpportunityWorkflow } from "@/components/opportunities/OpportunityWorkflow";
import { getCurrentBusinessOrDemo, getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness, recommendNextBestAction } from "@/lib/revenue-workspace";
import { opportunities } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { isOpenAIConfigured } from "@/lib/openai/client";

export function generateStaticParams() {
  return opportunities.map((opportunity) => ({ id: opportunity.id }));
}

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const opportunity = await getOpportunityForCurrentBusiness(params.id);
  const demoBusiness = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const linkedSignals = await getCommercialSignalsForOpportunity(params.id);
  const sourceSignal = linkedSignals[0] ?? null;
  const pendingApprovalSignal = linkedSignals.find((signal) => approvalStateForSignal(signal) === "pending") ?? null;
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
  const assistedPreparation = recommendNextBestAction(opportunity);

  return (
    <PageShell
      eyebrow={getOpportunityTypeLabel(opportunity.type)}
      title={opportunity.title}
      description={opportunity.summary}
      breadcrumbs={[{ label: "Oportunități", href: "/opportunities" }, { label: opportunity.title }]}
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <OpportunityControlCenter opportunity={opportunity} assignableProfiles={assignableProfiles} />
        <AssistedPreparation
          context="Recomandarea folosește starea oportunității, contactul principal, acțiunile și termenele deja înregistrate."
          suggestion={assistedPreparation.action}
          reason={assistedPreparation.reason}
          missingInformation={assistedPreparation.missingInformation}
          href="#workflow-actions"
          actionLabel="Revizuiește și programează"
        />
        {sourceSignal ? (
          <DataCard
            title="Semnale asociate"
            description="Contextul de origine rămâne verificabil; execuția continuă din următoarea acțiune a oportunității."
            action={pendingApprovalSignal
              ? <Button href={`/approvals?signal=${pendingApprovalSignal.id}`} variant="secondary">Revizuiește aprobarea</Button>
              : <Button href={`/inbox?signal=${sourceSignal.id}`} variant="secondary">Revizuiește semnalul</Button>}
          >
            <div className="divide-y divide-[rgb(var(--border))]">{linkedSignals.slice(0, 5).map((signal) => <div key={signal.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm font-semibold">{signal.title}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{signal.sourceLabel ?? signal.source} · {[signal.contactName, signal.contactCompany].filter(Boolean).join(" · ") || "Contact neconfirmat"}</p></div><p className="max-w-md text-sm text-[rgb(var(--text-secondary))]"><span className="font-medium text-[rgb(var(--foreground))]">Context pentru execuție:</span> {signal.recommendedAction || signal.extractedSummary || "Necesită verificare."}</p></div>)}</div>
          </DataCard>
        ) : null}
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
