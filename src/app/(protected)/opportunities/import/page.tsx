import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";

export default function OpportunityImportPage() {
  return (
    <PageShell
      eyebrow="Import"
      title="Import CSV - in curand"
      description="Zona pregătită pentru importul de lead-uri și oportunități din fișiere CSV."
    >
      <DataCard title="Placeholder import CSV">
        <p className="text-sm leading-6 text-zinc-300">
          Importul CSV nu este activ în această fază. Momentan poți analiza manual oportunități și poți salva documente,
          follow-up-uri si rapoarte comerciale.
        </p>
        <div className="mt-5">
          <Button href="/opportunities/analyze">Analizeaza oportunitate</Button>
        </div>
      </DataCard>
    </PageShell>
  );
}
