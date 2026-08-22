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
      description="Controlează progresul comercial pe etape, cu responsabilitatea și următoarea acțiune vizibile înaintea schimbării stării."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="/opportunities" variant="secondary">Vezi oportunitățile</Button>
          <Button href="/opportunities/analyze">Adaugă oportunitate</Button>
        </div>
      }
    >
      <div className="grid gap-5">
        <section className="border-y border-[rgb(var(--border-strong)/0.72)] bg-[rgb(var(--surface-subtle))] px-3 py-3" aria-label="Rezumat pipeline">
          <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-xs">
            <div className="flex items-baseline gap-1.5"><dt className="text-[rgb(var(--text-muted))]">Valoare estimată în pipeline · RON</dt><dd className="text-sm font-semibold tabular-nums">{formatCurrency(activeValue, "RON")}</dd></div>
            <div className="flex items-baseline gap-1.5"><dt className="text-[rgb(var(--text-muted))]">Active</dt><dd className="font-semibold tabular-nums">{activeOpportunities.length}</dd></div>
            <div className="flex items-baseline gap-1.5"><dt className="text-[rgb(var(--text-muted))]">Cu responsabil</dt><dd className="font-semibold tabular-nums">{withOwner}/{activeOpportunities.length}</dd></div>
            <div className="flex items-baseline gap-1.5"><dt className="text-[rgb(var(--text-muted))]">Cu acțiune următoare</dt><dd className="font-semibold tabular-nums">{withNextAction}/{activeOpportunities.length}</dd></div>
            <div className="flex items-baseline gap-1.5 xl:ml-auto"><dt className="text-[rgb(var(--text-muted))]">Câștigat confirmat · RON</dt><dd className="font-semibold tabular-nums text-[rgb(var(--success-text))]">{formatCurrency(wonValue, "RON")}</dd></div>
          </dl>
          <p className="mt-1.5 text-[0.6875rem] text-[rgb(var(--text-faint))]">Estimările active sunt orientative. Nu este venit confirmat. Totalurile agregate includ numai valorile în RON.</p>
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
