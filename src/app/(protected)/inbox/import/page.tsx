import { CommercialSignalImportWizard } from "@/components/inbox/CommercialSignalImportWizard";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCommercialImportHistory } from "@/lib/commercial-ingestion";

export const dynamic = "force-dynamic";

export default async function CommercialSignalImportPage() {
  const history = await getCommercialImportHistory();
  return <PageShell eyebrow="Preluare controlată" title="Importă semnale" description="Transformă informația comercială externă în semnale controlate, cu previzualizare, deduplicare și confirmare umană înainte de scriere.">
    <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 text-sm leading-6 text-[rgb(var(--text-muted))]">
      <p><strong className="text-[rgb(var(--foreground))]">Necesare:</strong> un fișier CSV și o coloană care descrie semnalul sau contextul comercial.</p>
      <p className="mt-1"><strong className="text-[rgb(var(--foreground))]">Recomandate:</strong> companie, contact, dată, valoare și monedă. Aceste câmpuri ajută la potrivire și deduplicare; importul nu aprobă automat oportunități.</p>
    </div>
    <CommercialSignalImportWizard history={history} />
  </PageShell>;
}

