import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/dashboard/PageShell";
import { getInternalCommercialDocument } from "@/lib/commercial-documents";
import { formatProductDateTime } from "@/lib/ui/presentation";
export const dynamic="force-dynamic";
export default async function InternalDocumentPage({params}:{params:{id:string}}){
 const document=await getInternalCommercialDocument(params.id);if(!document)notFound();
 return <PageShell eyebrow="Documente" title={document.title} description={document.type}
  breadcrumbs={[{label:"Documente",href:"/documents"},{label:document.context.title,href:`/opportunities/${document.context.id}?tab=files`},{label:"Document intern"}]}
  actions={<Link className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-2 text-xs" href={`/opportunities/${document.context.id}?tab=workflow`}>Deschide oportunitatea</Link>}>
  <p className="border-b border-[rgb(var(--border))] pb-3 text-xs text-[rgb(var(--text-muted))]">ReveNew{document.updatedAt?" · Modificat "+formatProductDateTime(document.updatedAt):""}</p>
  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 [overflow-wrap:anywhere]">{document.body||"Documentul nu are încă un conținut."}</pre>
 </PageShell>;
}
