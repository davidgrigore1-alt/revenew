import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { PipelineBoard } from "@/components/revenue/PipelineBoard";
import { getPipelineOpportunities } from "@/lib/revenue-workspace";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const columns = await getPipelineOpportunities();
  const activeValue = columns
    .filter((column) => !["won", "lost"].includes(column.id))
    .reduce((sum, column) => sum + column.totalValue, 0);

  return (
    <PageShell
      eyebrow="Pipeline comercial"
      title="Pipeline"
      description="Urmărește oportunitățile pe etape comerciale, fără drag-and-drop obligatoriu și fără statusuri inventate."
    >
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-3">
          <DataCard title="Valoare activă">
            <p className="text-2xl font-semibold text-[rgb(var(--foreground))]">{formatCurrency(activeValue, "RON")}</p>
            <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Oportunități neterminale.</p>
          </DataCard>
          <DataCard title="Oportunități active">
            <p className="text-2xl font-semibold text-[rgb(var(--foreground))]">
              {columns.filter((column) => !["won", "lost"].includes(column.id)).reduce((sum, column) => sum + column.count, 0)}
            </p>
            <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">De calificat, contactat sau urmărit.</p>
          </DataCard>
          <DataCard title="Câștigate">
            <p className="text-2xl font-semibold text-[rgb(var(--foreground))]">{formatCurrency(columns.find((column) => column.id === "won")?.totalValue ?? 0, "RON")}</p>
            <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Doar valori efective înregistrate; estimările sunt excluse.</p>
          </DataCard>
        </div>
        <PipelineBoard columns={columns} />
      </div>
    </PageShell>
  );
}
