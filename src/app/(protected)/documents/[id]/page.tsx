import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/dashboard/PageShell";
import { RecordSummaryBar } from "@/components/records/RecordSummaryBar";
import { Button } from "@/components/ui/Button";
import { getInternalCommercialDocument } from "@/lib/commercial-documents";
import { formatProductDateTime } from "@/lib/ui/presentation";

export const dynamic = "force-dynamic";

function documentState(status?: string) {
  if (status === "sent") return { label: "Trimis", detail: "Execuție înregistrată", tone: "success" as const };
  if (status === "approved") return { label: "Aprobat", detail: "Nu înseamnă trimis", tone: "attention" as const };
  return { label: "În lucru", detail: "Necesită revizuire umană", tone: "default" as const };
}

export default async function InternalDocumentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const document = await getInternalCommercialDocument(params.id);
  if (!document) notFound();
  const state = documentState(document.status);

  return (
    <PageShell
      wide
      eyebrow="Document comercial"
      title={document.title}
      description="Conținut pregătit în contextul unei oportunități. Starea documentului nu dovedește automat execuția externă."
      breadcrumbs={[{ label: "Documente", href: "/documents" }, { label: document.context.title, href: `/opportunities/${document.context.id}?tab=files` }, { label: document.title }]}
      actions={<Button href={`/opportunities/${document.context.id}?tab=workflow`} variant="secondary">Deschide oportunitatea</Button>}
    >
      <div className="grid gap-5">
        <RecordSummaryBar label="Starea și contextul documentului" items={[
          { label: "Tip", value: document.type },
          { label: "Stare", value: state.label, detail: state.detail, tone: state.tone },
          { label: "Oportunitate", value: document.context.title, detail: "Asociere comercială explicită" },
          { label: "Actualizat", value: document.updatedAt ? formatProductDateTime(document.updatedAt) : "Neconfirmat" },
          { label: "Control", value: document.status === "sent" ? "Execuție înregistrată" : "Acțiune umană necesară" }
        ]} />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <article aria-labelledby="document-content-heading" className="product-work-surface min-w-0 p-4 sm:p-5">
            <p className="text-micro font-semibold text-[rgb(var(--text-muted))]">CONȚINUT</p>
            <h2 id="document-content-heading" className="mt-1 text-section-title font-semibold">Document pregătit</h2>
            <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 [overflow-wrap:anywhere]">{document.body || "Documentul nu are încă un conținut."}</pre>
            </div>
          </article>

          <aside aria-labelledby="document-next-action" className="border-l-2 border-[rgb(var(--interaction))] px-4 py-1">
            <p className="text-micro font-semibold text-[rgb(var(--text-muted))]">URMĂTOAREA ACȚIUNE</p>
            <h2 id="document-next-action" className="mt-1 text-sm font-semibold">{document.status === "sent" ? "Verifică rezultatul în oportunitate" : "Revizuiește în context comercial"}</h2>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{document.status === "approved" ? "Documentul este aprobat, dar această stare nu confirmă trimiterea." : document.status === "sent" ? "Starea trimis indică execuția înregistrată; rezultatul comercial se confirmă separat." : "Documentul rămâne lucru pregătit până la o decizie și o execuție explicită."}</p>
            <Link href={`/opportunities/${document.context.id}?tab=files`} className="focus-ring mt-4 inline-flex min-h-9 items-center text-xs font-semibold text-[rgb(var(--interaction))] hover:underline">Vezi documentele oportunității →</Link>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
