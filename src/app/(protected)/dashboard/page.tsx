import Link from "next/link";
import {
  ArrowRightIcon,
  BanknotesIcon,
  BoltIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";
import { ActivityFeed, type ActivityFeedItem } from "@/components/dashboard/ActivityFeed";
import { AttentionSummary } from "@/components/dashboard/AttentionSummary";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardTable, type DashboardTableColumn } from "@/components/dashboard/DashboardTable";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { FirstTimeGuide } from "@/components/dashboard/FirstTimeGuide";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PremiumPanel } from "@/components/dashboard/PremiumPanel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCommercialIngestionSummary } from "@/lib/commercial-ingestion";
import { getCommercialResponseSummary } from "@/lib/commercial-response-summary";
import { getFollowUpWorkspaceSummary } from "@/lib/follow-up-summary";
import { deriveFirstValueJourney } from "@/lib/first-value-journey";
import type { OpportunityAttentionAssessment } from "@/lib/opportunity-attention";
import type { RecoveryAction } from "@/lib/recovery";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AttentionRow = {
  id: string;
  opportunity: Opportunity;
  reason: string;
  reasonTone: "warning" | "danger";
  nextAction: string;
  dueLabel: string;
};

function operatingDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function activityDate(value?: string) {
  if (!value) return "Dată indisponibilă";
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function companyForOpportunity(opportunity: Opportunity) {
  return opportunity.contact?.company ?? opportunity.contacts?.[0]?.contact.organization?.name ?? "Companie neconfirmată";
}

function rowFromAction(action: RecoveryAction, opportunity: Opportunity | undefined, overdue: boolean): AttentionRow | null {
  if (!opportunity) return null;
  return {
    id: `action-${action.id}`,
    opportunity,
    reason: overdue ? "Acțiune restantă" : "Scadentă astăzi",
    reasonTone: overdue ? "danger" : "warning",
    nextAction: action.title,
    dueLabel: formatDate(action.dueAt)
  };
}

function rowFromAssessment(opportunity: Opportunity, assessment: OpportunityAttentionAssessment): AttentionRow {
  const primaryReason = assessment.reasons[0];
  return {
    id: `attention-${opportunity.id}`,
    opportunity,
    reason: primaryReason?.label ?? "Necesită verificare",
    reasonTone: assessment.state === "at_risk" || assessment.state === "blocked" || primaryReason?.severity === "high" ? "danger" : "warning",
    nextAction: assessment.primaryNextAction?.title ?? "Setează următoarea acțiune",
    dueLabel: assessment.primaryNextAction?.dueDate ? formatDate(assessment.primaryNextAction.dueDate) : primaryReason?.label ?? "Fără termen"
  };
}

function compactEmpty(title: string, description: string, href?: string, actionLabel?: string) {
  return (
    <div className="rounded-card border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-6 text-center">
      <h3 className="font-semibold text-[rgb(var(--foreground))]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p>
      {href && actionLabel ? <Button href={href} variant="secondary" size="small" className="mt-4">{actionLabel}</Button> : null}
    </div>
  );
}

export default async function DashboardPage() {
  try {
    const [summary, ingestion, followUp, responseLoop] = await Promise.all([
      getRevenueWorkspaceSummary(),
      getCommercialIngestionSummary(),
      getFollowUpWorkspaceSummary(),
      getCommercialResponseSummary()
    ]);

    const activeSignals = summary.signals.filter((signal) => !signal.convertedOpportunityId && !["converted", "dismissed", "duplicate", "ignored", "archived"].includes(signal.status));
    const reviewSignals = summary.signals.filter((signal) => ["ready_for_review", "postponed"].includes(signal.reviewStatus));
    const signalValueRon = activeSignals.filter((signal) => signal.currency === "RON").reduce((sum, signal) => sum + Number(signal.estimatedRecoverableValue ?? 0), 0);
    const totalEstimatedValueRon = summary.metrics.activePipelineValue + signalValueRon;
    const firstValueJourney = deriveFirstValueJourney(summary.signals);
    const urgentActionCount = summary.workQueue.overdue.length + summary.workQueue.dueToday.length;
    const attentionCount = summary.warnings.attention.length;
    const highRiskCount = summary.warnings.highValueAtRisk.length;
    const opportunityById = new Map(summary.opportunities.map((opportunity) => [opportunity.id, opportunity]));

    const actionRows = [
      ...summary.workQueue.overdue.map((action) => rowFromAction(action, action.opportunityId ? opportunityById.get(action.opportunityId) : undefined, true)),
      ...summary.workQueue.dueToday.map((action) => rowFromAction(action, action.opportunityId ? opportunityById.get(action.opportunityId) : undefined, false))
    ].filter((row): row is AttentionRow => Boolean(row));
    const actionOpportunityIds = new Set(actionRows.map((row) => row.opportunity.id));
    const attentionRows = [
      ...actionRows,
      ...summary.warnings.attention
        .filter(({ opportunity }) => !actionOpportunityIds.has(opportunity.id))
        .map(({ opportunity, assessment }) => rowFromAssessment(opportunity, assessment))
    ].slice(0, 8);

    const brief = urgentActionCount > 0 || attentionCount > 0
      ? `Ai ${urgentActionCount} ${urgentActionCount === 1 ? "acțiune scadentă" : "acțiuni scadente"} și ${attentionCount} ${attentionCount === 1 ? "oportunitate care necesită intervenție" : "oportunități care necesită intervenție"}. Clarifică responsabilitatea și următorul pas înainte de a extinde pipeline-ul.`
      : "Nu există intervenții urgente în datele disponibile. Folosește această fereastră pentru a confirma responsabilii și următoarele acțiuni din pipeline.";

    const urgentColumns: DashboardTableColumn<AttentionRow>[] = [
      {
        key: "opportunity",
        label: "Oportunitate",
        className: "w-[25%]",
        render: (row) => (
          <div className="min-w-0">
            <Link href={`/opportunities/${row.opportunity.id}`} className="focus-ring rounded font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))]">{row.opportunity.title}</Link>
            <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{companyForOpportunity(row.opportunity)}</p>
          </div>
        )
      },
      {
        key: "value",
        label: "Valoare",
        className: "w-[13%]",
        render: (row) => <span className="whitespace-nowrap font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(row.opportunity.estimatedValueHigh, row.opportunity.currency ?? "RON")}</span>
      },
      {
        key: "attention",
        label: "Atenție",
        className: "w-[16%]",
        render: (row) => <Badge tone={row.reasonTone}>{row.reason}</Badge>
      },
      {
        key: "owner",
        label: "Responsabil",
        className: "w-[13%]",
        render: (row) => <span className="text-[rgb(var(--text-secondary))]">{row.opportunity.ownerName ?? "Neatribuit"}</span>
      },
      {
        key: "next",
        label: "Următorul pas",
        className: "w-[21%]",
        render: (row) => <div><p className="line-clamp-2 text-[rgb(var(--text-secondary))]">{row.nextAction}</p><p className="mt-1 text-xs text-[rgb(var(--text-faint))]">{row.dueLabel}</p></div>
      },
      {
        key: "open",
        label: "",
        className: "w-[12%] text-right",
        render: (row) => <Link href={`/opportunities/${row.opportunity.id}`} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-button px-2 text-sm font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--surface-muted))]">Deschide <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
      }
    ];

    const activityItems: ActivityFeedItem[] = summary.events.slice(0, 7).map((event) => ({
      id: event.id,
      title: event.label,
      detail: event.opportunityId ? opportunityById.get(event.opportunityId)?.title ?? "Oportunitate din workspace" : "Activitate din workspace",
      timestamp: activityDate(event.date),
      href: event.opportunityId ? `/opportunities/${event.opportunityId}` : undefined
    }));

    const secondaryMetrics = [
      { label: "Câștigat confirmat · Luna curentă", value: formatCurrency(summary.metrics.wonRevenue, "RON"), detail: "Valori efective înregistrate în RON; estimările sunt excluse.", tone: "gold" as const },
      { label: "Conversie confirmată", value: summary.metrics.conversionRate === null ? "Date insuficiente" : `${summary.metrics.conversionRate}%`, detail: "Oportunități marcate câștigate din totalul urmărit." },
      { label: "Semnale de revizuit", value: String(reviewSignals.length), detail: "Analizate și pregătite pentru decizia echipei.", tone: "gold" as const },
      { label: "Importate în așteptare", value: String(ingestion.awaitingImportedReview), detail: "Semnale CSV care necesită analiză sau decizie umană." },
      { label: "Valoare importată estimată", value: formatCurrency(ingestion.estimatedImportedRecoverableValue, "RON"), detail: "Estimare separată de venitul câștigat confirmat; include numai semnale importate eligibile în RON.", tone: "gold" as const },
      { label: "Drafturi de revizuit", value: String(followUp.awaitingReview), detail: "Conținut comercial care necesită decizie umană.", tone: "gold" as const },
      { label: "Aprobate · Netrimise", value: String(followUp.approvedNotSent), detail: "Aprobarea nu confirmă o trimitere externă.", tone: "mint" as const },
      { label: "Livrări reale confirmate", value: String(followUp.realDeliveries), detail: "Confirmate de furnizorul live; separat de venit.", tone: "mint" as const },
      { label: "Follow-up-uri scadente", value: String(followUp.dueFollowUps), detail: "Acțiuni de follow-up încă deschise." },
      { label: "Răspunsuri primite", value: String(responseLoop.responsesReceived), detail: "Răspunsuri comerciale înregistrate manual.", tone: "mint" as const },
      { label: "Rată de răspuns", value: responseLoop.responseRate === null ? "Date insuficiente" : `${responseLoop.responseRate}%`, detail: "Oportunități cu răspuns primit din totalul oportunităților cu răspuns înregistrat." },
      { label: "Întâlniri", value: String(responseLoop.meetings), detail: "Solicitate sau programate explicit." },
      { label: "Câștigate / Pierdute", value: `${responseLoop.won} / ${responseLoop.lost}`, detail: "Numai rezultate confirmate explicit." },
      { label: "Venit recuperat confirmat", value: formatCurrency(responseLoop.confirmedRevenueRon, "RON"), detail: "Valoare efectivă, separată de estimări.", tone: "mint" as const }
    ];

    return (
      <main className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-6 pb-24 sm:px-6 sm:py-7 lg:px-8 lg:pb-10">
        {!isSupabaseConfigured ? <DemoNotice /> : null}

        <PremiumPanel tone="emphasis" className="relative overflow-hidden p-5 sm:p-6 lg:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--brand-500)/0.09)] blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--brand-300))]">
                <span>Brief operațional</span>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-current" />
                <time dateTime={summary.today}>{operatingDate(summary.today)}</time>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-[rgb(var(--foreground))] sm:text-3xl">Control Center</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[rgb(var(--text-secondary))] sm:text-lg">{brief}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-[rgb(var(--text-muted))]">
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)] px-3 py-1.5">{summary.activeOpportunities.length} oportunități active</span>
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)] px-3 py-1.5">{activeSignals.length} semnale active</span>
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)] px-3 py-1.5">Control uman obligatoriu</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
              <Button href={firstValueJourney.complete ? "/inbox" : firstValueJourney.nextHref}>{firstValueJourney.complete ? "Deschide Inbox Comercial" : firstValueJourney.nextAction}</Button>
              <Button href="/companies" variant="secondary">Vezi companiile</Button>
            </div>
          </div>
        </PremiumPanel>

        {!firstValueJourney.complete ? <FirstTimeGuide journey={firstValueJourney} /> : null}

        <section aria-label="Indicatori operaționali principali" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Potențial urmărit · RON" value={formatCurrency(totalEstimatedValueRon, "RON")} detail={`${summary.activeOpportunities.length + activeSignals.length} înregistrări active cu valoare urmărită.`} methodology="Oportunități deschise plus semnale active în RON. Estimare activă; nu este venit confirmat." tone="brand" icon={<BanknotesIcon className="h-5 w-5" aria-hidden="true" />} />
          <KpiCard label="Oportunități active" value={String(summary.activeOpportunities.length)} detail={`${attentionCount} necesită atenție pe baza datelor disponibile.`} tone={attentionCount > 0 ? "warning" : "neutral"} icon={<BoltIcon className="h-5 w-5" aria-hidden="true" />} />
          <KpiCard label="Scadente azi / restante" value={`${summary.workQueue.dueToday.length} / ${summary.workQueue.overdue.length}`} detail="Acțiuni atribuite utilizatorului curent, separate după termen." tone={summary.workQueue.overdue.length > 0 ? "danger" : urgentActionCount > 0 ? "warning" : "neutral"} icon={<CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />} />
          <KpiCard label="Risc operațional" value={String(attentionCount)} detail={`${highRiskCount} oportunități sunt evaluate cu risc ridicat.`} tone={highRiskCount > 0 ? "danger" : attentionCount > 0 ? "warning" : "neutral"} icon={<ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />} />
        </section>

        <DashboardSection eyebrow="Prioritatea zilei" title="Ce necesită atenție acum" description="Acțiunile scadente au prioritate, urmate de oportunitățile fără responsabil, contact sau următor pas." action={<Button href="/recoverable" variant="ghost" size="small">Vezi coada de recuperare <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>}>
          <DashboardTable
            rows={attentionRows}
            columns={urgentColumns}
            empty={summary.opportunities.length === 0
              ? compactEmpty("Control Center așteaptă primul semnal", "Adaugă sau importă context comercial real. După analiză și aprobarea umană, oportunitatea și următoarea acțiune vor deveni vizibile aici.", "/inbox?create=1", "Adaugă primul semnal")
              : compactEmpty("Nu există intervenții urgente", "Nu ai acțiuni scadente și nicio oportunitate activă nu este marcată pentru intervenție.", "/pipeline", "Verifică pipeline-ul")}
            mobileRender={(row) => (
              <PremiumPanel className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/opportunities/${row.opportunity.id}`} className="focus-ring rounded font-semibold text-[rgb(var(--foreground))]">{row.opportunity.title}</Link>
                    <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{companyForOpportunity(row.opportunity)}</p>
                  </div>
                  <Badge tone={row.reasonTone}>{row.reason}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-[rgb(var(--text-faint))]">Valoare</dt><dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{formatCurrency(row.opportunity.estimatedValueHigh, row.opportunity.currency ?? "RON")}</dd></div>
                  <div><dt className="text-[rgb(var(--text-faint))]">Responsabil</dt><dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{row.opportunity.ownerName ?? "Neatribuit"}</dd></div>
                  <div className="col-span-2"><dt className="text-[rgb(var(--text-faint))]">Următorul pas</dt><dd className="mt-1 text-sm text-[rgb(var(--text-secondary))]">{row.nextAction} · {row.dueLabel}</dd></div>
                </dl>
                <Button href={`/opportunities/${row.opportunity.id}`} variant="secondary" size="small" className="mt-4 w-full">Continuă workflow-ul</Button>
              </PremiumPanel>
            )}
          />
        </DashboardSection>

        <div className="grid gap-8 xl:grid-cols-12">
          <DashboardSection className="xl:col-span-8" title="Oportunități urgente și stale" description="Listă ordonată determinist după severitate, valoare și ultima schimbare." action={<Button href="/opportunities" variant="ghost" size="small">Toate oportunitățile <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>}>
            <div className="overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
              {summary.warnings.attention.length > 0 ? (
                <ul className="divide-y divide-[rgb(var(--border))]">
                  {summary.warnings.attention.slice(0, 7).map(({ opportunity, assessment }) => (
                    <li key={opportunity.id}>
                      <Link href={`/opportunities/${opportunity.id}`} className="focus-ring group grid min-h-[72px] gap-3 px-4 py-3 transition-colors duration-fast hover:bg-[rgb(var(--surface-muted)/0.68)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-[rgb(var(--foreground))] group-hover:text-[rgb(var(--primary))]">{opportunity.title}</p>
                            <StatusBadge status={opportunity.status} />
                          </div>
                          <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{companyForOpportunity(opportunity)} · {opportunity.ownerName ?? "Fără owner"}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-[rgb(var(--warning-text))]">{assessment.reasons.slice(0, 3).map((reason) => reason.label).join(" · ")}</p>
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="text-left sm:text-right">
                            <p className="font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</p>
                            <p className="mt-1 text-xs text-[rgb(var(--text-faint))]">{assessment.primaryNextAction?.dueDate ? formatDate(assessment.primaryNextAction.dueDate) : assessment.primaryNextAction?.title ?? "Necesită next action"}</p>
                          </div>
                          <ArrowRightIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text-faint))] transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-[rgb(var(--primary))]" aria-hidden="true" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : summary.opportunities.length === 0
                ? compactEmpty("Nicio oportunitate aprobată încă", "Oportunitățile apar după ce un semnal este analizat, revizuit și aprobat de un utilizator.", "/inbox", "Revizuiește semnalele")
                : compactEmpty("Pipeline fără excepții active", "Nu există oportunități marcate pentru intervenție în datele accesibile.", "/opportunities", "Vezi oportunitățile")}
            </div>
          </DashboardSection>

          <div className="grid gap-8 xl:col-span-4">
            <DashboardSection title="Sănătate operațională" description="Semnale compacte pentru management și intervenție.">
              <PremiumPanel className="p-5">
                <AttentionSummary items={[
                  { label: "În atenție", value: attentionCount, tone: "danger", href: "/opportunities" },
                  { label: "Fără next action", value: summary.warnings.withoutNextAction.length, tone: "warning", href: "/pipeline" },
                  { label: "Fără contact principal", value: summary.warnings.withoutPrimaryContact.length, tone: "neutral", href: "/companies" },
                  { label: "Fără owner", value: summary.viewer.isManager ? summary.warnings.unassigned.length : 0, tone: "brand", href: summary.viewer.isManager ? "/pipeline" : undefined }
                ]} />
              </PremiumPanel>
            </DashboardSection>

            <DashboardSection title="Activitate relevantă" description="Evenimente comerciale recente din workspace.">
              <PremiumPanel className="px-4 py-1">
                <ActivityFeed items={activityItems} empty={compactEmpty("Fără activitate recentă", "Evenimentele comerciale vor apărea aici după actualizarea workflow-urilor.")} />
              </PremiumPanel>
            </DashboardSection>
          </div>
        </div>

        <DashboardSection title="Rezumat operațional secundar" description="Indicatorii de execuție rămân disponibili fără să domine deciziile din primul ecran.">
          <details className="group rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
            <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-panel px-4 py-3 font-semibold text-[rgb(var(--foreground))] marker:hidden sm:px-5">
              <span>Vezi indicatorii de execuție și rezultate</span>
              <span className="text-xs font-medium text-[rgb(var(--text-muted))]">{secondaryMetrics.length} indicatori</span>
            </summary>
            <div className="grid gap-3 border-t border-[rgb(var(--border))] p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-5">
              {secondaryMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
            </div>
          </details>
        </DashboardSection>

        <PremiumPanel tone="subtle" className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <UserCircleIcon className="h-6 w-6 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-[rgb(var(--foreground))]">Control uman și metodologie verificabilă</h2>
              <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">Estimările, acțiunile pregătite și răspunsurile rămân separate de venitul confirmat. Nicio livrare externă nu este presupusă dintr-un draft sau dintr-o aprobare.</p>
            </div>
          </div>
          <Button href="/reports" variant="secondary" size="small">Vezi metodologia</Button>
        </PremiumPanel>
      </main>
    );
  } catch (error) {
    console.error("Dashboard revenue workspace error", error);
    return <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8"><ErrorState /></main>;
  }
}
