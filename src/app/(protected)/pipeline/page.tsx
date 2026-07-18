import { PageShell } from "@/components/dashboard/PageShell";
import { PipelineBoard } from "@/components/revenue/PipelineBoard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/Button";
import { getPipelineOpportunities } from "@/lib/revenue-workspace";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const columns = await getPipelineOpportunities();
  const opportunities = columns.flatMap((column) => column.opportunities);
  const activeColumns = columns.filter((column) => !["won", "lost"].includes(column.id));
  const activeOpportunities = activeColumns.flatMap((column) => column.opportunities);
  const activeValue = activeColumns.reduce((sum, column) => sum + column.totalValue, 0);
  const wonValue = columns.find((column) => column.id === "won")?.totalValue ?? 0;
  const withOwner = activeOpportunities.filter((opportunity) => opportunity.ownerProfileId).length;
  const withNextAction = activeOpportunities.filter((opportunity) =>
    opportunity.actions.some((action) => action.status === "pending" && action.dueDate)
  ).length;

  return (
    <PageShell
      eyebrow="Flux comercial"
      title="Pipeline"
      description="Controlează progresul comercial pe etape, cu ownership și următoarea acțiune vizibile înaintea schimbării de status."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="/opportunities" variant="secondary">Vezi oportunitățile</Button>
          <Button href="/opportunities/analyze">Adaugă oportunitate</Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="pipeline-overview-title">
          <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-label text-[rgb(var(--primary))]">Poziția comercială activă</p>
              <h2 id="pipeline-overview-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[rgb(var(--foreground))]">
                {formatCurrency(activeValue, "RON")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--text-muted))]">
                Valoare maximă estimată pentru oportunitățile active în RON. Rezultatele câștigate sunt raportate separat și nu sunt incluse aici.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div><dt className="text-label text-[rgb(var(--text-faint))]">Active</dt><dd className="mt-1 text-xl font-semibold">{activeOpportunities.length}</dd></div>
                <div><dt className="text-label text-[rgb(var(--text-faint))]">Cu responsabil</dt><dd className="mt-1 text-xl font-semibold">{withOwner}/{activeOpportunities.length}</dd></div>
                <div><dt className="text-label text-[rgb(var(--text-faint))]">Cu next action</dt><dd className="mt-1 text-xl font-semibold">{withNextAction}/{activeOpportunities.length}</dd></div>
                <div><dt className="text-label text-[rgb(var(--text-faint))]">Câștigat · RON</dt><dd className="mt-1 text-xl font-semibold text-[rgb(var(--success-text))]">{formatCurrency(wonValue, "RON")}</dd></div>
              </dl>
            </div>
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold">Distribuție pe etape</h3>
                <span className="text-xs text-[rgb(var(--text-muted))]">{opportunities.length} total</span>
              </div>
              <div className="mt-5 grid gap-3">
                {columns.map((column) => {
                  const share = opportunities.length ? Math.round((column.count / opportunities.length) * 100) : 0;
                  return (
                    <div key={column.id} className="grid grid-cols-[minmax(5rem,0.7fr)_2fr_auto] items-center gap-3 text-xs">
                      <span className="truncate font-medium text-[rgb(var(--text-muted))]">{column.label}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]">
                        <span className="block h-full rounded-full bg-[rgb(var(--primary))]" style={{ width: `${share}%` }} />
                      </span>
                      <span className="w-6 text-right font-semibold text-[rgb(var(--foreground))]">{column.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {opportunities.length === 0 ? (
          <div className="grid justify-items-start gap-4">
            <EmptyState title="Pipeline-ul este pregătit" description="Oportunitățile apar aici după ce le creezi pentru o companie. Etapele se schimbă controlat, iar rezultatele se înregistrează în detaliul oportunității." />
            <Button href="/opportunities/analyze">Adaugă prima oportunitate</Button>
          </div>
        ) : <PipelineBoard columns={columns} />}
      </div>
    </PageShell>
  );
}
