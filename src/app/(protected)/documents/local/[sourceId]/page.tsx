import { redirect, notFound } from "next/navigation";
import { getLocalDocument } from "@/lib/documents/local-documents";
export const dynamic="force-dynamic";
export default async function LocalSourcePage({params}:{params:Promise<{sourceId:string}>}) {
 const {sourceId}=await params;const doc=await getLocalDocument(sourceId);if(!doc)notFound();
 redirect(`/documents/local/${sourceId}/versions/${doc.version.id}`);
}
