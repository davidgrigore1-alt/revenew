
import Link from "next/link";
import type { ReactNode } from "react";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { RecordSummaryBar } from "@/components/records/RecordSummaryBar";
import { ReportActions } from "@/components/reports/ReportActions";
import { Button } from "@/components/ui/Button";
import { getCommercialInboxSummary } from "@/lib/commercial-inbox";
import { getCommercialIngestionSummary } from "@/lib/commercial-ingestion";
import { weeklyReport } from "@/lib/mock-data";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import { getCurrentBusinessOrDemo, getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTimeWithSeconds } from "@/lib/utils";
import { getFollowUpWorkspaceSummary } from "@/lib/follow-up-summary";
import { getCommercialResponseSummary } from "@/lib/commercial-response-summary";

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
  document_ready_to_send: "Document pregătit de trimis",
  document_marked_sent: "Document marcat ca trimis",
  follow_up_scheduled: "Follow-up programat",
  action_completed: "Acțiune finalizată",
  action_postponed: "Acțiune amânată",
  action_cancelled: "Acțiune anulată",
  marked_contacted: "Oportunitate contactată",
  marked_won: "Oportunitate câștigată",
  marked_lost: "Oportunitate pierdută",
  ignored: "Oportunitate ignorată",
  ai_analysis_saved: "Analiză salvată",
  local_analysis_saved: "Analiză salvată"
};

const priorityLabels: Record<string, string> = {
  low: "Scăzută",
  medium: "Medie",
  high: "Ridicată"
};

const actionStatusLabels: Record<string, string> = {
  pending: "În așteptare",
  done: "Finalizată",
  cancelled: "Anulată"
};

const signalStatusLabels: Record<string, string> = {
  new: "Nou",
  analyzed: "Analizat",
  ready_for_review: "Pregătit pentru revizuire",
  postponed: "Amânat",
  converted: "Convertit",
  dismissed: "Respins",
  duplicate: "Duplicat",
  ignored: "Ignorat",
  archived: "Arhivat"
};

const signalPriorityLabels: Record<string, string> = {
  low: "Prioritate redusă",
  medium: "Prioritate normală",
  high: "Prioritate ridicată",
  urgent: "Urgent",
  critical: "Critic"
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
  const supabase = await createSupabaseServerClient();
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
      className="focus-ring group grid gap-3 border-b border-[rgb(var(--border))] py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(8rem,0.55fr)_minmax(8rem,0.55fr)] sm:items-center"
    >
      <div className="min-w-0">
        <h3 className="font-semibold text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))]">{opportunity.title}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-2"><StatusBadge status={opportunity.status} /><ScoreBadge label="Fit" score={opportunity.fitScore} /></div>
      </div>
      <p className="text-sm"><span className="text-label block text-[rgb(var(--text-faint))]">Valoare estimată</span><span className="font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(opportunity.estimatedValueLow, opportunity.currency ?? "RON")} – {formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</span></p>
      <p className="text-sm"><span className="text-label block text-[rgb(var(--text-faint))]">Termen · următorul pas</span><span className="font-semibold text-[rgb(var(--foreground))]">{formatDate(opportunity.deadline)} · {opportunity.recommendedAction}</span></p>
    </Link>
  );
}

type ReportMetric = { label: string; value: string; detail: string };

