import { PageShell } from "@/components/dashboard/PageShell";
import { PipelineBoard } from "@/components/revenue/PipelineBoard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/Button";
import { getPipelineOpportunities } from "@/lib/revenue-workspace";
import { getReportingFxRate } from "@/lib/reporting-fx";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [columns, fx] = await Promise.all([getPipelineOpportunities(), getReportingFxRate()]);
  const opportunities = columns.flatMap((column) => column.opportunities);

  return (
    <PageShell wide
      eyebrow="Flux comercial"
      title="Pipeline"
      description="Fiecare oportunitate, cu responsabil și pas următor. Rezultatele rămân distincte de estimări."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="/opportunities" variant="secondary">Vezi oportunitățile</Button>
          <Button href="/opportunities/analyze">Adaugă oportunitate</Button>
        </div>
      }
    >
      {opportunities.length === 0 ? (
        <div className="grid justify-items-start gap-4">
          <EmptyState title="Pipeline-ul este pregătit" description="Oportunitățile apar aici după ce le creezi pentru o companie. Etapele se schimbă controlat, iar rezultatele se înregistrează în detaliul oportunității." />
          <Button href="/opportunities/analyze">Adaugă prima oportunitate</Button>
        </div>
      ) : <PipelineBoard columns={columns} fx={fx}/>}
    </PageShell>
  );
}
