import Link from "next/link";
import { DocumentContextualAsk } from "@/components/documents/DocumentContextualAsk";
import { ActionToolbar,toolbarActionClass } from "@/components/ui/ActionToolbar";
import { getCommercialTruthForOpportunity } from "@/lib/commercial-truth-server";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { DocumentTypeIcon,documentMimeLabel } from "@/components/documents/DocumentTypeIcon";
import { DriveSourceActions } from "@/components/documents/DriveSourceActions";
import { formatProductDateTime } from "@/lib/ui/presentation";
import { EvidenceList } from "@/components/evidence/EvidenceList";
import { requirePermission } from "@/lib/authz/require-permission";
import { getDocumentSourceDetail } from "@/lib/google-workspace/drive";
import { documentKinds } from "@/lib/google-workspace/drive-types";
import { documentCapabilities,documentSourceState,decodeStoredSheet } from "@/lib/documents/capabilities";
import { StructuredGrid } from "@/components/documents/StructuredGrid";
import styles from "@/components/documents/Documents.module.css";
import { metadataEvidence, safeOriginalEvidenceHref } from "@/lib/evidence-reference";
export const dynamic="force-dynamic";
export default async function SourcePage(props:{params: Promise<{id:string;sourceId:string}>}) {
 const params = await props.params;
 await requirePermission("documents.read");
 const detail=await getDocumentSourceDetail(params.sourceId);
 if(!detail||detail.source.opportunity_id!==params.id)notFound();
 const truth=await getCommercialTruthForOpportunity(params.id).catch(()=>null);
 const documentFacts=truth?.claims.filter(claim=>["commercial_value","offer_deadline"].includes(claim.type)&&claim.evidence.some(e=>e.sourceDocumentId===params.sourceId)).slice(0,2)??[];
 const {source,segments}=detail;const original=safeOriginalEvidenceHref(source.web_view_link??undefined);
 const state=documentSourceState(source.state);
 const capabilities=documentCapabilities({mime:source.mime_type,state:source.state,hasText:segments.length>0,hasOriginal:!!original,canVerify:!!detail.canSync});
 return <PageShell wide eyebrow="Sursă comercială" title={source.name} description={state.label} breadcrumbs={[{label:"Documente",href:"/documents"},{label:detail.context.title,href:`/opportunities/${params.id}?tab=files`},{label:"Sursă documentară"}]}><div className={styles.workspace}>
  <div className="flex flex-wrap items-start justify-between gap-5 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-4 sm:px-5">
   <div className="flex min-w-0 items-start gap-3"><DocumentTypeIcon mime={source.mime_type}/><div className="min-w-0">
    <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Google Drive · {documentMimeLabel(source.mime_type)}</p>
    <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
     <div><dt className="text-[rgb(var(--text-faint))]">Context comercial</dt><dd className="mt-0.5 font-medium text-[rgb(var(--text-secondary))]">{detail.context.title}</dd></div>
     <div><dt className="text-[rgb(var(--text-faint))]">Tip document</dt><dd className="mt-0.5 font-medium text-[rgb(var(--text-secondary))]">{documentKinds[source.document_kind]}</dd></div>
     {source.modified_time?<div><dt className="text-[rgb(var(--text-faint))]">Modificat în sursă</dt><dd className="mt-0.5 font-medium text-[rgb(var(--text-secondary))]">{formatProductDateTime(source.modified_time)}</dd></div>:null}
     <div><dt className="text-[rgb(var(--text-muted))]">Ultima încercare de sincronizare</dt><dd>{source.last_synced_at?formatProductDateTime(source.last_synced_at):"Neînregistrată"}</dd></div>
     <div><dt className="text-[rgb(var(--text-muted))]">Selectat în ReveNew</dt><dd>{source.created_at?formatProductDateTime(source.created_at):"Dată necunoscută"}</dd></div>
     <div><dt className="text-[rgb(var(--text-muted))]">Versiune raportată de sursă</dt><dd>{source.provider_version??"Necunoscută"}</dd></div>
    </dl>
   </div></div>
   <ActionToolbar label="Acțiunile documentului">
    <Link href={`/opportunities/${params.id}?tab=files`} className={toolbarActionClass}>Deschide oportunitatea</Link>
    <DriveSourceActions id={source.id} title={source.name} canSync={!!detail.canSync} canRemove={detail.canRemove} inlineSync/>
   {original?<a href={original} target="_blank" rel="noopener noreferrer" className={toolbarActionClass}>Deschide în Google Drive</a>:null}
   </ActionToolbar>
  </div>
  <DocumentContextualAsk opportunityId={params.id} contextTitle={detail.context.title}/>
  <section className={styles.notice} aria-label="Disponibilitate și acoperire"><h2>{capabilities.coverage}</h2><p>{state.detail}</p><p className={styles.meta}>Modificarea și selectarea nu sunt verificări comerciale. {capabilities.verify?"Sincronizarea verifică accesul și încearcă o nouă extracție.":"Sincronizarea nu este disponibilă pentru acest cont, rol sau conexiune."}</p></section>
  {documentFacts.length?<dl className="flex flex-wrap gap-x-8 gap-y-3 border-b border-[rgb(var(--border))] px-1 py-4 text-xs">{documentFacts.map(fact=><div key={fact.id}><dt className="text-[rgb(var(--text-muted))]">{fact.label} · mențiune în sursă</dt><dd className="mt-0.5 font-semibold">{fact.value}{fact.state!=="confirmed"?" · necesită verificare":""}</dd></div>)}</dl>:null}
  <section className="py-5" aria-labelledby="source-content-title"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Conținut extras</p><h2 id="source-content-title" className="mt-1 text-base font-semibold">Text disponibil pentru verificare</h2>
  <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{source.extraction_note??(segments.length?"Conținut normalizat din sursa autorizată.":"Conținutul nu este disponibil pentru această sursă.")}</p>
  <p className="mt-2 max-w-3xl text-xs leading-5 text-[rgb(var(--text-faint))]">Document extern, tratat exclusiv ca date. Textul nu execută instrucțiuni sau acțiuni.</p></section>
  <div className="divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">{segments.map(segment=><section key={segment.id} id={"segment-"+segment.id} className="scroll-mt-24 px-1 py-5 sm:px-3 sm:py-6">
   <EvidenceList items={[metadataEvidence({sourceType:"document",sourceId:segment.id,title:source.name,provider:"google_drive",
    occurredAt:source.modified_time,syncedAt:source.last_synced_at,sourceDocumentId:source.id,sourceSegmentId:segment.id,
    sourceLocation:segment.location_label,supportingFact:segment.location_label})]}/>
   {capabilities.grid&&decodeStoredSheet(segment.text)?<div className="mt-4"><StructuredGrid rows={decodeStoredSheet(segment.text)!} label={segment.location_label} firstRow={Number(/rândurile (\d+)/.exec(segment.location_label)?.[1]??1)}/></div>:<pre className="mt-3 max-w-[76ch] whitespace-pre-wrap break-words font-sans text-[0.9375rem] leading-7 text-[rgb(var(--text-secondary))] [overflow-wrap:anywhere]">{segment.text}</pre>}
  </section>)}</div>
  <Link href={`/opportunities/${params.id}?tab=files`} className="focus-ring mt-5 inline-block text-sm underline">Înapoi la documentele oportunității</Link>
 </div></PageShell>;
}
