
import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ReportActions } from "@/components/reports/ReportActions";
import { ExecutiveSummaryVisual } from "@/components/reports/ExecutiveSummaryVisual";
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
      className="focus-ring block rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-muted))]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={opportunity.status} />
        <ScoreBadge label="Fit" score={opportunity.fitScore} />
      </div>
      <h3 className="mt-3 font-semibold text-[rgb(var(--foreground))]">{opportunity.title}</h3>
      <div className="mt-3 grid gap-3 text-sm text-[rgb(var(--text-muted))] sm:grid-cols-3">
        <p>
          <span className="text-label block text-[rgb(var(--text-faint))]">Valoare estimată</span>
          <span className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(opportunity.estimatedValueLow, opportunity.currency ?? "RON")} – {formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</span>
        </p>
        <p>
          <span className="text-label block text-[rgb(var(--text-faint))]">Termen</span>
          <span className="font-semibold text-[rgb(var(--foreground))]">{formatDate(opportunity.deadline)}</span>
        </p>
        <p>
          <span className="text-label block text-[rgb(var(--text-faint))]">Următorul pas</span>
          <span className="font-semibold text-[rgb(var(--foreground))]">{opportunity.recommendedAction}</span>
        </p>
      </div>
      <p className="mt-3 text-sm font-semibold text-[rgb(var(--primary))]">Deschide oportunitatea →</p>
    </Link>
  );
}

