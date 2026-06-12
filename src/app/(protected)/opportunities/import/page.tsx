import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";

export default function OpportunityImportPage() {
  return (
    <PageShell
      eyebrow="Import"
      title="Import CSV - in curand"
      description="Zona pregatita pentru importul de lead-uri si oportunitati din fisiere CSV."
    >
      <DataCard title="Placeholder import CSV">
        <p className="text-sm leading-6 text-zinc-300">
          Importul CSV nu este activ in aceasta faza. Momentan poti analiza manual oportunitati si poti salva documente,
          follow-up-uri si rapoarte comerciale.
        </p>
        <div className="mt-5">
          <Button href="/opportunities/analyze">Analizeaza oportunitate</Button>
        </div>
      </DataCard>
    </PageShell>
  );
}
