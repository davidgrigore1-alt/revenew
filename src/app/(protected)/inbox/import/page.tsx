import { CommercialSignalImportWizard } from "@/components/inbox/CommercialSignalImportWizard";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCommercialImportHistory } from "@/lib/commercial-ingestion";

export const dynamic = "force-dynamic";

export default async function CommercialSignalImportPage() {
  const history = await getCommercialImportHistory();
  return <PageShell eyebrow="Source Intake" title="Importă semnale" description="Transformă informația comercială externă în semnale controlate, cu previzualizare, deduplicare și confirmare umană înainte de scriere."><CommercialSignalImportWizard history={history} /></PageShell>;
}

