import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ReportActions } from "@/components/reports/ReportActions";
import { getCommercialInboxSummary } from "@/lib/commercial-inbox";
import { weeklyReport } from "@/lib/mock-data";
import { getCurrentBusinessOrDemo, getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTimeWithSeconds } from "@/lib/utils";

type ReportAction = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "done" | "cancelled";
  dueAt?: string;
  priority?: "low" | "medium" | "high";
  opportunityId?: string;
};

type ReportDocument = {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt?: string;
  opportunityId?: string;
};

type ReportEvent = {
  id: string;
  label: string;
  type: string;
  description: string;
  date?: string;
  opportunityId?: string;
};

const isDevelopmentMode = process.env.NODE_ENV === "development";

const eventTypeLabels: Record<string, string> = {
  document_generated: "Document generat",
  document_edited: "Document editat",
  document_copied: "Document copiat",
  document_ready_to_send: "Document pregatit de trimis",
  document_marked_sent: "Document marcat ca trimis",
  follow_up_scheduled: "Follow-up programat",
  action_completed: "Actiune finalizata",
  action_postponed: "Actiune amanata",
  action_cancelled: "Actiune anulata",
  marked_contacted: "Oportunitate contactata",
  marked_won: "Oportunitate castigata",
  marked_lost: "Oportunitate pierduta",
  ignored: "Oportunitate ignorata",
  ai_analysis_saved: "Analiza salvata",
  local_analysis_saved: "Analiza salvata"
};

const priorityLabels: Record<string, string> = {
  low: "Scazuta",
  medium: "Medie",
  high: "Ridicata"
};

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function eventLabel(type: string, fallback: string) {
  return eventTypeLabels[type] ?? fallback;
}

function dedupeActions(actions: ReportAction[]) {
  const seen = new Map<string, ReportAction>();

  for (const action of actions) {
    const key = [action.opportunityId ?? "none", action.title, action.dueAt?.slice(0, 16) ?? "none"].join("|");
    if (!seen.has(key)) {
      seen.set(key, action);
    }
  }

  return Array.from(seen.values());
}

async function loadWorkflowData(opportunities: Opportunity[]) {
  if (!isSupabaseConfigured) {
    return {
      actions: opportunities.flatMap((opportunity) =>
        opportunity.actions.map((action) => ({ ...action, dueAt: action.dueDate, opportunityId: opportunity.id }))
      ),
      documents: opportunities.flatMap((opportunity) =>
        opportunity.documents.map((document) => ({ ...document, type: document.type ?? "document", createdAt: document.createdAt, opportunityId: opportunity.id }))
      ),
      events: opportunities.flatMap((opportunity) =>
        opportunity.timeline.map((event) => ({ ...event, type: event.type ?? "event", opportunityId: opportunity.id }))
      )
    };
  }

  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!business || !supabase) {
    return { actions: [], documents: [], events: [] };
  }

  const opportunityIds = opportunities.map((opportunity) => opportunity.id);
  const [{ data: actionRows, error: actionError }, { data: documentRows, error: documentError }] = await Promise.all([
    supabase
      .from("opportunity_actions")
      .select("id,title,description,status,due_at,priority,opportunity_id")
      .eq("business_id", business.id)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("opportunity_documents")
      .select("id,title,document_type,status,created_at,opportunity_id")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
  ]);

  if (actionError) {
    throw new Error(`Report actions load error: ${actionError.message}`);
  }

  if (documentError) {
    throw new Error(`Report documents load error: ${documentError.message}`);
  }

  let eventRows: Array<{
    id: string;
    label: string;
    event_type: string;
    description: string | null;
    occurred_at: string | null;
    created_at: string | null;
    opportunity_id: string;
  }> = [];

  if (opportunityIds.length > 0) {
    const { data, error } = await supabase
      .from("opportunity_events")
      .select("id,label,event_type,description,occurred_at,created_at,opportunity_id")
      .in("opportunity_id", opportunityIds)
      .order("occurred_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Report events load error: ${error.message}`);
    }
    eventRows = data ?? [];
  }

  return {
    actions: (actionRows ?? []).map(
      (action): ReportAction => ({
        id: action.id,
        title: action.title,
        description: action.description ?? "",
        status: action.status,
        dueAt: action.due_at ?? undefined,
        priority: action.priority ?? "medium",
        opportunityId: action.opportunity_id
      })
    ),
    documents: (documentRows ?? []).map(
      (document): ReportDocument => ({
        id: document.id,
        title: document.title,
        type: document.document_type,
        status: document.status,
        createdAt: document.created_at ?? undefined,
        opportunityId: document.opportunity_id
      })
    ),
    events: eventRows.map(
      (event): ReportEvent => ({
        id: event.id,
        label: eventLabel(event.event_type, event.label),
        type: event.event_type,
        description: event.description ?? "",
        date: event.occurred_at ?? event.created_at ?? undefined,
        opportunityId: event.opportunity_id
      })
    )
  };
}

