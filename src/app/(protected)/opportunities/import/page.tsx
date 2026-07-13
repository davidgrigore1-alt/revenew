import { PageShell } from "@/components/dashboard/PageShell";
import { CsvImportWizard } from "@/components/imports/CsvImportWizard";

export default function OpportunityImportPage() {
  return (
    <PageShell
      eyebrow="Import controlat"
      title="Importă date comerciale"
      description="Încarcă firme, contacte sau oportunități din CSV, verifică maparea și confirmă exact ce intră în workspace."
    >
      <CsvImportWizard />
    </PageShell>
  );
}