export default async function ReportsPage() {
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
  const wonValue = ronOpportunities.filter((item) => item.status === "won").reduce((sum, item) => sum + item.estimatedValueHigh, 0);
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
      eyebrow="Rapoarte"
      title="Raport comercial ReveNew"
      description="Imagine executivă asupra potențialului estimat, rezultatelor confirmate și următoarelor decizii comerciale."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="/reports/revenue-recovery-audit">Deschide auditul de recuperare</Button>
          <Button href="/reports/enterprise-pilot-pack" variant="secondary">Pregătește propunerea pilot</Button>
        </div>
      }
    >
      <div className="grid gap-6 print:block print:space-y-5">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <p className="text-sm font-semibold text-[rgb(var(--text-muted))]">Raport generat la: {formatDateTimeWithSeconds(reportGeneratedAt)}</p>
        {isSupabaseConfigured && opportunities.length === 0 ? (
          <EmptyState title="Raportul așteaptă primele date" description="Importă sau adaugă semnale în Inbox Comercial, apoi aprobă oportunitățile relevante. Indicatorii nu sunt estimați fără date reale." />
        ) : null}

        <section aria-labelledby="metric-meaning-title" className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-label text-[rgb(var(--primary))]">Interpretarea valorilor</p>
              <h2 id="metric-meaning-title" className="mt-1 text-lg font-semibold tracking-tight text-[rgb(var(--foreground))]">Trei valori, trei decizii diferite</h2>
            </div>
            <Link href="/reports/revenue-recovery-audit" className="focus-ring rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Verifică valoarea expusă în audit →</Link>
          </div>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] md:grid-cols-3">
            <div className="bg-[rgb(var(--surface-subtle))] p-4">
              <dt className="text-sm font-semibold text-[rgb(var(--foreground))]">Valoare estimată în pipeline</dt>
              <dd className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Toate oportunitățile active. Raportul principal afișează RON și nu cumulează monede diferite.</dd>
            </div>
            <div className="bg-[rgb(var(--surface-subtle))] p-4">
              <dt className="text-sm font-semibold text-[rgb(var(--foreground))]">Valoare estimată expusă</dt>
              <dd className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Numai cazurile cu blocaje din audit; fiecare oportunitate este numărată o singură dată în total.</dd>
            </div>
            <div className="bg-[rgb(var(--surface-subtle))] p-4">
              <dt className="text-sm font-semibold text-[rgb(var(--foreground))]">Venit confirmat</dt>
              <dd className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Numai rezultate câștigate și confirmate explicit de utilizator; rămâne separat de estimări.</dd>
            </div>
          </dl>
        </section>

        <ExecutiveSummaryVisual
          pipelineValue={formatCurrency(pipelineValue, "RON")}
          activeCount={activeOpportunities.length}
          urgentCount={urgentActions.length}
          wonCount={responseLoop.won}
          lostCount={responseLoop.lost}
          documentsGenerated={generatedDocuments}
          documentsAwaitingReview={followUpSummary.awaitingReview}
          documentsApprovedNotSent={followUpSummary.approvedNotSent}
          distribution={reportDistribution}
          agenda={managementAgenda}
          summary={executiveSummary}
        />

        <details className="group rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 print:block">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-button px-2 font-semibold marker:hidden"><span>Indicatori detaliați de execuție</span><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-xs text-[rgb(var(--text-muted))]">22 indicatori</span></summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Valoare estimată în pipeline · RON" value={formatCurrency(pipelineValue, "RON")} detail="Toate oportunitățile active în RON; nu indică doar cazurile expuse și nu este venit confirmat." tone="mint" />
          <MetricCard label="Oportunități active" value={`${activeOpportunities.length}`} detail="Oportunități deschise care nu sunt marcate câștigate, pierdute sau ignorate." />
          <MetricCard label="Acțiuni urgente" value={`${urgentActions.length}`} detail="Acțiuni scadente sau apropiate, deduplicate pe oportunitate și termen." tone="gold" />
          <MetricCard label="Conversie confirmată" value={opportunities.length ? `${conversionRate}%` : "Date insuficiente"} detail="Ponderea oportunităților marcate câștigate din total." />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Documente generate" value={`${generatedDocuments}`} detail="Documente comerciale pregătite în fluxul de lucru." />
          <MetricCard label="Drafturi de revizuit" value={String(followUpSummary.awaitingReview)} detail="Drafturi care necesită revizuire și decizie umană." tone="gold" />
          <MetricCard label="Aprobate · Netrimise" value={String(followUpSummary.approvedNotSent)} detail="Aprobate sau pregătite, fără confirmare de trimitere externă." tone="mint" />
          <MetricCard label="Încercări în mod test" value={String(followUpSummary.testModeAttempts)} detail="Fluxuri interne fără livrare externă." />
          <MetricCard label="Livrări reale confirmate" value={String(followUpSummary.realDeliveries)} detail="Confirmate de furnizorul live; nu reprezintă venit câștigat." tone="mint" />
          <MetricCard label="Încercări eșuate" value={String(followUpSummary.failedAttempts)} detail="Încercări fără confirmare de livrare." tone="gold" />
          <MetricCard label="Follow-up-uri scadente" value={String(followUpSummary.dueFollowUps)} detail="Acțiuni de follow-up deschise și ajunse la termen." />
          <MetricCard label="Răspunsuri primite" value={String(responseLoop.responsesReceived)} detail="Răspunsuri comerciale înregistrate manual." tone="mint" />
          <MetricCard label="Răspunsuri pozitive" value={String(responseLoop.positiveResponses)} detail="Interes pozitiv, întâlnire sau informații solicitate." tone="mint" />
          <MetricCard label="Întâlniri" value={String(responseLoop.meetings)} detail="Solicitate sau programate explicit." />
          <MetricCard label="Propuneri" value={String(responseLoop.proposals)} detail="Solicitate sau trimise explicit." />
          <MetricCard label="În așteptarea răspunsului" value={String(responseLoop.awaitingResponse)} detail="Livrări live fără răspuns înregistrat." tone="gold" />
          <MetricCard label="Fără răspuns" value={String(responseLoop.noResponse)} detail="Clasificări explicite fără răspuns." tone="gold" />
          <MetricCard label="Câștigate / Pierdute" value={`${responseLoop.won} / ${responseLoop.lost}`} detail="Rezultate confirmate explicit." />
          <MetricCard label="Venit recuperat confirmat" value={formatCurrency(responseLoop.confirmedRevenueRon, "RON")} detail="Valoare efectivă separată de estimări." tone="mint" />
          <MetricCard label="Rată de răspuns" value={responseLoop.responseRate === null ? "Date insuficiente" : `${responseLoop.responseRate}%`} detail="Oportunități cu răspuns din cele clasificate." />
          <MetricCard label="Acțiuni finalizate" value={`${completedActions.length}`} detail="Sarcini comerciale închise în fluxul de lucru." />
          <MetricCard label="Pierdut · Valoare estimată (RON)" value={formatCurrency(lostValue, "RON")} detail="Estimare în RON din oportunități marcate pierdute." tone="gold" />
          </div>
        </details>

        {inboxSummary.tableReady ? (
          <>
            <details className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 print:block">
              <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-button px-2 font-semibold marker:hidden"><span>Inbox și importuri</span><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-xs text-[rgb(var(--text-muted))]">14 indicatori</span></summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Semnale de revizuit" value={`${inboxSummary.awaitingReviewCount}`} detail="Analizate și pregătite pentru decizia echipei." tone="gold" />
              <MetricCard label="Potențial estimat în revizuire" value={formatCurrency(inboxSummary.estimatedValueUnderReview, "RON")} detail="Estimare activă, separată de venitul confirmat." />
              <MetricCard label="Convertite" value={`${inboxSummary.convertedCount}`} detail="Semnale aprobate și transformate în oportunități." tone="mint" />
              <MetricCard label="Respinse" value={`${inboxSummary.dismissedCount}`} detail="Nu sunt incluse în valoarea recuperabilă activă." />
              <MetricCard label="Duplicate" value={`${inboxSummary.duplicateCount}`} detail="Eliminate din coada și valoarea activă." />
              <MetricCard label="Fără responsabil" value={`${inboxSummary.signalsWithoutOwner}`} detail="Semnale pregătite pentru revizuire fără proprietar." />
              <MetricCard label="Valoare mare în atenție" value={`${inboxSummary.highValueAttentionCount}`} detail="Urgență ridicată sau critică și valoare cunoscută." tone="gold" />
              <MetricCard label="Timp mediu de revizuire" value={inboxSummary.averageReviewHours === null ? "Insuficient" : `${inboxSummary.averageReviewHours} h`} detail="De la creare până la decizia umană." />
              <MetricCard label="Loturi luna aceasta" value={`${ingestionSummary.batchesThisMonth}`} detail="Importuri CSV și detectări explicite procesate." />
              <MetricCard label="Rânduri acceptate" value={`${ingestionSummary.acceptedRows}`} detail="Semnale create din date validate." tone="mint" />
              <MetricCard label="Rânduri respinse" value={`${ingestionSummary.rejectedRows}`} detail="Date invalide care nu au creat semnale." />
              <MetricCard label="Rată duplicate" value={`${ingestionSummary.duplicateRate}%`} detail="Rânduri omise prin protecția de idempotency." />
              <MetricCard label="Conversii din import" value={`${ingestionSummary.convertedImportedSignals}`} detail="Semnale CSV aprobate și transformate prin workflow-ul existent." />
              <MetricCard label="Import · Potențial estimat" value={formatCurrency(ingestionSummary.estimatedImportedRecoverableValue, "RON")} detail="Potențial estimat; venitul câștigat rămâne separat." />
              </div>
            </details>

            <DataCard title="Semnale comerciale noi" description="Top semnale urgente sau noi din Inbox Comercial.">
              <div className="grid gap-3">
                {inboxSummary.topSignals.length > 0 ? (
                  inboxSummary.topSignals.map((signal) => (
                    <Link key={signal.id} href={signal.convertedOpportunityId ? `/opportunities/${signal.convertedOpportunityId}` : "/inbox"} className="focus-ring block rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 transition-colors hover:border-[rgb(var(--border-strong))]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="status-pill status-pill-neutral">{signalStatusLabels[signal.status] ?? "În revizuire"}</span>
                        <span className="status-pill status-pill-warning">{signalPriorityLabels[signal.priority] ?? "Prioritate normală"}</span>
                      </div>
                      <h3 className="mt-3 font-semibold text-[rgb(var(--foreground))]">{signal.contactCompany || signal.contactName || "Semnal comercial"}</h3>
                      <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{signal.extractedSummary || signal.detectedNeed || signal.rawMessage || "Fără sumar."}</p>
                      <p className="mt-3 text-sm font-semibold text-[rgb(var(--primary))]">{signal.convertedOpportunityId ? "Deschide oportunitatea →" : "Deschide Inbox Comercial →"}</p>
                    </Link>
                  ))
                ) : (
                  <EmptyState title="Nu există semnale noi" description="Semnalele comerciale urgente vor apărea aici după adăugare." />
                )}
              </div>
            </DataCard>
          </>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <DataCard title="Top oportunități" description="Prioritate calculată din fit, valoare și urgență.">
            <div className="grid gap-3">
              {topOpportunities.length > 0 ? topOpportunities.map((opportunity) => <CompactOpportunity key={opportunity.id} opportunity={opportunity} />) : <EmptyState title="Nu există oportunități" description="Transformă semnalele comerciale importante în oportunități pentru a construi raportul de Revenue Recovery." />}
            </div>
          </DataCard>

          <div className="grid gap-6">
            <DataCard title="Acțiuni urgente">
              <div className="space-y-3">
                {urgentActions.length > 0 ? (
                  urgentActions.slice(0, 8).map((action) => (
                    <Link key={action.id} href={`/opportunities/${action.opportunityId ?? ""}`} className="focus-ring block rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 transition-colors hover:border-[rgb(var(--border-strong))]">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[rgb(var(--foreground))]">{action.title}</p>
                        <span className="status-pill status-pill-warning">{priorityLabels[action.priority ?? "medium"]}</span>
                        <span className="status-pill status-pill-neutral">{actionStatusLabels[action.status] ?? "În revizuire"}</span>
                      </div>
                      <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{opportunityById.get(action.opportunityId ?? "")?.title ?? "Oportunitate"}</p>
                      <p className="text-label mt-2 text-[rgb(var(--warning-text))]">Termen: {formatDateTimeWithSeconds(action.dueAt)}</p>
                      <p className="mt-3 text-sm font-semibold text-[rgb(var(--primary))]">Deschide oportunitatea →</p>
                    </Link>
                  ))
                ) : (
                  <EmptyState title="Nicio acțiune urgentă" description="Follow-up-urile și sarcinile scadente vor apărea aici." />
                )}
              </div>
            </DataCard>

            <DataCard title="Avertizare pierderi">
              {riskWarnings.length > 0 ? (
                <ul className="space-y-3 text-sm leading-6 text-[rgb(var(--text-muted))]">
                  {riskWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există avertizări majore în acest moment. Menține follow-up-urile la zi.</p>
              )}
            </DataCard>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Termene în următoarele 7 zile">
            <div className="space-y-3">
              {deadlinesThisWeek.length > 0 ? (
                deadlinesThisWeek.map((opportunity) => (
                  <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="focus-ring block rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 transition-colors hover:border-[rgb(var(--border-strong))]">
                    <p className="font-semibold text-[rgb(var(--foreground))]">{opportunity.title}</p>
                    <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Termen: {formatDateTimeWithSeconds(opportunity.deadline)}</p>
                  </Link>
                ))
              ) : (
                <EmptyState title="Fără termene apropiate" description="Oportunitățile cu termen în următoarele 7 zile vor apărea aici." />
              )}
            </div>
          </DataCard>

          <DataCard title="Activitate recentă">
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((event) => (
                  <div key={event.id} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[rgb(var(--foreground))]">{event.label}</p>
                      {isDevelopmentMode ? <span className="status-pill status-pill-neutral">{event.type}</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{formatDateTimeWithSeconds(event.date)}</p>
                    {event.description ? <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{event.description}</p> : null}
                  </div>
                ))
              ) : (
                <EmptyState title="Fără activitate recentă" description="Evenimentele apar după documente, stări și follow-up-uri." />
              )}
            </div>
          </DataCard>
        </div>

        <DataCard title="Export și distribuire" description="Copiază, descarcă sau printează raportul după revizuirea indicatorilor și a agendei manageriale.">
          <ReportActions reportText={reportText} fileName="revenew-raport-comercial.txt" />
        </DataCard>
      </div>
    </PageShell>
  );
}
