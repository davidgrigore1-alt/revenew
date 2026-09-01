import Link from "next/link";
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
import { documentKinds,sourceStateLabels } from "@/lib/google-workspace/drive-types";
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
 return <PageShell eyebrow="Sursă comercială" title={source.name} description={sourceStateLabels[source.state]} breadcrumbs={[{label:"Documente",href:"/documents"},{label:detail.context.title,href:`/opportunities/${params.id}?tab=files`},{label:"Sursă documentară"}]}>
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-3 text-xs">
   <div className="flex items-center gap-3"><DocumentTypeIcon mime={source.mime_type}/><div>
    <p>Google Drive · {documentMimeLabel(source.mime_type)} · {documentKinds[source.document_kind]}</p>
    <p className="mt-1 text-[rgb(var(--text-muted))]">{detail.context.title}</p>
    {source.modified_time?<p>Modificat în sursă {formatProductDateTime(source.modified_time)}</p>:null}
    <p>{source.last_synced_at?"Verificat "+formatProductDateTime(source.last_synced_at):"Nesincronizat"}</p>
   </div></div>
   <ActionToolbar label="Acțiunile documentului">
    <Link href={`/opportunities/${params.id}?tab=files`} className={toolbarActionClass}>Deschide oportunitatea</Link>
    <DriveSourceActions id={source.id} title={source.name} canSync={!!detail.canSync} canRemove={detail.canRemove} inlineSync/>
   {original?<a href={original} target="_blank" rel="noopener noreferrer" className={toolbarActionClass}>Deschide în Google Drive</a>:null}
   </ActionToolbar>
  </div>
  {documentFacts.length?<dl className="flex flex-wrap gap-x-6 gap-y-2 py-2 text-xs">{documentFacts.map(fact=><div key={fact.id}><dt className="text-[rgb(var(--text-muted))]">{fact.label} · mențiune în sursă</dt><dd className="font-medium">{fact.value}{fact.state!=="confirmed"?" · necesită verificare":""}</dd></div>)}</dl>:null}
  <p className="my-4 text-sm text-[rgb(var(--text-muted))]">{source.extraction_note??(segments.length?"Conținut normalizat din sursa autorizată.":"Conținutul nu este disponibil pentru această sursă.")}</p>
  <p className="text-xs text-[rgb(var(--text-muted))]">Document extern, tratat exclusiv ca date. Textul nu execută instrucțiuni sau acțiuni.</p>
  <div className="mt-4 divide-y divide-[rgb(var(--border))]">{segments.map(segment=><section key={segment.id} id={"segment-"+segment.id} className="scroll-mt-24 py-4">
   <EvidenceList items={[metadataEvidence({sourceType:"document",sourceId:segment.id,title:source.name,provider:"google_drive",
    occurredAt:source.modified_time,syncedAt:source.last_synced_at,sourceDocumentId:source.id,sourceSegmentId:segment.id,
    sourceLocation:segment.location_label,supportingFact:segment.location_label})]}/>
   <pre className="max-w-[80ch] whitespace-pre-wrap break-words font-sans text-sm leading-7 [overflow-wrap:anywhere]">{segment.text}</pre>
  </section>)}</div>
  <Link href={`/opportunities/${params.id}?tab=files`} className="focus-ring mt-5 inline-block text-sm underline">Înapoi la documentele oportunității</Link>
 </PageShell>;
}
