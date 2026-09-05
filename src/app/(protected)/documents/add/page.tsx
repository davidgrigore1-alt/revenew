import { PageShell } from "@/components/dashboard/PageShell";
import { DriveWorkspace } from "@/components/apps/DriveWorkspace";
import { DocumentCsvImport } from "@/components/documents/DocumentCsvImport";
import { requirePermission } from "@/lib/authz/require-permission";
import { hasPermission } from "@/lib/authz/has-permission";
import styles from "@/components/documents/Documents.module.css";

export const dynamic = "force-dynamic";
export default async function AddDocumentPage() {
  const authorization = await requirePermission("documents.read");
  return <PageShell wide eyebrow="Documente" title="Adaugă document" description="Alege o sursă comercială. Inspectarea ei nu presupune importul în registre."
    breadcrumbs={[{ label: "Documente", href: "/documents" }, { label: "Adaugă document" }]}>
    <div className={styles.workspace}>
      <DocumentCsvImport canImport={hasPermission(authorization,"signals.create")} sourceChoices={<section className={styles.sourceChoice} aria-label="Google Drive">
        <div><p className={styles.eyebrow}>Sursă conectată</p><h2>Google Drive</h2><p className={styles.meta}>Păstrează o referință și conținutul extras disponibil, în contextul unei oportunități. Originalul rămâne în Drive.</p></div>
        {hasPermission(authorization,"documents.generate")?<DriveWorkspace selectorOnly/>:<p className={styles.meta}>Rolul curent nu permite adăugarea unei surse Drive.</p>}
      </section>}/>
    </div>
  </PageShell>;
}
