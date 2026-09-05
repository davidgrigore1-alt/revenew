import Link from "next/link";
import { DocumentTypeIcon } from "@/components/documents/DocumentTypeIcon";
import { ArrowUpRightIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon, BoltIcon, BuildingOffice2Icon, UserIcon } from "@heroicons/react/24/outline";
import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";
import { evidenceHref, evidenceSourceLabels, type EvidenceReference } from "@/lib/evidence-reference";
import { formatProductDateTime } from "@/lib/ui/presentation";

function EvidenceRow({ item }: { item: EvidenceReference }) {
  const href = evidenceHref(item.entityHref);
  if (item.provider === "google_drive") return <li className="flex min-w-0 items-start gap-2.5 py-2.5">
    {item.mimeType ? <DocumentTypeIcon mime={item.mimeType}/> : <IntegrationBrandIcon provider="google_drive" size="small" />}
    <div className="min-w-0 flex-1">
      {href ? <Link href={href} className="focus-ring block truncate rounded text-xs font-medium leading-5 hover:underline">{item.title}</Link> : <p className="truncate text-xs font-medium leading-5">{item.title}</p>}
      <p className="truncate text-[11px] leading-4 text-[rgb(var(--text-muted))]" title={item.syncedAt ? "Sincronizat " + formatProductDateTime(item.syncedAt) : undefined}>
        {item.sourceLocation ?? "Sursă documentară"}{item.occurredAt ? " · " + formatProductDateTime(item.occurredAt, { year: false }) : ""}
      </p>
      <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Copie extrasă{item.sourceVersion?" · versiune "+item.sourceVersion:""} · acces actual de verificat</p>
    </div>
  </li>;
  const Icon = item.sourceType === "document" ? DocumentTextIcon : item.sourceType === "action" || item.sourceType === "approval" ? CheckCircleIcon
    : item.sourceType === "signal" ? BoltIcon : item.sourceType === "opportunity" ? BuildingOffice2Icon : item.sourceType === "contact" ? UserIcon : ClockIcon;
  return <li className="flex min-w-0 gap-2.5 py-2.5">
    {item.provider ? <IntegrationBrandIcon provider={item.provider} size="small" /> : <span className="grid h-6 w-6 shrink-0 place-items-center text-[rgb(var(--text-muted))]"><Icon className="h-4 w-4" aria-hidden="true" /></span>}
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px] leading-4 text-[rgb(var(--text-muted))]">
        <span>{evidenceSourceLabels[item.sourceType]}</span>
        {item.occurredAt ? <time dateTime={item.occurredAt}>{formatProductDateTime(item.occurredAt, { year: false })}</time> : <span>Dată neconfirmată</span>}
      </div>
      {href ? <Link href={href} className="focus-ring mt-0.5 inline-flex max-w-full items-start gap-1 rounded text-xs font-medium leading-5 hover:underline">
        <span className="break-words [overflow-wrap:anywhere]">{item.title}</span><ArrowUpRightIcon className="mt-1 h-3 w-3 shrink-0 text-[rgb(var(--text-muted))]" aria-hidden="true" />
      </Link> : <p className="mt-0.5 break-words text-xs font-medium leading-5 [overflow-wrap:anywhere]">{item.title}</p>}
      {item.supportingFact ? <p className="mt-0.5 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.supportingFact}</p> : null}
      {item.visibility === "authorized_content" ? <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.excerpt}</p> : null}
    </div>
  </li>;
}

/** Shared evidence presentation, independent of the originating workspace. */
export function EvidenceList({ items, limit = 4, label = "Dovezi" }: { items: EvidenceReference[]; limit?: number; label?: string }) {
  if (!items.length) return <p className="py-3 text-xs text-[rgb(var(--text-muted))]">Nu există surse disponibile pentru această secțiune.</p>;
  const render = (rows: EvidenceReference[]) => <ul aria-label={label} className="divide-y divide-[rgb(var(--border))]">{rows.map((item) => <EvidenceRow key={item.sourceType + ":" + item.sourceId} item={item} />)}</ul>;
  return <div>{render(items.slice(0, limit))}{items.length > limit ? <details className="border-t border-[rgb(var(--border))]">
    <summary className="focus-ring cursor-pointer py-2 text-xs text-[rgb(var(--text-muted))]">{label === "Dovezi" ? "Vezi toate dovezile" : "Vezi toată activitatea"} ({items.length})</summary>
    {render(items.slice(limit))}
  </details> : null}</div>;
}
