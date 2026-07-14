import { CommercialSignalImportWizard } from "@/components/inbox/CommercialSignalImportWizard";
import { PageShell } from "@/components/dashboard/PageShell";
import { getCommercialImportHistory } from "@/lib/commercial-ingestion";

export const dynamic = "force-dynamic";

export default async function CommercialSignalImportPage() {
  const history = await getCommercialImportHistory();
  return <PageShell eyebrow="Inbox Comercial" title="Importă semnale comerciale" description="Validează, mapează și confirmă datele înainte de a crea semnale pentru revizuire umană."><CommercialSignalImportWizard history={history} /></PageShell>;
}

