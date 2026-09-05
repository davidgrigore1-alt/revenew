import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { SavedDocumentImport } from "@/components/documents/SavedDocumentImport";
import { getLocalDocument } from "@/lib/documents/local-documents";
import { requirePermission } from "@/lib/authz/require-permission";
export default async function ImportSavedDocument({params}:{params:Promise<{sourceId:string;versionId:string}>}) {
 await requirePermission("signals.create");const {sourceId,versionId}=await params;const doc=await getLocalDocument(sourceId,versionId);if(!doc||doc.source.state!=="active"||doc.version.state!=="ready")notFound();
 const href=`/documents/local/${sourceId}/versions/${versionId}`;
 return <PageShell wide eyebrow="Document păstrat" title="Importă date în ReveNew" description="Importul este opțional. Originalul rămâne păstrat dacă închizi această pagină."><Link className="focus-ring mb-6 inline-block text-sm underline" href={href}>← Înapoi la document</Link><SavedDocumentImport workbook={doc.version.workbook} versionId={versionId} csv={{headers:doc.version.headers??[],rows:doc.segments.map(s=>s.cells),delimiter:","}} name={doc.version.original_filename} bytes={doc.version.byte_size??0} href={href}/></PageShell>;
}
