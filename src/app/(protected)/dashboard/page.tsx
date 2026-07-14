
import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { FirstTimeGuide } from "@/components/dashboard/FirstTimeGuide";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecoveryValueCard } from "@/components/dashboard/RecoveryValueCard";
import { RiskOpportunityCard } from "@/components/dashboard/RiskOpportunityCard";
import { TodayActionCard } from "@/components/dashboard/TodayActionCard";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { getCommercialIngestionSummary } from "@/lib/commercial-ingestion";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { Opportunity } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function CompactEmpty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">{children}</p>;
}

function OpportunityException({ opportunity, reasons }: { opportunity: Opportunity; reasons: string[] }) {
  return (
    <Link href={`/opportunities/${opportunity.id}`} className="focus-ring block rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 hover:border-[rgb(var(--primary))]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-[rgb(var(--foreground))]">{opportunity.title}</p>
        <span className="whitespace-nowrap text-sm font-semibold">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</span>
      </div>
      <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">{reasons.join(" · ")}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  try {
    const [summary, ingestion] = await Promise.all([getRevenueWorkspaceSummary(), getCommercialIngestionSummary()]);
    const activeSignals = summary.signals.filter((signal) => !signal.convertedOpportunityId && !["converted", "dismissed", "duplicate", "ignored", "archived"].includes(signal.status));
    const reviewSignals = summary.signals.filter((signal) => ["ready_for_review", "postponed"].includes(signal.reviewStatus));
    const signalValue = activeSignals
      .filter((signal) => signal.currency === "RON")
      .reduce((sum, signal) => sum + Number(signal.estimatedRecoverableValue ?? 0), 0);
    const totalEstimatedValue = summary.metrics.activePipelineValue + signalValue;
    const hasUsefulData = totalEstimatedValue > 0 || summary.opportunities.length > 0 || activeSignals.length > 0 || summary.actions.length > 0;
    const pendingActions = [...summary.workQueue.overdue, ...summary.workQueue.dueToday, ...summary.workQueue.upcoming].slice(0, 5);
    const riskOpportunities = summary.warnings.highValueAtRisk.slice(0, 3).map((item) => item.opportunity);

    return (
      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-7 pb-24 sm:px-6 xl:px-8 xl:pb-8">
        {!isSupabaseConfigured ? <DemoNotice /> : null}

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7"><RecoveryValueCard value={totalEstimatedValue} count={summary.activeOpportunities.length + activeSignals.length} /></div>
          <div className="xl:col-span-5">
            <DataCard title="Acțiunile mele" description="Restante, scadente astăzi, apoi cele viitoare." action={<Link href="/today" className="focus-ring rounded px-2 py-1 text-sm font-semibold text-[rgb(var(--primary))]">Vezi toate</Link>}>
              <div className="grid gap-3">
                {pendingActions.length > 0 ? pendingActions.map((action) => <TodayActionCard key={action.id} action={action} compact />) : <CompactEmpty>Nu ai acțiuni atribuite cu termen activ.</CompactEmpty>}
              </div>
            </DataCard>
          </div>
        </div>

        {!hasUsefulData ? <FirstTimeGuide /> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Pipeline activ · Estimat" value={formatCurrency(summary.metrics.activePipelineValue, "RON")} detail="Potențial estimat pentru oportunități deschise; nu este venit confirmat." tone="mint" />
          <MetricCard label="Câștigat confirmat · Luna curentă" value={formatCurrency(summary.metrics.wonRevenue, "RON")} detail="Doar valori efective înregistrate în RON; estimările sunt excluse." tone="gold" />
          <MetricCard label="Conversie confirmată" value={summary.metrics.conversionRate === null ? "Date insuficiente" : `${summary.metrics.conversionRate}%`} detail="Oportunități marcate câștigate din totalul urmărit." />
          <MetricCard label="Acțiuni restante" value={`${summary.workQueue.overdue.length}`} detail="Atribuite utilizatorului curent." />
          <MetricCard label="Acțiuni astăzi" value={`${summary.workQueue.dueToday.length}`} detail="Atribuite utilizatorului curent." />
          <MetricCard label="Fără contact principal" value={`${summary.metrics.missingPrimaryContact}`} detail="Necesită completarea relației CRM." />
          <MetricCard label="Semnale de revizuit" value={`${reviewSignals.length}`} detail="Analizate și pregătite pentru decizia echipei." tone="gold" />
          <MetricCard label="În revizuire · Potențial estimat" value={formatCurrency(reviewSignals.filter((signal) => signal.currency === "RON").reduce((sum, signal) => sum + Number(signal.estimatedRecoverableValue ?? 0), 0), "RON")} detail="Estimare activă; nu este venit confirmat." />
          <MetricCard label="Semnale fără responsabil" value={`${reviewSignals.filter((signal) => !signal.assignedToProfileId && !signal.suggestedOwnerProfileId).length}`} detail="Necesită atribuirea unei persoane responsabile." />
          <MetricCard label="Importate în așteptare" value={`${ingestion.awaitingImportedReview}`} detail="Semnale CSV care necesită analiză sau decizie umană." tone="gold" />
          <MetricCard label="Oportunități detectate" value={`${ingestion.detectedSignals}`} detail="Semnale create explicit din oportunități neglijate." />
          <MetricCard label="Valoare importată estimată" value={formatCurrency(ingestion.estimatedImportedRecoverableValue, "RON")} detail="Estimare separată de venitul câștigat confirmat." />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DataCard title="Oportunități care necesită atenție" description="Ordine deterministă după severitate, valoare și ultima schimbare.">
            <div className="grid gap-3">
              {summary.warnings.attention.length > 0 ? summary.warnings.attention.slice(0, 6).map(({ opportunity, assessment }) => (
                <OpportunityException key={opportunity.id} opportunity={opportunity} reasons={assessment.reasons.slice(0, 3).map((reason) => reason.label)} />
              )) : <CompactEmpty>Nicio oportunitate nu necesită intervenție pe baza datelor disponibile.</CompactEmpty>}
            </div>
          </DataCard>
          <DataCard title="Excepții de completat" description="Înregistrări fără next action, contact principal sau responsabil.">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/pipeline" className="focus-ring rounded-lg bg-[rgb(var(--surface-elevated))] p-4"><p className="text-2xl font-semibold">{summary.warnings.withoutNextAction.length}</p><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Fără next action</p></Link>
              <Link href="/crm" className="focus-ring rounded-lg bg-[rgb(var(--surface-elevated))] p-4"><p className="text-2xl font-semibold">{summary.warnings.withoutPrimaryContact.length}</p><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Fără contact principal</p></Link>
              {summary.viewer.isManager ? <Link href="/pipeline" className="focus-ring rounded-lg bg-[rgb(var(--surface-elevated))] p-4"><p className="text-2xl font-semibold">{summary.warnings.unassigned.length}</p><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Neatribuite</p></Link> : null}
            </div>
          </DataCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <DataCard title="Oportunități cu valoare mare în risc">
              <div className="grid gap-3">{riskOpportunities.length > 0 ? riskOpportunities.map((opportunity) => <RiskOpportunityCard key={opportunity.id} opportunity={opportunity} />) : <CompactEmpty>Nu există oportunități în risc momentan.</CompactEmpty>}</div>
            </DataCard>
          </div>
          <div className="xl:col-span-5">
            <DataCard title="Rezultate operaționale" action={<Link href="/results" className="focus-ring rounded px-2 py-1 text-sm font-semibold text-[rgb(var(--primary))]">Detalii</Link>}>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Identificate", summary.opportunities.length],
                  ["Contactate", summary.opportunities.filter((item) => ["contacted", "follow_up_needed", "won"].includes(item.status)).length],
                  ["Câștigate", summary.opportunities.filter((item) => item.lifecycleStatus === "won" || (!item.lifecycleStatus && item.status === "won")).length],
                  ["Fără next action", summary.metrics.missingNextAction]
                ].map(([label, metric]) => <div key={String(label)} className="rounded-lg bg-[rgb(var(--surface-elevated))] px-4 py-3"><p className="text-2xl font-semibold">{metric}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{label}</p></div>)}
              </div>
            </DataCard>
          </div>
        </div>

        <DataCard title="Modificări recente" description="Cele mai recente oportunități din workspace-ul accesibil.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summary.warnings.recentlyChanged.length > 0 ? summary.warnings.recentlyChanged.map((opportunity) => (
              <OpportunityException key={opportunity.id} opportunity={opportunity} reasons={[opportunity.updatedAt ? `Actualizată ${new Intl.DateTimeFormat("ro-RO").format(new Date(opportunity.updatedAt))}` : "Istoric legacy"]} />
            )) : <CompactEmpty>Nu există modificări recente.</CompactEmpty>}
          </div>
        </DataCard>
      </main>
    );
  } catch (error) {
    console.error("Dashboard revenue workspace error", error);
    return <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 xl:px-8"><ErrorState /></main>;
  }
}