function MetricRows({ items }: { items: ReportMetric[] }) {
  return (
    <dl className="divide-y divide-[rgb(var(--border))]">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5">
          <dt className="text-sm font-medium text-[rgb(var(--foreground))]">{item.label}<span className="mt-0.5 block text-xs font-normal leading-5 text-[rgb(var(--text-muted))]">{item.detail}</span></dt>
          <dd className="text-sm font-semibold tabular-nums text-[rgb(var(--foreground))] sm:text-right">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportBlock({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-y border-[rgb(var(--border-strong)/0.72)] bg-[rgb(var(--surface))] px-1 py-5 sm:px-2 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p> : null}</div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type ReportsTab = "overview" | "operations" | "export";

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const requestedTab = (await searchParams)?.tab;
  const activeTab: ReportsTab = requestedTab === "operations" || requestedTab === "export" ? requestedTab : "overview";
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunities = isSupabaseConfigured ? await getOpportunitiesForCurrentBusiness() : weeklyReport.topOpportunities;
  const [workflow, inboxSummary, ingestionSummary, followUpSummary, responseLoop] = await Promise.all([
    loadWorkflowData(opportunities), getCommercialInboxSummary(), getCommercialIngestionSummary(), getFollowUpWorkspaceSummary(), getCommercialResponseSummary()
  ]);
  const reportGeneratedAt = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = addDays(7).slice(0, 10);
  const opportunityById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));

  const ronOpportunities = opportunities.filter((item) => (item.currency ?? "RON") === "RON");
  const activeOpportunities = opportunities.filter(isOpenOpportunity);
  const pipelineValue = activeOpportunities.filter((item) => (item.currency ?? "RON") === "RON").reduce((sum, item) => sum + item.estimatedValueHigh, 0);
  const lostValue = ronOpportunities.filter((item) => item.status === "lost").reduce((sum, item) => sum + item.estimatedValueHigh, 0);
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
    highValueWithoutAction.length > 0 ? `Oportunități valoroase fără acțiune recentă: ${highValueWithoutAction.length}.` : "",
    overdueActions.length > 0 ? `Follow-up-uri sau acțiuni întârziate: ${overdueActions.length}.` : "",
    closeDeadlines.length > 0 ? `Termene apropiate care necesită atenție: ${closeDeadlines.length}.` : ""
  ].filter(Boolean);

  const executiveSummary = opportunities.length
    ? `Prioritatea săptămânii este revizuirea oportunităților active cu potrivire ridicată și finalizarea follow-up-urilor scadente. Există ${activeOpportunities.length} oportunități active în pipeline, cu o valoare estimată în RON de ${formatCurrency(pipelineValue, "RON")}, și ${urgentActions.length} acțiuni urgente de verificat.${inboxSummary.tableReady ? ` Inbox-ul comercial are ${inboxSummary.newCount} semnale noi și ${inboxSummary.urgentCount} urgente.` : ""}`
    : "Nu există încă suficiente date pentru un raport comercial relevant.";

  const recentActivity = workflow.events.slice(0, 8);
  const reportDistribution = [
    { label: "Lead", statuses: ["new", "reviewed", "action_generated"] },
    { label: "Calificat", statuses: ["contacted"] },
    { label: "Propunere", statuses: ["follow_up_needed"] },
    { label: "Câștigat", statuses: ["won"] },
    { label: "Pierdut", statuses: ["lost", "ignored"] }
  ].map((stage) => {
    const stageOpportunities = opportunities.filter((opportunity) => stage.statuses.includes(opportunity.status));
    const ronValue = stageOpportunities
      .filter((opportunity) => (opportunity.currency ?? "RON") === "RON")
      .reduce((sum, opportunity) => sum + opportunity.estimatedValueHigh, 0);
    return { label: stage.label, count: stageOpportunities.length, value: formatCurrency(ronValue, "RON") };
  });
  const managementAgenda = [
    { label: "Acțiuni restante", value: overdueActions.length, href: "/today", tone: overdueActions.length ? "danger" as const : "neutral" as const },
    { label: "Valoare mare fără acțiune", value: highValueWithoutAction.length, href: "/opportunities", tone: highValueWithoutAction.length ? "warning" as const : "neutral" as const },
    { label: "Deadline-uri apropiate", value: closeDeadlines.length, href: "/opportunities", tone: closeDeadlines.length ? "warning" as const : "neutral" as const },
    { label: "Documente de revizuit", value: followUpSummary.awaitingReview, href: "/outreach", tone: followUpSummary.awaitingReview ? "warning" as const : "neutral" as const }
  ];
  const reportText = [
    "ReveNew - Raport comercial",
    `Spațiu de lucru: ${business?.name ?? "Nedenumit"}`,
    `Raport generat la: ${formatDateTimeWithSeconds(reportGeneratedAt)}`,
    "",
    "Rezumat executiv",
    executiveSummary,
    "",
    "Indicatori cheie",
    `Valoare estimată în pipeline (RON): ${formatCurrency(pipelineValue, "RON")}`,
    `Oportunități active: ${activeOpportunities.length}`,
    `Acțiuni urgente: ${urgentActions.length}`,
    `Documente pregătite: ${readyDocuments.length}`,
    `Conversie: ${conversionRate}%`,
    ...(inboxSummary.tableReady ? [
      `Semnale comerciale noi: ${inboxSummary.newCount}`,
      `Semnale comerciale urgente: ${inboxSummary.urgentCount}`,
      `Semnale convertite: ${inboxSummary.convertedCount}`,
      `Potențial estimat neconvertit: ${formatCurrency(inboxSummary.estimatedPotential)}`
    ] : []),
    "",
    "Top oportunități",
    ...(topOpportunities.length ? topOpportunities.map((opportunity, index) => `${index + 1}. ${opportunity.title} | ${formatCurrency(opportunity.estimatedValueLow, opportunity.currency ?? "RON")} - ${formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")} | Fit ${opportunity.fitScore} | ${opportunity.recommendedAction}`) : ["Nu există oportunități în raport."]),
    "",
    "Acțiuni urgente",
    ...(urgentActions.length ? urgentActions.slice(0, 8).map((action) => `${action.title} | ${opportunityById.get(action.opportunityId ?? "")?.title ?? "Oportunitate"} | Termen: ${formatDateTimeWithSeconds(action.dueAt)} | Prioritate: ${priorityLabels[action.priority ?? "medium"]}`) : ["Nu există acțiuni urgente."]),
    "",
    "Activitate recentă",
    ...(recentActivity.length ? recentActivity.map((event) => `${event.label} | ${formatDateTimeWithSeconds(event.date)} | ${opportunityById.get(event.opportunityId ?? "")?.title ?? "Oportunitate"}`) : ["Nu există activitate recentă."]),
    "",
    "Avertizări",
    ...(riskWarnings.length ? riskWarnings : ["Nu există avertizări majore în acest moment. Menține follow-up-urile la zi."])
  ].join("\n");

  return (
    <PageShell
      wide
      eyebrow="Rapoarte"
      title="Raport comercial ReveNew"
      description="Imagine executivă asupra potențialului estimat, rezultatelor confirmate și următoarelor decizii comerciale."
      actions={<div className="flex flex-wrap gap-2"><Button href="/reports/revenue-recovery-audit">Deschide auditul de recuperare</Button><Button href="/reports/enterprise-pilot-pack" variant="secondary">Pregătește propunerea pilot</Button></div>}
    >
      <div className="grid gap-5 print:block print:space-y-5">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-[rgb(var(--text-muted))]">
          <p>Raport generat la: {formatDateTimeWithSeconds(reportGeneratedAt)}</p>
          <p>Spațiu de lucru: {business?.name ?? "Nedenumit"}</p>
        </div>
        {isSupabaseConfigured && opportunities.length === 0 ? <EmptyState title="Raportul așteaptă primele date" description="Importă sau adaugă semnale în Inbox Comercial, apoi aprobă oportunitățile relevante. Indicatorii nu sunt estimați fără date reale." /> : null}

        <nav aria-label="Vizualizări raport" className="flex gap-1 overflow-x-auto border-b border-[rgb(var(--border))]">
          {([['overview', 'Rezumat'], ['operations', 'Execuție'], ['export', 'Export']] as const).map(([tab, label]) => (
            <Link key={tab} href={`/reports?tab=${tab}`} aria-current={activeTab === tab ? "page" : undefined} className={`focus-ring min-h-10 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${activeTab === tab ? "border-[rgb(var(--primary))] text-[rgb(var(--foreground))]" : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]"}`}>{label}</Link>
          ))}
        </nav>

        {activeTab === "overview" ? (
          <>
            <section data-guide-anchor="reports-audit-summary" aria-labelledby="executive-summary-title" className="rounded-panel border border-[rgb(var(--border-strong)/0.78)] bg-[rgb(var(--surface-elevated))] p-5 sm:p-6">
              <p className="text-label text-[rgb(var(--primary))]">Rezumat executiv</p>
              <h2 id="executive-summary-title" className="mt-1 text-xl font-semibold tracking-tight text-[rgb(var(--foreground))]">Ce necesită o decizie acum</h2>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-[rgb(var(--text-muted))]">{executiveSummary}</p>
              <div className="mt-5">
                <RecordSummaryBar label="Adevărul executiv al raportului" items={[
                  { label: "Valoare estimată în pipeline · RON", value: formatCurrency(pipelineValue, "RON"), detail: "Nu este venit confirmat." },
                  { label: "Oportunități active", value: String(activeOpportunities.length), detail: "Cazuri deschise." },
                  { label: "Acțiuni urgente", value: String(urgentActions.length), detail: "Scadente sau apropiate.", tone: urgentActions.length ? "attention" : "default" },
                  { label: "Venit recuperat confirmat", value: formatCurrency(responseLoop.confirmedRevenueRon, "RON"), detail: "Confirmat explicit.", tone: responseLoop.confirmedRevenueRon ? "success" : "default" }
                ]} />
              </div>
            </section>

            <div className="grid gap-7 lg:grid-cols-2">
              <section aria-labelledby="distribution-title" className="border-y border-[rgb(var(--border-strong)/0.72)] bg-[rgb(var(--surface))] px-1 py-5 sm:px-2"><h2 id="distribution-title" className="text-base font-semibold">Distribuția pipeline-ului</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Număr și valoare estimată în RON, fără a combina monede.</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[28rem] text-left text-sm"><caption className="sr-only">Distribuția oportunităților și a valorii estimate pe etape</caption><thead className="border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-xs text-[rgb(var(--text-secondary))]"><tr><th scope="col" className="py-2 pr-3 font-medium">Etapă</th><th scope="col" className="px-3 py-2 text-right font-medium">Oportunități</th><th scope="col" className="py-2 pl-3 text-right font-medium">Valoare estimată</th></tr></thead><tbody className="divide-y divide-[rgb(var(--border))]">{reportDistribution.map((stage) => <tr key={stage.label} className="transition-colors hover:bg-[rgb(var(--surface-subtle))]"><th scope="row" className="py-2.5 pr-3 font-medium">{stage.label}</th><td className="px-3 py-2.5 text-right tabular-nums text-[rgb(var(--text-muted))]">{stage.count}</td><td className="py-2.5 pl-3 text-right font-semibold tabular-nums">{stage.value}</td></tr>)}</tbody></table></div></section>
              <section aria-labelledby="agenda-title" className="rounded-panel border border-[rgb(var(--border-strong)/0.72)] bg-[rgb(var(--surface))] p-5"><h2 id="agenda-title" className="text-base font-semibold">Agenda managerială</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Excepții curente derivate din acțiuni și oportunități.</p><div className="mt-3 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">{managementAgenda.map((item) => <Link key={item.label} href={item.href} className="focus-ring -mx-2 flex min-h-11 items-center justify-between gap-4 px-3 py-2.5 text-sm transition-colors hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]"><span className="font-medium">{item.label}</span><span className={`status-pill ${item.tone === "danger" ? "status-pill-danger" : item.tone === "warning" ? "status-pill-warning" : "status-pill-neutral"}`}>{item.value}</span></Link>)}</div></section>
            </div>

            <ReportBlock title="Trei valori, trei decizii diferite" description="Interpretarea rămâne disponibilă după imaginea operațională, fără a amâna datele utile." action={<Link href="/reports/revenue-recovery-audit" className="focus-ring rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Verifică valoarea expusă în audit →</Link>}>
              <dl className="grid gap-4 md:grid-cols-3">
                <div><dt className="text-sm font-semibold">Valoare estimată în pipeline</dt><dd className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Toate oportunitățile active în RON; monedele diferite nu sunt cumulate.</dd></div>
                <div><dt className="text-sm font-semibold">Valoare estimată expusă</dt><dd className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Numai cazurile cu blocaje din audit, fiecare numărat o singură dată.</dd></div>
                <div><dt className="text-sm font-semibold">Venit confirmat</dt><dd className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Numai rezultate câștigate și confirmate explicit de utilizator.</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--border))] pt-4"><p className="text-xs leading-5 text-[rgb(var(--text-muted))]">După pilot, verifică progresul demonstrabil înaintea unei decizii de continuare.</p><Link href="/reports/pilot-proof-of-value" className="focus-ring rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Deschide dovada de valoare pilot →</Link></div>
            </ReportBlock>
          </>
        ) : null}

        {activeTab === "operations" ? (
          <>
            <ReportBlock title="Indicatori de execuție" description="Valori calculate din oportunități, acțiuni, documente și răspunsuri înregistrate.">
              <div className="grid gap-7 lg:grid-cols-2">
                <section aria-labelledby="pipeline-metrics-title"><h3 id="pipeline-metrics-title" className="mb-3 text-sm font-semibold">Pipeline și acțiuni</h3><MetricRows items={[
                  { label: "Valoare estimată în pipeline · RON", value: formatCurrency(pipelineValue, "RON"), detail: "Toate oportunitățile active în RON; nu indică doar cazurile expuse și nu este venit confirmat." },
                  { label: "Oportunități active", value: String(activeOpportunities.length), detail: "Oportunități deschise care nu sunt câștigate, pierdute sau ignorate." },
                  { label: "Acțiuni urgente", value: String(urgentActions.length), detail: "Acțiuni scadente sau apropiate, deduplicate pe oportunitate și termen." },
                  { label: "Acțiuni finalizate", value: String(completedActions.length), detail: "Sarcini comerciale închise în fluxul de lucru." },
                  { label: "Conversie confirmată", value: opportunities.length ? `${conversionRate}%` : "Date insuficiente", detail: "Ponderea oportunităților marcate câștigate din total." },
                  { label: "Pierdut · valoare estimată (RON)", value: formatCurrency(lostValue, "RON"), detail: "Estimare din oportunități marcate pierdute." }
                ]} /></section>
                <section aria-labelledby="followup-metrics-title"><h3 id="followup-metrics-title" className="mb-3 text-sm font-semibold">Follow-up și rezultate</h3><MetricRows items={[
                  { label: "Documente generate", value: String(generatedDocuments), detail: "Documente comerciale pregătite în fluxul de lucru." },
                  { label: "Drafturi de revizuit", value: String(followUpSummary.awaitingReview), detail: "Necesită revizuire și decizie umană." },
                  { label: "Aprobate · Netrimise", value: String(followUpSummary.approvedNotSent), detail: "Fără confirmare de trimitere externă." },
                  { label: "Încercări în mod test", value: String(followUpSummary.testModeAttempts), detail: "Fluxuri interne fără livrare externă." },
                  { label: "Livrări reale confirmate", value: String(followUpSummary.realDeliveries), detail: "Confirmate de furnizorul live; nu reprezintă venit câștigat." },
                  { label: "Încercări eșuate", value: String(followUpSummary.failedAttempts), detail: "Încercări fără confirmare de livrare." },
                  { label: "Follow-up-uri scadente", value: String(followUpSummary.dueFollowUps), detail: "Acțiuni deschise ajunse la termen." },
                  { label: "Răspunsuri primite / pozitive", value: `${responseLoop.responsesReceived} / ${responseLoop.positiveResponses}`, detail: "Răspunsuri înregistrate manual și clasificări pozitive." },
                  { label: "Întâlniri / propuneri", value: `${responseLoop.meetings} / ${responseLoop.proposals}`, detail: "Solicitate sau programate explicit." },
                  { label: "În așteptare / fără răspuns", value: `${responseLoop.awaitingResponse} / ${responseLoop.noResponse}`, detail: "Livrări live fără răspuns și clasificări explicite." },
                  { label: "Câștigate / Pierdute", value: `${responseLoop.won} / ${responseLoop.lost}`, detail: "Rezultate confirmate explicit." },
                  { label: "Venit recuperat confirmat", value: formatCurrency(responseLoop.confirmedRevenueRon, "RON"), detail: "Valoare efectivă separată de estimări." },
                  { label: "Rată de răspuns", value: responseLoop.responseRate === null ? "Date insuficiente" : `${responseLoop.responseRate}%`, detail: "Oportunități cu răspuns din cele clasificate." }
                ]} /></section>
              </div>
            </ReportBlock>

            {inboxSummary.tableReady ? (
              <ReportBlock title="Inbox și importuri" description="Semnale și loturi procesate, fără a transforma estimările în venit confirmat.">
                <div className="grid gap-7 lg:grid-cols-2">
                  <MetricRows items={[
                    { label: "Semnale de revizuit", value: String(inboxSummary.awaitingReviewCount), detail: "Analizate și pregătite pentru decizia echipei." },
                    { label: "Potențial estimat în revizuire", value: formatCurrency(inboxSummary.estimatedValueUnderReview, "RON"), detail: "Estimare activă, separată de venitul confirmat." },
                    { label: "Convertite", value: String(inboxSummary.convertedCount), detail: "Semnale aprobate și transformate în oportunități." },
                    { label: "Respinse", value: String(inboxSummary.dismissedCount), detail: "Nu sunt incluse în valoarea recuperabilă activă." },
                    { label: "Duplicate", value: String(inboxSummary.duplicateCount), detail: "Eliminate din coada și valoarea activă." },
                    { label: "Fără responsabil", value: String(inboxSummary.signalsWithoutOwner), detail: "Semnale pregătite pentru revizuire fără responsabil atribuit." },
                    { label: "Valoare mare în atenție", value: String(inboxSummary.highValueAttentionCount), detail: "Urgență ridicată sau critică și valoare cunoscută." }
                  ]} />
                  <MetricRows items={[
                    { label: "Timp mediu de revizuire", value: inboxSummary.averageReviewHours === null ? "Insuficient" : `${inboxSummary.averageReviewHours} h`, detail: "De la creare până la decizia umană." },
                    { label: "Loturi luna aceasta", value: String(ingestionSummary.batchesThisMonth), detail: "Importuri CSV și detectări explicite procesate." },
                    { label: "Rânduri acceptate", value: String(ingestionSummary.acceptedRows), detail: "Semnale create din date validate." },
                    { label: "Rânduri respinse", value: String(ingestionSummary.rejectedRows), detail: "Date invalide care nu au creat semnale." },
                    { label: "Rată duplicate", value: `${ingestionSummary.duplicateRate}%`, detail: "Rânduri omise prin protecția de idempotency." },
                    { label: "Conversii din import", value: String(ingestionSummary.convertedImportedSignals), detail: "Semnale CSV aprobate și transformate prin fluxul comercial existent." },
                    { label: "Import · Potențial estimat", value: formatCurrency(ingestionSummary.estimatedImportedRecoverableValue, "RON"), detail: "Potențial estimat; venitul câștigat rămâne separat." }
                  ]} />
                </div>
                <section aria-labelledby="new-signals-title" className="mt-6 border-t border-[rgb(var(--border))] pt-4"><h3 id="new-signals-title" className="text-sm font-semibold">Semnale comerciale noi</h3><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Top semnale urgente sau noi din Inbox Comercial.</p><div className="mt-3 divide-y divide-[rgb(var(--border))]">{inboxSummary.topSignals.length > 0 ? inboxSummary.topSignals.map((signal) => <Link key={signal.id} href={signal.convertedOpportunityId ? `/opportunities/${signal.convertedOpportunityId}` : "/inbox"} className="focus-ring group block py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold group-hover:text-[rgb(var(--primary))]">{signal.contactCompany || signal.contactName || "Semnal comercial"}</h4><span className="status-pill status-pill-neutral">{signalStatusLabels[signal.status] ?? "În revizuire"}</span><span className="status-pill status-pill-warning">{signalPriorityLabels[signal.priority] ?? "Prioritate normală"}</span></div><p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{signal.extractedSummary || signal.detectedNeed || signal.rawMessage || "Fără sumar."}</p></Link>) : <EmptyState title="Nu există semnale noi" description="Semnalele comerciale urgente vor apărea aici după adăugare." />}</div></section>
              </ReportBlock>
            ) : null}

            <ReportBlock title="Priorități operaționale" description="Oportunități și acțiuni ordonate pentru revizuire.">
              <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
                <section aria-labelledby="top-opportunities-title"><h3 id="top-opportunities-title" className="mb-3 text-sm font-semibold">Top oportunități</h3>{topOpportunities.length > 0 ? topOpportunities.map((opportunity) => <CompactOpportunity key={opportunity.id} opportunity={opportunity} />) : <EmptyState title="Nu există oportunități" description="Transformă semnalele comerciale importante în oportunități pentru a construi raportul de Revenue Recovery." />}</section>
                <div className="grid content-start gap-6"><section aria-labelledby="urgent-actions-title"><h3 id="urgent-actions-title" className="mb-3 text-sm font-semibold">Acțiuni urgente</h3><div className="divide-y divide-[rgb(var(--border))]">{urgentActions.length > 0 ? urgentActions.slice(0, 8).map((action) => <Link key={action.id} href={`/opportunities/${action.opportunityId ?? ""}`} className="focus-ring group block py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold group-hover:text-[rgb(var(--primary))]">{action.title}</p><span className="status-pill status-pill-warning">{priorityLabels[action.priority ?? "medium"]}</span><span className="status-pill status-pill-neutral">{actionStatusLabels[action.status] ?? "În revizuire"}</span></div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{opportunityById.get(action.opportunityId ?? "")?.title ?? "Oportunitate"} · {formatDateTimeWithSeconds(action.dueAt)}</p></Link>) : <EmptyState title="Nicio acțiune urgentă" description="Follow-up-urile și sarcinile scadente vor apărea aici." />}</div></section><section aria-labelledby="risk-warnings-title"><h3 id="risk-warnings-title" className="text-sm font-semibold">Avertizare pierderi</h3>{riskWarnings.length > 0 ? <ul className="mt-2 grid gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{riskWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există avertizări majore în acest moment. Menține follow-up-urile la zi.</p>}</section></div>
              </div>
            </ReportBlock>

            <ReportBlock title="Termene și activitate" description="Evenimente recente și oportunități cu termen în următoarele șapte zile.">
              <div className="grid gap-7 xl:grid-cols-2">
                <section aria-labelledby="deadlines-title"><h3 id="deadlines-title" className="mb-3 text-sm font-semibold">Termene în următoarele 7 zile</h3><div className="divide-y divide-[rgb(var(--border))]">{deadlinesThisWeek.length > 0 ? deadlinesThisWeek.map((opportunity) => <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="focus-ring group flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><p className="font-semibold group-hover:text-[rgb(var(--primary))]">{opportunity.title}</p><p className="text-sm text-[rgb(var(--text-muted))]">{formatDateTimeWithSeconds(opportunity.deadline)}</p></Link>) : <EmptyState title="Fără termene apropiate" description="Oportunitățile cu termen în următoarele 7 zile vor apărea aici." />}</div></section>
                <section aria-labelledby="activity-title"><h3 id="activity-title" className="mb-3 text-sm font-semibold">Activitate recentă</h3><div className="divide-y divide-[rgb(var(--border))]">{recentActivity.length > 0 ? recentActivity.map((event) => <article key={event.id} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{event.label}</h4>{isDevelopmentMode ? <span className="status-pill status-pill-neutral">{event.type}</span> : null}</div><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{formatDateTimeWithSeconds(event.date)}</p>{event.description ? <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{event.description}</p> : null}</article>) : <EmptyState title="Fără activitate recentă" description="Evenimentele apar după documente, stări și follow-up-uri." />}</div></section>
              </div>
            </ReportBlock>
          </>
        ) : null}

        {activeTab === "export" ? <ReportBlock title="Export și distribuire" description="Copiază, descarcă sau printează raportul după revizuirea indicatorilor și a agendei manageriale."><ReportActions reportText={reportText} fileName="revenew-raport-comercial.txt" /></ReportBlock> : null}
      </div>
    </PageShell>
  );
}
