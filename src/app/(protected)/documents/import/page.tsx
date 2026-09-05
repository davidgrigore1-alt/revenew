import { PageShell } from "@/components/dashboard/PageShell";
import { DocumentCsvImport } from "@/components/documents/DocumentCsvImport";
import { requirePermission } from "@/lib/authz/require-permission";
export const dynamic="force-dynamic";
export default async function DocumentImportPage() {
  await requirePermission("documents.read");
  await requirePermission("signals.create");
  return <PageShell wide eyebrow="Documente · acțiune opțională" title="Importă date în ReveNew" description="Inspectează sursa, apoi alege explicit ce semnale intră în Inbox Comercial."
    breadcrumbs={[{label:"Documente",href:"/documents"},{label:"Importă date"}]}><DocumentCsvImport/></PageShell>;
}
