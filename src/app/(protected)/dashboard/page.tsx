import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { ErrorState } from "@/components/dashboard/ErrorState";
import { FirstTimeGuide } from "@/components/dashboard/FirstTimeGuide";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecoveryValueCard } from "@/components/dashboard/RecoveryValueCard";
import { RiskOpportunityCard } from "@/components/dashboard/RiskOpportunityCard";
import { TodayActionCard } from "@/components/dashboard/TodayActionCard";
import { getRecoverySummary, recoverableOpportunities, recoverableValue } from "@/lib/recovery";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function CompactEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">
      {children}
    </p>
  );
}

export default async function DashboardPage() {
  try {
    const summary = await getRecoverySummary();
    const recoverable = recoverableOpportunities(summary.opportunities);
    const activeSignals = summary.signals.filter((signal) => !signal.convertedOpportunityId && !["converted", "ignored", "archived"].includes(signal.status));
    const value = recoverableValue(summary.opportunities, summary.signals);
    const hasUsefulData = value > 0 || summary.opportunities.length > 0 || activeSignals.length > 0 || summary.actions.length > 0;
    const pendingActions = summary.actions
      .filter((action) => action.status === "pending")
      .sort((a, b) => {
        const priority = { high: 3, medium: 2, low: 1 };
        return priority[b.priority] - priority[a.priority] || String(a.dueAt ?? "9999").localeCompare(String(b.dueAt ?? "9999"));
      })
      .slice(0, 3);
    const today = new Date().toISOString().slice(0, 10);
    const riskOpportunities = recoverable
      .filter((opportunity) => opportunity.urgencyScore >= 75 || opportunity.status === "follow_up_needed" || (opportunity.deadline ? opportunity.deadline.slice(0, 10) <= today : false))
      .sort((a, b) => b.urgencyScore + b.estimatedValueHigh - (a.urgencyScore + a.estimatedValueHigh))
      .slice(0, 3);
    const won = summary.opportunities.filter((opportunity) => opportunity.status === "won");
    const wonValue = won.reduce((sum, item) => sum + item.estimatedValueHigh, 0);

    return (
      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-7 pb-24 sm:px-6 xl:px-8 xl:pb-8">
        {!isSupabaseConfigured ? <DemoNotice /> : null}

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <RecoveryValueCard value={value} count={recoverable.length + activeSignals.length} />
          </div>
          <div className="xl:col-span-5">
            <DataCard title="Ce trebuie să faci acum" action={<Link href="/today" className="focus-ring rounded px-2 py-1 text-sm font-semibold text-[rgb(var(--primary))]">Vezi toate</Link>}>
              <div className="grid gap-3">
                {pendingActions.length > 0 ? (
                  pendingActions.map((action) => <TodayActionCard key={action.id} action={action} compact />)
                ) : (
                  <CompactEmpty>Nu ai acțiuni urgente acum. Când apar follow-up-uri sau oferte importante, le vezi aici.</CompactEmpty>
                )}
              </div>
            </DataCard>
          </div>
        </div>

        {!hasUsefulData ? <FirstTimeGuide /> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Oportunități recuperabile" value={`${recoverable.length}`} detail="Deschise și urmărite." tone="mint" />
          <MetricCard label="Cereri noi" value={`${activeSignals.filter((signal) => signal.status === "new").length}`} detail="De verificat." />
          <MetricCard label="Valoare estimată câștigată" value={formatCurrency(wonValue)} detail="Nu este venit confirmat." tone="gold" />
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <DataCard title="Oportunități în risc">
              <div className="grid gap-3">
                {riskOpportunities.length > 0 ? (
                  riskOpportunities.map((opportunity) => <RiskOpportunityCard key={opportunity.id} opportunity={opportunity} />)
                ) : (
                  <CompactEmpty>Nu există oportunități în risc momentan.</CompactEmpty>
                )}
              </div>
            </DataCard>
          </div>

          <div className="xl:col-span-5">
            <DataCard title="Rezultate recente" action={<Link href="/results" className="focus-ring rounded px-2 py-1 text-sm font-semibold text-[rgb(var(--primary))]">Detalii</Link>}>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Identificate", summary.opportunities.length],
                  ["Contactate", summary.opportunities.filter((item) => ["contacted", "follow_up_needed", "won"].includes(item.status)).length],
                  ["Câștigate", won.length],
                  ["Acțiuni finalizate", summary.actions.filter((action) => action.status === "done").length]
                ].map(([label, metric]) => (
                  <div key={String(label)} className="rounded-lg bg-[rgb(var(--surface-elevated))] px-4 py-3">
                    <p className="text-2xl font-semibold text-[rgb(var(--foreground))]">{metric}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{label}</p>
                  </div>
                ))}
              </div>
            </DataCard>
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error("Dashboard recovery view error", error);
    return (
      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 xl:px-8">
        <ErrorState />
      </main>
    );
  }
}
