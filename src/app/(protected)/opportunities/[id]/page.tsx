import Link from "next/link";
import { getImpactLinks } from "@/lib/revenue-impact-server";
import { getCommercialTruthForOpportunity } from "@/lib/commercial-truth-server";
import { CommercialTruthSnapshot } from "@/components/commercial-truth/CommercialTruthSnapshot";
import { DriveWorkspace } from "@/components/apps/DriveWorkspace";
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
import { formatCurrency } from "@/lib/utils";
import { formatProductDateTime } from "@/lib/ui/presentation";
import { buildOpportunityCommercialState, describeCurrentCommercialState } from "@/lib/opportunity-commercial-state";
import { getExternalContextForDraft } from "@/lib/ai/google-context-tool";
import { preparedWorkForOpportunity } from "@/lib/prepared-work";
import { ActionPreview } from "@/components/intelligence/ActionPreview";
import { RecordNotes } from "@/components/workspace/RecordNotes";
import { getWorkspaceNotes } from "@/lib/workspace-notes";

export function generateStaticParams() {
  return opportunities.map((opportunity) => ({ id: opportunity.id }));
}

const opportunityTabs = [
  { id: "context", label: "Context" },
  { id: "responsibility", label: "Responsabilitate" },
  { id: "response", label: "Răspuns" },
  { id: "schedule", label: "Planificare" },
  { id: "history", label: "Semnale" },
  { id: "notes", label: "Note" },
  { id: "files", label: "Documente" },
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
  const [privateExternalContext,commercialTruth,impactLinks] = await Promise.all([getExternalContextForDraft(opportunity.id),getCommercialTruthForOpportunity(opportunity.id).catch(()=>null),getImpactLinks([opportunity.id]).catch(()=>({} as Record<string,string>))]);
  const commercialState = buildOpportunityCommercialState(opportunity, {
    linkedSignals,
    communication: {
      lastInboundAt: privateExternalContext.lastInboundEmail?.sent_at,
      lastOutboundAt: privateExternalContext.lastOutboundEmail?.sent_at,
      nextMeetingAt: privateExternalContext.nextMeeting?.starts_at,
      expectedResponseWindowDays: privateExternalContext.responseWindowBusinessDays
    }
  });
  const [preparedWork, workspaceNotes] = await Promise.all([
    Promise.resolve(preparedWorkForOpportunity(opportunity)),
    getWorkspaceNotes("opportunity", opportunity.id)
  ]);
  const opportunityQueue = buildWorkspaceDecisionQueue(
    { opportunities: [opportunity], signals: linkedSignals },
    { limit: 1 }
  );
  const explainedRecommendation = opportunityQueue.items[0]
    ? buildOperationalRecommendation(opportunityQueue.items[0])
    : null;
  const currentFacts = describeCurrentCommercialState(commercialState);
  const evidenceBackedDescription = currentFacts.blocker;
  let intelligenceTimeline: OpportunityTimelineResult | null = null;
  try {
    intelligenceTimeline = buildOpportunityIntelligenceTimeline({ opportunity, linkedSignals, externalContext: privateExternalContext });
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
        <section aria-label="Situația acum" className="border-y border-[rgb(var(--border))] py-3">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
            {[["Companie",opportunity.contact?.company ?? opportunity.contacts?.[0]?.contact.organization?.name ?? "Neconfirmată"],
              ["Etapă",getOpportunityTypeLabel(opportunity.type)],
              ["Valoare estimată",commercialState.financial.estimatedValue?formatCurrency(commercialState.financial.estimatedValue,commercialState.financial.currency):"Neconfirmată"],
              ["Responsabil",commercialState.ownership.ownerName??(commercialState.ownership.ownerProfileId?"Atribuit · nume indisponibil":"Neatribuit")],
              ["Următorul termen",commercialState.nextAction?.dueAt?formatProductDateTime(commercialState.nextAction.dueAt):"Neconfirmat"],
              ["Stare curentă",currentFacts.blocker]].map(([label,value])=><div key={label}><dt className="text-xs text-[rgb(var(--text-muted))]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}
          </dl>
        </section>
        <nav aria-label="Secțiunile oportunității" className="flex gap-1 overflow-x-auto border-b border-[rgb(var(--border))]">
          {opportunityTabs.map((tab) => <Link key={tab.id} href={`?tab=${tab.id}`} aria-current={activeTab === tab.id ? "page" : undefined} className="focus-ring whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))] aria-[current=page]:border-[rgb(var(--primary))] aria-[current=page]:text-[rgb(var(--foreground))]">{tab.label}</Link>)}
        </nav>
        {activeTab === "context" ? <section aria-label="Contextul oportunității" className="grid gap-6">
          {impactLinks[opportunity.id]?<Link className="focus-ring block border-b border-[rgb(var(--border))] py-3 text-xs hover:underline" href={impactLinks[opportunity.id]}>Impact urmărit · Vezi dovada →</Link>:null}
          <CommercialTruthSnapshot truth={commercialTruth} showFacts={false}/>
          <details className="min-w-0"><summary className="focus-ring cursor-pointer rounded py-2 text-xs font-medium text-[rgb(var(--text-muted))]">Execuție și înregistrări CRM</summary><div id="opportunity-commercial-facts" className="scroll-mt-24" data-guide-anchor="opportunity-commercial-facts"><OpportunityControlCenter opportunity={opportunity} commercialState={commercialState} assignableProfiles={assignableProfiles} /></div></details>
          <div className="grid items-start gap-6 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-8"><OpportunityIntelligenceTimeline result={intelligenceTimeline} showCurrentState={false} /></div>
            <aside className="grid min-w-0 gap-5 xl:sticky xl:top-20 xl:col-span-4" aria-label="Decizie și intervenție">
              {explainedRecommendation ? <div id="opportunity-evidence" className="scroll-mt-24" data-guide-anchor="opportunity-evidence"><RecommendationExplanationCard recommendation={explainedRecommendation} currentState={commercialState} compact /></div> : null}
              {preparedWork[0] ? <ActionPreview item={preparedWork[0]} compact /> : null}
              <details><summary className="focus-ring cursor-pointer py-2 text-xs font-medium text-[rgb(var(--text-secondary))]">Alte acțiuni interne</summary><OpportunityActionWorkbench opportunity={opportunity} recommendation={assistedPreparation} compact /></details>
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
              <div className="divide-y divide-[rgb(var(--border))]">{linkedSignals.slice(0, 5).map((signal) => <div key={signal.id} className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto]"><div><p className="text-sm font-semibold">{signal.title}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{signal.sourceLabel ?? signal.source} · {[signal.contactName, signal.contactCompany].filter(Boolean).join(" · ") || "Contact neconfirmat"}</p></div><p className="max-w-md text-sm text-[rgb(var(--text-secondary))]"><span className="font-medium text-[rgb(var(--foreground))]">Recomandare la analiza semnalului:</span> {signal.recommendedAction || signal.extractedSummary || "Necesită verificare."}</p></div>)}</div>
            </div>
          </details>
        ) : null}
        {activeTab === "history" && !sourceSignal ? <DataCard title="Semnale comerciale" description="Nu există semnale comerciale asociate acestei oportunități. Istoricul verificabil rămâne disponibil în Context." /> : null}
        {activeTab === "files" ? <DriveWorkspace opportunityId={opportunity.id} /> : null}
        {activeTab === "notes" ? <RecordNotes targetType="opportunity" targetId={opportunity.id} notes={workspaceNotes} /> : null}
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
