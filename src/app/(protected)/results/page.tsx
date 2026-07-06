import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/Button";
import { getRecoverySummary } from "@/lib/recovery";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const summary = await getRecoverySummary();
  const won = summary.opportunities.filter((opportunity) => opportunity.status === "won");
  const contacted = summary.opportunities.filter((opportunity) => ["contacted", "follow_up_needed", "won"].includes(opportunity.status));
  const doneActions = summary.actions.filter((action) => action.status === "done");
  const lost = summary.opportunities.filter((opportunity) => opportunity.status === "lost");

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 pb-24 sm:px-6 lg:px-8 xl:pb-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Identificate" value={`${summary.opportunities.length}`} detail="Oportunități găsite în workspace." />
        <MetricCard label="Contactate" value={`${contacted.length}`} detail="Oportunități unde echipa a intervenit." tone="mint" />
        <MetricCard label="Câștigate" value={`${won.length}`} detail="Oportunități marcate câștigate." tone="gold" />
        <MetricCard label="Valoare estimată recuperată" value={formatCurrency(won.reduce((sum, item) => sum + item.estimatedValueHigh, 0))} detail="Estimare, nu venit confirmat contabil." />
      </div>

      <DataCard title="Rezultate recente" description="Ultimele rezultate și acțiuni vizibile în datele existente." action={<Button href="/reports" variant="secondary">Rapoarte detaliate</Button>}>
        <div className="grid gap-3">
          {summary.events.length > 0 ? (
            summary.events.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
                <p className="font-semibold text-[rgb(var(--foreground))]">{event.label}</p>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{formatDate(event.date)}</p>
              </div>
            ))
          ) : (
            <EmptyState title="Nu există rezultate recente" description="Rezultatele apar după ce revizuiești cereri, pregătești documente, contactezi lead-uri sau marchezi oportunități." />
          )}
        </div>
      </DataCard>

      <DataCard title="Oportunități pierdute" description="Separăm pierderile de valoarea estimată recuperată.">
        <div className="grid gap-3">
          {lost.length > 0 ? (
            lost.map((opportunity) => (
              <div key={opportunity.id} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
                <p className="font-semibold text-[rgb(var(--foreground))]">{opportunity.title}</p>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Valoare estimată pierdută: {formatCurrency(opportunity.estimatedValueHigh)}</p>
              </div>
            ))
          ) : (
            <EmptyState title="Nu există oportunități pierdute" description="Oportunitățile marcate pierdute vor apărea aici cu valoarea lor estimată." />
          )}
        </div>
      </DataCard>

      <DataCard title="Claritate financiară" description="Valoare estimată înseamnă potențial comercial. Venit confirmat apare doar când există date reale de atribuire." />
    </main>
  );
}