function CompactOpportunity({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="block rounded-lg border border-white/10 bg-ink-900/70 p-4 transition hover:border-mint-400/30 focus:outline-none focus:ring-2 focus:ring-mint-400/35"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={opportunity.status} />
        <ScoreBadge label="Fit" score={opportunity.fitScore} />
      </div>
      <h3 className="mt-3 font-semibold text-white">{opportunity.title}</h3>
      <div className="mt-3 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
        <p>
          <span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Valoare</span>
          <span className="font-semibold text-white">{formatCurrency(opportunity.estimatedValueLow)} - {formatCurrency(opportunity.estimatedValueHigh)}</span>
        </p>
        <p>
          <span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Termen</span>
          <span className="font-semibold text-white">{formatDate(opportunity.deadline)}</span>
        </p>
        <p>
          <span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Urmatorul pas</span>
          <span className="font-semibold text-white">{opportunity.recommendedAction}</span>
        </p>
      </div>
      <p className="mt-3 text-sm font-semibold text-mint-300">Deschide oportunitatea -&gt;</p>
    </Link>
  );
}

export default async function ReportsPage() {
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunities = isSupabaseConfigured ? await getOpportunitiesForCurrentBusiness() : weeklyReport.topOpportunities;
  const workflow = await loadWorkflowData(opportunities);
  const inboxSummary = await getCommercialInboxSummary();
  const reportGeneratedAt = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = addDays(7).slice(0, 10);
  const opportunityById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));

  const pipelineValue = opportunities.reduce((sum, item) => sum + item.estimatedValueHigh, 0);
  const activeOpportunities = opportunities.filter((item) => !["won", "lost", "ignored"].includes(item.status));
  const wonValue = opportunities.filter((item) => item.status === "won").reduce((sum, item) => sum + item.estimatedValueHigh, 0);
  const lostValue = opportunities.filter((item) => item.status === "lost").reduce((sum, item) => sum + item.estimatedValueHigh, 0);
  const deadlinesThisWeek = opportunities.filter((item) => item.deadline && item.deadline.slice(0, 10) >= today && item.deadline.slice(0, 10) <= nextWeek);
  const urgentActions = dedupeActions(workflow.actions.filter((action) => action.status === "pending" && action.dueAt && action.dueAt.slice(0, 10) <= nextWeek));
  const overdueActions = urgentActions.filter((action) => action.dueAt && action.dueAt.slice(0, 10) < today);
  const completedActions = workflow.actions.filter((action) => action.status === "done");
  const topOpportunities = [...opportunities]
    .sort((a, b) => b.fitScore + b.moneyScore + b.urgencyScore - (a.fitScore + a.moneyScore + a.urgencyScore))
    .slice(0, 5);
  const readyDocuments = workflow.documents.filter((document) => ["edited", "copied", "ready_to_send", "sent"].includes(document.status));
  const generatedDocuments = workflow.documents.length;
  const conversionRate = opportunities.length > 0 ? Math.round((opportunities.filter((item) => item.status === "won").length / opportunities.length) * 100) : 0;
  const highValueWithoutAction = activeOpportunities.filter((opportunity) => !workflow.actions.some((action) => action.opportunityId === opportunity.id) && opportunity.estimatedValueHigh >= 10000);
  const closeDeadlines = deadlinesThisWeek.filter((opportunity) => opportunity.status !== "contacted" && opportunity.status !== "won");
  const riskWarnings = [
    highValueWithoutAction.length > 0 ? `Oportunitati valoroase fara actiune recenta: ${highValueWithoutAction.length}.` : "",
    overdueActions.length > 0 ? `Follow-up-uri sau actiuni intarziate: ${overdueActions.length}.` : "",
    closeDeadlines.length > 0 ? `Deadline-uri apropiate care necesita atentie: ${closeDeadlines.length}.` : ""
  ].filter(Boolean);

  const executiveSummary = opportunities.length
    ? `Prioritatea saptamanii este urmarirea oportunitatilor active cu fit ridicat si finalizarea follow-up-urilor scadente. Exista ${activeOpportunities.length} oportunitati active in pipeline, cu o valoare estimata de ${formatCurrency(pipelineValue)} si ${urgentActions.length} actiuni urgente de verificat.${inboxSummary.tableReady ? ` Inbox-ul comercial are ${inboxSummary.newCount} semnale noi, ${inboxSummary.urgentCount} urgente si potential neconvertit de ${formatCurrency(inboxSummary.estimatedPotential)}.` : ""}`
    : "Nu exista inca suficiente date pentru un raport comercial relevant.";

  const recentActivity = workflow.events.slice(0, 8);
  const reportText = [
    "MoneyHunter AI - Raport comercial",
    `Business: ${business?.name ?? "Workspace"}`,
    `Raport generat la: ${formatDateTimeWithSeconds(reportGeneratedAt)}`,
    "",
    "Rezumat executiv",
    executiveSummary,
    "",
    "Indicatori cheie",
    `Pipeline estimat: ${formatCurrency(pipelineValue)}`,
    `Oportunitati active: ${activeOpportunities.length}`,
    `Actiuni urgente: ${urgentActions.length}`,
    `Documente pregatite: ${readyDocuments.length}`,
    `Conversie: ${conversionRate}%`,
    ...(inboxSummary.tableReady ? [
      `Semnale comerciale noi: ${inboxSummary.newCount}`,
      `Semnale comerciale urgente: ${inboxSummary.urgentCount}`,
      `Semnale convertite: ${inboxSummary.convertedCount}`,
      `Potential inbox neconvertit: ${formatCurrency(inboxSummary.estimatedPotential)}`
    ] : []),
    "",
    "Top oportunitati",
    ...(topOpportunities.length ? topOpportunities.map((opportunity, index) => `${index + 1}. ${opportunity.title} | ${formatCurrency(opportunity.estimatedValueLow)} - ${formatCurrency(opportunity.estimatedValueHigh)} | Fit ${opportunity.fitScore} | ${opportunity.recommendedAction}`) : ["Nu exista oportunitati in raport."]),
    "",
    "Actiuni urgente",
    ...(urgentActions.length ? urgentActions.slice(0, 8).map((action) => `${action.title} | ${opportunityById.get(action.opportunityId ?? "")?.title ?? "Oportunitate"} | Termen: ${formatDateTimeWithSeconds(action.dueAt)} | Prioritate: ${priorityLabels[action.priority ?? "medium"]}`) : ["Nu exista actiuni urgente."]),
    "",
    "Activitate recenta",
    ...(recentActivity.length ? recentActivity.map((event) => `${event.label} | ${formatDateTimeWithSeconds(event.date)} | ${opportunityById.get(event.opportunityId ?? "")?.title ?? "Oportunitate"}`) : ["Nu exista activitate recenta."]),
    "",
    "Avertizari",
    ...(riskWarnings.length ? riskWarnings : ["Nu exista avertizari majore in acest moment. Mentine follow-up-urile la zi."])
  ].join("\n");

  return (
    <PageShell
      eyebrow="Rapoarte"
      title="Raport comercial MoneyHunter"
      description="Imagine executiva asupra pipeline-ului, actiunilor urgente, documentelor pregatite si oportunitatilor care pot produce venit."
    >
      <div className="grid gap-6 print:block print:space-y-5">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <p className="text-sm font-semibold text-zinc-400">Raport generat la: {formatDateTimeWithSeconds(reportGeneratedAt)}</p>
        {isSupabaseConfigured && opportunities.length === 0 ? (
          <EmptyState title="Nu exista suficiente date pentru raport" description="Raportul devine relevant dupa ce exista semnale, oportunitati si actiuni urmarite." />
        ) : null}

        <DataCard title="Export raport" description="Copiaza, descarca sau printeaza raportul pentru discutia comerciala saptamanala.">
          <ReportActions reportText={reportText} fileName="moneyhunter-raport-comercial.txt" />
        </DataCard>

        <DataCard title="Rezumat executiv">
          <p className="text-sm leading-6 text-zinc-300">{executiveSummary}</p>
        </DataCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pipeline estimat" value={formatCurrency(pipelineValue)} detail="Valoarea maxima estimata a oportunitatilor din raport." tone="mint" />
          <MetricCard label="Oportunitati active" value={`${activeOpportunities.length}`} detail="Oportunitati deschise care nu sunt marcate castigate, pierdute sau ignorate." />
          <MetricCard label="Actiuni urgente" value={`${urgentActions.length}`} detail="Actiuni scadente sau apropiate, deduplicate pe oportunitate si termen." tone="gold" />
          <MetricCard label="Conversie" value={`${conversionRate}%`} detail="Ponderea oportunitatilor marcate castigate din total." />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Documente generate" value={`${generatedDocuments}`} detail="Documente comerciale pregatite in workflow." />
          <MetricCard label="Documente pregatite" value={`${readyDocuments.length}`} detail="Documente editate, copiate, pregatite sau trimise." tone="mint" />
          <MetricCard label="Actiuni finalizate" value={`${completedActions.length}`} detail="Task-uri comerciale inchise in workflow." />
          <MetricCard label="Valoare pierduta" value={formatCurrency(lostValue)} detail="Estimare din oportunitati marcate pierdute." tone="gold" />
        </div>

        {inboxSummary.tableReady ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Semnale noi" value={`${inboxSummary.newCount}`} detail="Cereri comerciale in Inbox Comercial." />
              <MetricCard label="Semnale urgente" value={`${inboxSummary.urgentCount}`} detail="Semnale cu prioritate sau urgenta mare." tone="gold" />
              <MetricCard label="Convertite" value={`${inboxSummary.convertedCount}`} detail="Semnale transformate in oportunitati." tone="mint" />
              <MetricCard label="Potential inbox" value={formatCurrency(inboxSummary.estimatedPotential)} detail="Valoare estimata din semnale active." />
            </div>

            <DataCard title="Semnale comerciale noi" description="Top semnale urgente sau noi din Inbox Comercial.">
              <div className="grid gap-3">
                {inboxSummary.topSignals.length > 0 ? (
                  inboxSummary.topSignals.map((signal) => (
                    <Link key={signal.id} href={signal.convertedOpportunityId ? `/opportunities/${signal.convertedOpportunityId}` : "/inbox"} className="block rounded-lg border border-white/10 bg-ink-900/70 p-4 transition hover:border-mint-400/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-semibold text-zinc-300">{signal.status}</span>
                        <span className="rounded border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-semibold text-zinc-300">{signal.priority}</span>
                      </div>
                      <h3 className="mt-3 font-semibold text-white">{signal.contactCompany || signal.contactName || "Semnal comercial"}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{signal.extractedSummary || signal.detectedNeed || signal.rawMessage || "Fara sumar."}</p>
                      <p className="mt-3 text-sm font-semibold text-mint-300">{signal.convertedOpportunityId ? "Deschide oportunitatea -&gt;" : "Deschide Inbox Comercial -&gt;"}</p>
                    </Link>
                  ))
                ) : (
                  <EmptyState title="Nu exista semnale noi" description="Semnalele comerciale urgente vor aparea aici dupa adaugare." />
                )}
              </div>
            </DataCard>
          </>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <DataCard title="Top oportunitati" description="Prioritate calculata din fit, valoare si urgenta.">
            <div className="grid gap-3">
              {topOpportunities.length > 0 ? topOpportunities.map((opportunity) => <CompactOpportunity key={opportunity.id} opportunity={opportunity} />) : <EmptyState title="Nu exista oportunitati" description="Transforma semnalele comerciale importante in oportunitati pentru a construi raportul de Revenue Recovery." />}
            </div>
          </DataCard>

          <div className="grid gap-6">
            <DataCard title="Actiuni urgente">
              <div className="space-y-3">
                {urgentActions.length > 0 ? (
                  urgentActions.slice(0, 8).map((action) => (
                    <Link key={action.id} href={`/opportunities/${action.opportunityId ?? ""}`} className="block rounded-lg border border-white/10 bg-ink-900/70 p-4 transition hover:border-mint-400/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{action.title}</p>
                        <span className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300">{priorityLabels[action.priority ?? "medium"]}</span>
                        <span className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300">{action.status === "pending" ? "In asteptare" : action.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{opportunityById.get(action.opportunityId ?? "")?.title ?? "Oportunitate"}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-mint-400">Termen: {formatDateTimeWithSeconds(action.dueAt)}</p>
                      <p className="mt-3 text-sm font-semibold text-mint-300">Deschide oportunitatea -&gt;</p>
                    </Link>
                  ))
                ) : (
                  <EmptyState title="Nicio actiune urgenta" description="Follow-up-urile si task-urile scadente vor aparea aici." />
                )}
              </div>
            </DataCard>

            <DataCard title="Avertizare pierderi">
              {riskWarnings.length > 0 ? (
                <ul className="space-y-3 text-sm leading-6 text-zinc-300">
                  {riskWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-zinc-300">Nu exista avertizari majore in acest moment. Mentine follow-up-urile la zi.</p>
              )}
            </DataCard>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Deadline-uri in urmatoarele 7 zile">
            <div className="space-y-3">
              {deadlinesThisWeek.length > 0 ? (
                deadlinesThisWeek.map((opportunity) => (
                  <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="block rounded-lg border border-white/10 bg-ink-900/70 p-4 transition hover:border-mint-400/30">
                    <p className="font-semibold text-white">{opportunity.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">Termen: {formatDateTimeWithSeconds(opportunity.deadline)}</p>
                  </Link>
                ))
              ) : (
                <EmptyState title="Fara deadline-uri apropiate" description="Oportunitatile cu termen in urmatoarele 7 zile vor aparea aici." />
              )}
            </div>
          </DataCard>

          <DataCard title="Activitate recenta">
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((event) => (
                  <div key={event.id} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{event.label}</p>
                      {isDevelopmentMode ? <span className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-500">{event.type}</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{formatDateTimeWithSeconds(event.date)}</p>
                    {event.description ? <p className="mt-2 text-sm leading-6 text-zinc-300">{event.description}</p> : null}
                  </div>
                ))
              ) : (
                <EmptyState title="Fara activitate recenta" description="Evenimentele apar dupa documente, statusuri si follow-up-uri." />
              )}
            </div>
          </DataCard>
        </div>
      </div>
    </PageShell>
  );
}
