import { PageShell } from "@/components/dashboard/PageShell";
import { DriveWorkspace } from "@/components/apps/DriveWorkspace";
import { LocalDocumentUpload } from "@/components/documents/LocalDocumentUpload";
import { requirePermission } from "@/lib/authz/require-permission";
import { hasPermission } from "@/lib/authz/has-permission";
import styles from "@/components/documents/Documents.module.css";

export const dynamic = "force-dynamic";
export default async function AddDocumentPage() {
  const authorization = await requirePermission("documents.read");
  return <PageShell wide eyebrow="Documente" title="Adaugă document" description="Alege sursa documentului. Păstrarea și analiza sunt independente de importul datelor."
    breadcrumbs={[{ label: "Documente", href: "/documents" }, { label: "Adaugă document" }]}>
    <div className={`${styles.workspace} ${styles.sourceSelection}`}>
      {hasPermission(authorization,"documents.update")?<LocalDocumentUpload/>:<p>Rolul curent permite citirea documentelor, dar nu adăugarea lor.</p>}
      <section className={`${styles.sourceChoice} ${styles.alternativeSource}`} aria-label="Google Drive">
        <div className={styles.sourceIntro}><p className={styles.eyebrow}>Din Google Drive</p><h2>Selectează un document existent</h2><p className={styles.meta}>Adaugă o sursă în contextul unei oportunități. Originalul rămâne în Google Drive.</p></div>
        {hasPermission(authorization,"documents.generate")?<DriveWorkspace selectorOnly/>:<p className={styles.meta}>Rolul curent nu permite adăugarea unei surse Drive.</p>}
      </section>
    </div>
  </PageShell>;
}
