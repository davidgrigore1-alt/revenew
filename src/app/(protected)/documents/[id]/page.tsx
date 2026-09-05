import Link from "next/link";
import { DocumentContextualAsk } from "@/components/documents/DocumentContextualAsk";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getInternalCommercialDocument } from "@/lib/commercial-documents";
import { formatProductDateTime } from "@/lib/ui/presentation";
import styles from "@/components/documents/Documents.module.css";
export const dynamic="force-dynamic";

export default async function InternalDocumentPage(props:{params:Promise<{id:string}>}) {
  const {id}=await props.params;
  const document=await getInternalCommercialDocument(id);
  if(!document)notFound();
  const contextHref="/opportunities/"+document.context.id+"?tab=workflow#opportunity-documents";
  const status=document.status==="approved"?"Aprobat intern":document.status==="sent"?"Marcat ca trimis":"În lucru";
  return <PageShell wide eyebrow="Document comercial" title={document.title} description="Document pregătit în ReveNew · conținut salvat"
    breadcrumbs={[{label:"Documente",href:"/documents"},{label:document.title}]}
    actions={<Button href="#document-intelligence" variant="secondary">Inteligență operațională</Button>}>
    <div className={styles.workspace}>
      <div className={styles.toolbar}><span className={styles.status}>{status}</span><p className={styles.meta}>{document.type} · modificat {document.updatedAt?formatProductDateTime(document.updatedAt):"la o dată necunoscută"}</p></div>
      <DocumentContextualAsk opportunityId={document.context.id} contextTitle={document.context.title}/>
      <div className={styles.brief}>
        <article className={styles.content} aria-labelledby="document-content-heading"><p className={styles.eyebrow}>Conținut</p><h2 id="document-content-heading">Document pregătit</h2><pre className={styles.body}>{document.body||"Documentul nu are încă un conținut."}</pre></article>
        <aside className={styles.rail} aria-label="Proveniență și context"><p className={styles.eyebrow}>Proveniență</p><h2>Contextul documentului</h2>
          <dl className={styles.facts}><div><dt>Sursă</dt><dd>ReveNew · document intern</dd></div><div><dt>Oportunitate asociată</dt><dd><Link className="focus-ring underline" href={contextHref}>{document.context.title}</Link></dd></div><div><dt>Identitate document</dt><dd>{document.id}</dd></div><div><dt>Ultima modificare</dt><dd>{document.updatedAt?formatProductDateTime(document.updatedAt):"Necunoscută"}</dd></div><div><dt>Verificare comercială</dt><dd>Data modificării nu confirmă verificarea conținutului.</dd></div></dl>
          <div className={styles.section+" mt-6"}><h3>Revizuiește în context</h3><p className={styles.meta+" mt-2"}>Starea internă nu dovedește trimiterea printr-un furnizor. Aprobarea, execuția și rezultatul comercial se verifică separat în oportunitate.</p><Link href={contextHref} className="focus-ring mt-4 inline-block text-sm underline">Vezi sursele oportunității →</Link></div>
        </aside>
      </div>
    </div>
  </PageShell>;
}
