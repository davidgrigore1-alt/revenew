import Link from "next/link";
import { notFound } from "next/navigation";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { getOpportunityTypeLabel } from "@/components/dashboard/OpportunityCard";
import { Button } from "@/components/ui/Button";
import { CreateTaskForm } from "@/components/revenue/TaskControls";
import { OpportunityActionWorkbench } from "@/components/opportunities/OpportunityActionWorkbench";
import { OpportunityControlCenter } from "@/components/opportunities/OpportunityControlCenter";
import { OpportunityIntelligenceTimeline } from "@/components/opportunities/OpportunityIntelligenceTimeline";
import { RecommendationExplanationCard } from "@/components/intelligence/RecommendationExplanationCard";
import { CommercialResponsePanel } from "@/components/opportunities/CommercialResponsePanel";
import { approvalStateForSignal } from "@/lib/approval-center";
import { getCommercialSignalsForOpportunity } from "@/lib/commercial-inbox";
import { OpportunityWorkflow } from "@/components/opportunities/OpportunityWorkflow";
import { getCurrentBusinessOrDemo, getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { getAssignableProfilesForCurrentBusiness, getCrmWorkspaceForCurrentBusiness, recommendNextBestAction } from "@/lib/revenue-workspace";
import { opportunities } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { isOpenAIConfigured } from "@/lib/openai/client";
import { buildOperationalRecommendation } from "@/lib/operational-intelligence";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";
import { buildOpportunityIntelligenceTimeline, type OpportunityTimelineResult } from "@/lib/opportunity-intelligence-timeline";
import { buildOpportunityCommercialState } from "@/lib/opportunity-commercial-state";

export function generateStaticParams() {
  return opportunities.map((opportunity) => ({ id: opportunity.id }));
}

const opportunityTabs = [
  { id: "context", label: "Context" },
  { id: "responsibility", label: "Responsabilitate" },
  { id: "response", label: "Răspuns" },
  { id: "schedule", label: "Planificare" },
  { id: "history", label: "Istoric" },
  { id: "workflow", label: "Flux" }
] as const;
type OpportunityTab = typeof opportunityTabs[number]["id"];

export default async function OpportunityDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { tab?: string } }) {
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
  const commercialState = buildOpportunityCommercialState(opportunity, { linkedSignals });
  const opportunityQueue = buildWorkspaceDecisionQueue(
    { opportunities: [opportunity], signals: linkedSignals },
    { limit: 1 }
  );
  const explainedRecommendation = opportunityQueue.items[0]
    ? buildOperationalRecommendation(opportunityQueue.items[0])
    : null;
  const evidenceBackedDescription = sourceSignal?.primaryRecoveryReason
    || sourceSignal?.extractedSummary
    || opportunity.summary;
  let intelligenceTimeline: OpportunityTimelineResult | null = null;
  try {
    intelligenceTimeline = buildOpportunityIntelligenceTimeline({ opportunity, linkedSignals });
  } catch (error) {
    console.error("opportunity_timeline_build_failed", { reason: error instanceof Error ? error.name : "unknown" });
  }
  const activeTab: OpportunityTab = opportunityTabs.some((tab) => tab.id === searchParams?.tab) ? searchParams!.tab as OpportunityTab : "context";
  return (
    <PageShell
      eyebrow={getOpportunityTypeLabel(opportunity.type)}
      title={opportunity.title}
      description={evidenceBackedDescription}
      breadcrumbs={[{ label: "Oportunități", href: "/opportunities" }, { label: opportunity.title }]}
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <nav aria-label="Secțiunile oportunității" className="flex gap-1 overflow-x-auto border-b border-[rgb(var(--border))]">
          {opportunityTabs.map((tab) => <Link key={tab.id} href={`?tab=${tab.id}`} aria-current={activeTab === tab.id ? "page" : undefined} className="focus-ring whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))] aria-[current=page]:border-[rgb(var(--primary))] aria-[current=page]:text-[rgb(var(--foreground))]">{tab.label}</Link>)}
        </nav>
        {activeTab === "context" ? <section aria-label="Contextul oportunității" className="grid gap-6">
          <div id="opportunity-commercial-facts" className="scroll-mt-24" data-guide-anchor="opportunity-commercial-facts"><OpportunityControlCenter opportunity={opportunity} commercialState={commercialState} assignableProfiles={assignableProfiles} /></div>
          <div className="grid items-start gap-6 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-8"><OpportunityIntelligenceTimeline result={intelligenceTimeline} /></div>
            <aside className="grid min-w-0 gap-5 xl:sticky xl:top-20 xl:col-span-4" aria-label="Decizie și intervenție">
              {explainedRecommendation ? <div id="opportunity-evidence" className="scroll-mt-24" data-guide-anchor="opportunity-evidence"><RecommendationExplanationCard recommendation={explainedRecommendation} compact /></div> : null}
              <OpportunityActionWorkbench opportunity={opportunity} recommendation={assistedPreparation} compact />
            </aside>
          </div>
        </section> : null}
        {activeTab === "responsibility" ? <section id="action-responsibility">
          <OpportunityControlCenter opportunity={opportunity} commercialState={commercialState} assignableProfiles={assignableProfiles} mode="responsibility" />
          <div className="mt-4">
          <OpportunityControlCenter opportunity={opportunity} commercialState={commercialState} assignableProfiles={assignableProfiles} mode="outcome" />
          </div>
        </section> : null}
        {activeTab === "response" ? <section id="action-response">
          <CommercialResponsePanel opportunity={opportunity} />
        </section> : null}
        {activeTab === "schedule" ? <section id="action-schedule">
          <DataCard title="Programează o acțiune internă" description="Creează un follow-up sau task intern. Nu se trimite nimic către client.">
            <CreateTaskForm opportunityId={opportunity.id} assignableProfiles={assignableProfiles} />
          </DataCard>
        </section> : null}
        {activeTab === "history" && sourceSignal ? (
          <details className="group rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
            <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-4 py-3 marker:hidden sm:px-5">
              <span>
                <span className="block text-sm font-semibold">Semnale asociate <span className="font-normal text-[rgb(var(--text-muted))]">({linkedSignals.length})</span></span>
                <span className="mt-0.5 block text-xs text-[rgb(var(--text-muted))]">Contextul de origine rămâne verificabil și poate fi consultat la nevoie.</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="border-t border-[rgb(var(--border))] p-4 sm:p-5">
              <div className="mb-4 flex justify-end">
                {pendingApprovalSignal
                  ? <Button href={`/approvals?signal=${pendingApprovalSignal.id}`} variant="secondary" size="small">Revizuiește aprobarea</Button>
                  : <Button href={`/inbox?signal=${sourceSignal.id}`} variant="secondary" size="small">Revizuiește semnalul</Button>}
              </div>
              <div className="divide-y divide-[rgb(var(--border))]">{linkedSignals.slice(0, 5).map((signal) => <div key={signal.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm font-semibold">{signal.title}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{signal.sourceLabel ?? signal.source} · {[signal.contactName, signal.contactCompany].filter(Boolean).join(" · ") || "Contact neconfirmat"}</p></div><p className="max-w-md text-sm text-[rgb(var(--text-secondary))]"><span className="font-medium text-[rgb(var(--foreground))]">Context pentru execuție:</span> {signal.recommendedAction || signal.extractedSummary || "Necesită verificare."}</p></div>)}</div>
            </div>
          </details>
        ) : null}
        {activeTab === "history" && !sourceSignal ? <DataCard title="Istoric comercial" description="Nu există semnale asociate acestei oportunități." /> : null}
        {activeTab === "workflow" ? <OpportunityWorkflow
          opportunity={workflowOpportunity}
          business={demoBusiness}
          openAIConfigured={isOpenAIConfigured()}
          existingContacts={crm.ready ? crm.contacts.map((contact) => ({
            id: contact.id,
            fullName: contact.fullName,
            organizationName: contact.organization?.name,
            email: contact.email
          })) : []}
        /> : null}
      </div>
    </PageShell>
  );
}
