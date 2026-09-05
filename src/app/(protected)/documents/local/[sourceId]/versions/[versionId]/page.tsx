import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { StructuredGrid } from "@/components/documents/StructuredGrid";
import { LocalDocumentActions } from "@/components/documents/LocalDocumentActions";
import { CopilotConversation } from "@/components/intelligence/CopilotConversation";
import { getLocalDocument } from "@/lib/documents/local-documents";
import { localDocumentState } from "@/lib/documents/local-document-core";
import { requirePermission } from "@/lib/authz/require-permission";
import { hasPermission } from "@/lib/authz/has-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatProductDateTime } from "@/lib/ui/presentation";
import styles from "@/components/documents/Documents.module.css";
export const dynamic="force-dynamic";
export default async function LocalDocumentPage({params}:{params:Promise<{sourceId:string;versionId:string}>}) {
  const {sourceId,versionId}=await params;const document=await getLocalDocument(sourceId,versionId);if(!document)notFound();
  const auth=await requirePermission("documents.read");const {version,source,segments}=document;
  const ready=source.state==="active"&&version.state==="ready";const route=`/documents/local/${sourceId}/versions/${versionId}`;
  const client=await createSupabaseServerClient();
  const options=hasPermission(auth,"documents.update")?await client!.from("opportunities").select("id,title").eq("business_id",source.business_id).order("title").limit(100):{data:[]};
  const versions=await client!.from("local_document_versions").select("id,created_at,state").eq("source_id",sourceId).eq("business_id",source.business_id).order("created_at",{ascending:false}).limit(100);
  return <PageShell wide eyebrow="Document păstrat" title={version.original_filename} description={`${localDocumentState(version.state)} · CSV · ${version.byte_size?Math.ceil(version.byte_size/1024)+" KB":"dimensiune neconfirmată"}`}
    breadcrumbs={[{label:"Documente",href:"/documents"},{label:"Document"}]} actions={ready?<Button href="#document-intelligence">Întreabă ReveNew</Button>:undefined}>
    <div className={styles.workspace}>
      {ready?<>
        <div className={styles.toolbar}><p className={styles.meta}>Original păstrat · {version.row_count} rânduri · {version.column_count} coloane</p><a className="focus-ring text-sm underline" href={`/api/documents/local/${sourceId}/versions/${versionId}/download`}>Descarcă originalul</a></div>
        <section id="structured-preview"><StructuredGrid rows={segments.map(s=>s.cells)} headers={version.headers??[]} firstRow={2} label="Versiunea salvată · tabel original"/></section>
        <section id="document-intelligence" className={styles.section}><p className={styles.eyebrow}>Inteligență operațională</p><h2>Întreabă despre acest document</h2><p className={styles.meta}>ReveNew consultă fragmente autorizate din această versiune și arată rândurile folosite. Informația din fișier rămâne o afirmație a sursei.</p><CopilotConversation className="mt-5" lockedContext={{route,pageType:"other",documentSourceId:sourceId,documentVersionId:versionId}} contextLabel={version.original_filename} initialSuggestions={["Rezumă documentul.","Ce companii sunt menționate?"]}/></section>
        {hasPermission(auth,"signals.create")?<details className={styles.section}><summary className="focus-ring cursor-pointer font-semibold">Import opțional în ReveNew</summary><p className={styles.meta}>Documentul rămâne păstrat indiferent dacă imporți. Creează doar semnalele pe care le verifici și le confirmi.</p><Link href={`${route}/import`} className="focus-ring mt-3 inline-block text-sm underline">Importă date în ReveNew →</Link></details>:null}
      </>:<section className={styles.notice} role="status"><h2>{localDocumentState(version.state)}</h2><p>{source.state==="deleted"?"Originalele și conținutul extras au fost șterse. A rămas istoricul operațiunii.":source.state==="deletion_pending"?"Documentul nu mai poate fi analizat. Ștergerea originalelor nu este încă confirmată; reîncearcă ștergerea.":"Disponibilitatea originalului nu este încă verificată. Reîncearcă verificarea sau încarcă o versiune nouă. Nu au fost importate înregistrări."}</p></section>}
      <details className={styles.section}><summary className="focus-ring cursor-pointer font-semibold">Proveniență și versiuni</summary><dl className="mt-3 grid gap-3 break-all text-sm"><div><dt className={styles.meta}>Rezervat</dt><dd>{formatProductDateTime(version.created_at)}</dd></div><div><dt className={styles.meta}>Original verificat și extras</dt><dd>{version.finalized_at?formatProductDateTime(version.finalized_at):"Neconfirmat"}</dd></div><div><dt className={styles.meta}>Versiune · SHA-256</dt><dd>{version.id} · {version.content_hash??"Neconfirmat"}</dd></div><div><dt className={styles.meta}>Profilul care a adăugat versiunea</dt><dd>{version.uploader_profile_id}</dd></div><div><dt className={styles.meta}>Extragere</dt><dd>{version.parser_version??"Neconfirmată"} · {segments.length}/{version.row_count??"?"} rânduri disponibile. Rândul 1 este antetul; numerele reprezintă rânduri logice CSV.</dd></div></dl><div className="mt-4 grid gap-2">{versions.data?.map(v=><Link key={v.id} href={`/documents/local/${sourceId}/versions/${v.id}`} className="focus-ring text-sm underline">{formatProductDateTime(v.created_at)} · {localDocumentState(v.state)}{v.id===versionId?" · versiunea deschisă":""}</Link>)}</div></details>
      {source.opportunity_id?<Link className="focus-ring text-sm underline" href={`/opportunities/${source.opportunity_id}`}>Deschide oportunitatea asociată →</Link>:<p className={styles.meta}>Document de lucru al firmei · fără asociere comercială.</p>}
      {hasPermission(auth,"documents.update")?<LocalDocumentActions sourceId={sourceId} versionId={versionId} state={version.state} opportunityId={source.opportunity_id} opportunities={options.data??[]}/>:null}
    </div>
  </PageShell>;
}
