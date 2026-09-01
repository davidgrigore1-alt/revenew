import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { WorkspaceDecisionItem, WorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";
import { formatCurrency, formatDate } from "@/lib/utils";

type SectionKey = "attention" | "prepared" | "waiting" | "approvals";

const sectionCopy: Record<SectionKey, { eyebrow: string; title: string; empty: string }> = {
  attention: { eyebrow: "Necesită atenție", title: "Intervenții cu prioritate", empty: "Nu există situații care cer intervenție imediată." },
  prepared: { eyebrow: "Pregătit pentru tine", title: "Lucru gata de revizuire", empty: "Nu există lucru pregătit în așteptare." },
  waiting: { eyebrow: "Așteptare legitimă", title: "Nu interveni încă", empty: "Nu există conversații aflate într-o fereastră activă de răspuns." },
  approvals: { eyebrow: "Control uman", title: "Aprobări necesare", empty: "Nu există aprobări comerciale în așteptare." }
};

function sectionFor(item: WorkspaceDecisionItem): SectionKey {
  if (item.type === "waiting_for_client") return "waiting";
  if (item.type === "prepared_work_not_advanced") return "prepared";
  if (item.type === "pending_approval") return "approvals";
  return "attention";
}

function Row({ item, primary = false }: { item: WorkspaceDecisionItem; primary?: boolean }) {
  return <li className={primary ? "border-l-2 border-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))]" : "border-l-2 border-transparent"}><Link href={item.actionHref} className="product-interactive-row focus-ring group grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className={primary ? "truncate text-base" : "truncate text-sm"}>{item.title}</strong><span className={item.severity === "critical" ? "status-pill status-pill-danger" : item.severity === "attention" ? "status-pill status-pill-warning" : "status-pill status-pill-neutral"}>{item.statusLabel}</span></span><span className="mt-1 block truncate text-xs text-[rgb(var(--text-muted))]">{[item.relatedCompanyName, item.relatedOpportunityTitle, item.ownerName].filter(Boolean).join(" · ") || item.reason}</span><span className="mt-1.5 block text-xs leading-5 text-[rgb(var(--text-secondary))]">{item.reason}</span></span>
    <span className="flex shrink-0 items-center gap-3 text-xs text-[rgb(var(--text-muted))]">{primary ? <span className="font-semibold text-[rgb(var(--foreground))]">{item.actionLabel}</span> : null}{item.estimatedValue !== undefined && item.currency ? <span className="tabular-nums">{formatCurrency(item.estimatedValue, item.currency)} estimat</span> : null}{item.dueAt ? <span>{formatDate(item.dueAt)}</span> : null}<ArrowRightIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" /></span>
  </Link></li>;
}

export function TodayExecutionSections({ queue }: { queue: WorkspaceDecisionQueue }) {
  const groups = queue.items.reduce<Record<SectionKey, WorkspaceDecisionItem[]>>((result, item) => {
    result[sectionFor(item)].push(item);
    return result;
  }, { attention: [], prepared: [], waiting: [], approvals: [] });
  const priorityItems = groups.attention.slice(0, 3);
  const priorityTotal = queue.totalCandidates - queue.countsByType.waiting_for_client - queue.countsByType.prepared_work_not_advanced - queue.countsByType.pending_approval;
  return <section aria-labelledby="today-operating-title">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--border))] pb-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Astăzi</p><h2 id="today-operating-title" className="mt-1 text-xl font-semibold">Ce necesită atenție astăzi</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">Vezi ce cere acțiune, ce este deja pregătit și ce poate aștepta în siguranță.</p></div>
      <Link href="/ai" className="focus-ring rounded text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Întreabă ReveNew →</Link>
    </div>
    <section className="mt-4" aria-labelledby="today-attention">
      <div className="flex items-end justify-between gap-3"><div><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Priorități curente</p><h3 id="today-attention" className="mt-1 text-sm font-semibold">Intervenții cu prioritate</h3></div><span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{priorityTotal}</span></div>
      {priorityItems.length ? <ol className="mt-3 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">{priorityItems.map((item, index) => <Row key={item.id} item={item} primary={index === 0} />)}</ol> : <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">{sectionCopy.attention.empty}</p>}
      {priorityTotal > priorityItems.length ? <Link href="#today-restante" className="focus-ring mt-3 inline-flex text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Vezi toate cele {priorityTotal} priorități →</Link> : null}
    </section>
    {(["prepared", "waiting", "approvals"] as SectionKey[]).filter((key) => groups[key].length > 0).length ? <div className="grid grid-cols-1 items-start gap-x-4 xl:grid-cols-2">
      {(["prepared", "waiting", "approvals"] as SectionKey[]).filter((key) => groups[key].length > 0).map((key) => <section key={key} className={`mt-4 border-y border-[rgb(var(--border))] py-3 ${groups[key].length > 3 ? "xl:col-span-2" : ""}`} aria-labelledby={"today-" + key}>
        <div className="flex items-end justify-between gap-3"><div><p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">{sectionCopy[key].eyebrow}</p><h3 id={"today-" + key} className="mt-1 text-sm font-semibold">{sectionCopy[key].title}</h3></div><span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{groups[key].length}</span></div>
        <ol className="mt-3 divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">{groups[key].slice(0, 5).map((item) => <Row key={item.id} item={item} />)}</ol>
      </section>)}
    </div> : null}
    <p className="mt-3 text-xs text-[rgb(var(--text-muted))]">Valorile sunt expuneri estimate și rămân separate pe monedă. Nicio acțiune externă nu este executată din această coadă.</p>
  </section>;
}
