import { PageShell } from "@/components/dashboard/PageShell";
import { PipelineBoard } from "@/components/revenue/PipelineBoard";
import { getPipelineOpportunities } from "@/lib/revenue-workspace";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Button } from "@/components/ui/Button";
import { DataSummaryStrip } from "@/components/ui/DataSummaryStrip";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const columns = await getPipelineOpportunities();
  const activeValue = columns
    .filter((column) => !["won", "lost"].includes(column.id))
    .reduce((sum, column) => sum + column.totalValue, 0);
  const opportunityCount = columns.reduce((sum, column) => sum + column.count, 0);

  return (
    <PageShell
      eyebrow="Pipeline comercial"
      title="Pipeline"
      description="Urmărește oportunitățile pe etape comerciale, fără drag-and-drop obligatoriu și fără statusuri inventate."
    >
      <div className="grid gap-5">
        <DataSummaryStrip label="Rezumat pipeline" items={[
          { label: "Valoare activă · RON", value: formatCurrency(activeValue, "RON"), note: "Oportunități neterminale.", tone: "brand" },
          { label: "Oportunități active", value: columns.filter((column) => !["won", "lost"].includes(column.id)).reduce((sum, column) => sum + column.count, 0), note: "În execuție comercială.", tone: "neutral" },
          { label: "Câștigate · RON", value: formatCurrency(columns.find((column) => column.id === "won")?.totalValue ?? 0, "RON"), note: "Valori efective înregistrate.", tone: "success" },
          { label: "Etape active", value: columns.filter((column) => column.count > 0).length, note: `din ${columns.length} etape`, tone: "neutral" }
        ]} />
        {opportunityCount === 0 ? <div className="grid justify-items-start gap-4"><EmptyState title="Pipeline-ul este pregătit" description="Oportunitățile apar aici după ce le creezi pentru o companie. Etapele se schimbă controlat, iar rezultatele câștigate sau pierdute se înregistrează în detaliul oportunității." /><Button href="/opportunities">Adaugă prima oportunitate</Button></div> : <PipelineBoard columns={columns} />}
      </div>
    </PageShell>
  );
}
