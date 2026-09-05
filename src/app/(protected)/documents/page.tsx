import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { DriveSourceActions } from "@/components/documents/DriveSourceActions";
import { DocumentTypeIcon, documentMimeLabel } from "@/components/documents/DocumentTypeIcon";
import { Button } from "@/components/ui/Button";
import { getCommercialDocuments } from "@/lib/commercial-documents";
import { formatProductDateTime } from "@/lib/ui/presentation";
import styles from "@/components/documents/Documents.module.css";

export const dynamic = "force-dynamic";

export default async function DocumentsPage(props:{searchParams:Promise<{q?:string;provider?:string;page?:string}>}) {
  const params=await props.searchParams;
  const model=await getCommercialDocuments({query:params.q,provider:params.provider,page:params.page});
  const href=(provider=model.provider,page=1)=>"/documents?"+new URLSearchParams({q:model.query,provider,page:String(page)});
  return <PageShell wide eyebrow="Documente" title="Documente comerciale" description="Surse, conținut și context pentru decizia comercială."
    actions={<Button href="/documents/add">Adaugă document</Button>}>
    <div className={styles.workspace}>
      <section aria-label="Instrumente registru documente" className={styles.toolbar}>
        <form action="/documents" className={styles.search}>
          <input type="hidden" name="provider" value={model.provider}/>
          <input name="q" defaultValue={model.query} maxLength={100} aria-label="Caută documente și context comercial" placeholder="Caută documente sau oportunități…" className="focus-ring"/>
          <button type="submit" aria-label="Caută documente" className="focus-ring"><MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true"/></button>
        </form>
        {model.canImport?<Link href="/documents/import" className={styles.meta+" focus-ring underline"}>Importă date în ReveNew</Link>:null}
      </section>
      <nav aria-label="Sursa documentelor" className={styles.tabs}>{[["all","Toate"],["google_drive","Google Drive"],["revenew","ReveNew"]].map(([key,label])=><Link key={key} href={href(key)} aria-current={model.provider===key?"page":undefined} className="focus-ring">{label}</Link>)}</nav>
      <div className={styles.toolbar}><div><p className={styles.eyebrow}>Bibliotecă comercială</p><h2>Surse și documente pregătite</h2></div><p className={styles.meta}>{model.items.length} în această pagină · pagina {model.page}</p></div>
      {model.items.length?<table className={styles.registry} aria-label="Documente comerciale">
        <thead><tr><th className={styles.nameCol} style={{width:"34%"}} scope="col">Document / sursă</th><th className={styles.contextCol} style={{width:"24%"}} scope="col">Context comercial</th><th className={styles.dateCol} style={{width:"22%"}} scope="col">Momente înregistrate</th><th className={styles.stateCol} style={{width:"15%"}} scope="col">Disponibilitate</th><th className={styles.actionCol} style={{width:"5%"}} scope="col"><span className="sr-only">Acțiuni</span></th></tr></thead>
        <tbody>{model.items.map(item=><tr key={item.kind+":"+item.id}>
          <td><div className={styles.identity}><DocumentTypeIcon mime={item.mime}/><div className="min-w-0"><Link href={item.detailHref} className="focus-ring">{item.title}</Link><p className={styles.meta}>{item.provider==="google_drive"?"Google Drive":"ReveNew"} · {documentMimeLabel(item.mime)} · {item.commercialType}</p><div className={styles.mobileContext}><Link href={item.linkedContext.href} className={styles.meta+" focus-ring"}>{item.linkedContext.title}</Link><p className={styles.meta}>{item.status}</p></div></div></div></td>
          <td className={styles.contextCol}><Link href={item.linkedContext.href} className={styles.contextLink+" focus-ring"}>{item.linkedContext.title}</Link><p className={styles.meta}>Oportunitate asociată</p></td>
          <td className={styles.dateCol}><p>{item.sourceModifiedAt?formatProductDateTime(item.sourceModifiedAt):"Dată necunoscută"}</p><p className={styles.meta}>{item.provider==="google_drive"?"Modificare raportată de sursă":"Ultima modificare internă"}</p>{item.provider==="google_drive"?<p className={styles.meta}>Încercare sincronizare: {item.lastSyncedAt?formatProductDateTime(item.lastSyncedAt):"neînregistrată"}</p>:null}</td>
          <td className={styles.stateCol}><span className={styles.status}>{item.status}</span><p className={styles.meta}>{item.provider==="google_drive"?"Accesul actual se verifică separat":"Stare internă a documentului"}</p></td>
          <td><DriveSourceActions id={item.id} title={item.title} detailHref={item.detailHref} sourceHref={item.sourceHref} canSync={item.availableActions.sync} canRemove={item.availableActions.remove}/></td>
        </tr>)}</tbody>
      </table>:<section className={styles.notice}><h2>{model.query?"Niciun document găsit":"Niciun document disponibil"}</h2><p>{model.query?"Încearcă un alt nume sau elimină filtrul de sursă.":"Selectează o sursă din Drive în contextul unei oportunități sau pregătește un document în oportunitate."}</p>{model.query||model.provider!=="all"?<Link className="focus-ring underline" href="/documents">Elimină filtrele</Link>:null}</section>}
      <div className={styles.footer}><p className={styles.meta}>Textul extras este o copie salvată. Starea unui document nu confirmă trimiterea sau venitul.</p><nav aria-label="Paginare documente" className="flex gap-4">{model.page>1?<Link className="focus-ring" href={href(model.provider,model.page-1)}>← Anterior</Link>:null}{model.hasMore?<Link className="focus-ring" href={href(model.provider,model.page+1)}>Următor →</Link>:null}</nav></div>
    </div>
  </PageShell>;
}
