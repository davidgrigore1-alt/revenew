import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  UserCircleIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import type { PreparedWorkItem } from "@/lib/prepared-work";
import { formatProductCurrency, formatProductDate, formatProductDateTime } from "@/lib/ui/presentation";

const statusLabels: Record<PreparedWorkItem["status"], string> = {
  prepared: "Pregătit",
  ready_for_review: "Gata de revizuire",
  approved: "Aprobat",
  rejected: "Respins",
  executed: "Executat",
  expired: "Expirat"
};

const typeLabels: Record<PreparedWorkItem["type"], string> = {
  prepared_email: "Mesaj pregătit",
  prepared_task: "Task pregătit",
  prepared_next_action: "Următoare acțiune",
  prepared_owner_assignment: "Propunere de responsabil",
  prepared_opportunity_update: "Document comercial",
  prepared_meeting_brief: "Brief de întâlnire",
  prepared_followup_plan: "Plan de follow-up"
};

function ContextLink({ href, children }: { href?: string; children: React.ReactNode }) {
  return href ? <Link href={href} className="focus-ring rounded-sm font-semibold text-[rgb(var(--foreground))] hover:underline">{children}</Link> : <>{children}</>;
}

export function ActionPreview({ item, compact = false }: { item: PreparedWorkItem; compact?: boolean }) {
  if (compact) {
    return (
      <section aria-labelledby={"prepared-work-" + item.id} className="overflow-hidden rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">{typeLabels[item.type]}</p>
            <h3 id={"prepared-work-" + item.id} className="mt-1 truncate text-sm font-semibold">{item.title}</h3>
            <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{item.target.label}</p>
          </div>
          <span className={item.status === "approved" ? "status-pill status-pill-success" : "status-pill status-pill-warning"}>{statusLabels[item.status]}</span>
        </div>
        <div className="border-t border-[rgb(var(--border))] px-4 py-3">
          <Button href={item.reviewHref} variant="secondary" size="small">{item.reviewLabel}</Button>
        </div>
      </section>
    );
  }

  const hasEstimatedValue = item.estimatedValueLow !== undefined || item.estimatedValueHigh !== undefined;
  const value = item.estimatedValueHigh ?? item.estimatedValueLow;
  return (
    <article aria-labelledby={"prepared-work-" + item.id} className="overflow-hidden rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] xl:flex xl:max-h-[calc(100dvh-17rem)] xl:flex-col">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-[rgb(var(--border))] px-5 py-3.5">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--primary))]"><DocumentTextIcon className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">{typeLabels[item.type]}</p>
            <h2 id={"prepared-work-" + item.id} className="mt-1 text-base font-semibold">{item.title}</h2>
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{item.preparedAt ? `Actualizat ${formatProductDateTime(item.preparedAt, { year: false })}` : "Momentul pregătirii nu este confirmat"}</p>
          </div>
        </div>
        <span className={item.status === "approved" ? "status-pill status-pill-success" : "status-pill status-pill-warning"}><CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />{statusLabels[item.status]}</span>
      </header>

      <div className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,.55fr)] xl:overflow-y-auto xl:overscroll-contain">
        <div className="min-w-0 p-5">
          <section aria-labelledby={"prepared-proposal-" + item.id}>
            <p id={"prepared-proposal-" + item.id} className="text-xs font-semibold text-[rgb(var(--text-muted))]">Ce a pregătit ReveNew</p>
            <p className="mt-2 max-w-[46rem] whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--text-secondary))]">{item.proposal}</p>
          </section>

          <section className="mt-5 border-t border-[rgb(var(--border))] pt-4" aria-labelledby={"prepared-why-" + item.id}>
            <h3 id={"prepared-why-" + item.id} className="text-sm font-semibold">De ce există</h3>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{item.reason || "Nu există un motiv persistent asociat direct acestui document. ReveNew nu îl deduce din text sau din denumire."}</p>
          </section>

          <section className="mt-5 border-t border-[rgb(var(--border))] pt-4" aria-labelledby={"prepared-evidence-" + item.id}>
            <h3 id={"prepared-evidence-" + item.id} className="text-sm font-semibold">Susținut de</h3>
            {item.evidence.length ? <ul className="mt-3 grid gap-3">{item.evidence.map((source) => <li key={source.id} className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5"><p className="font-semibold">{source.href ? <Link href={source.href} className="focus-ring rounded-sm hover:underline">{source.label}</Link> : source.label}</p>{source.description ? <p className="mt-1 text-[rgb(var(--text-muted))]">{source.description}</p> : null}{source.occurredAt ? <p className="mt-1 text-[rgb(var(--text-faint))]">{formatProductDateTime(source.occurredAt)}</p> : null}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există dovezi persistente asociate direct acestui document.</p>}
            <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Proveniență:</strong> {item.provenance.label}{item.provenance.createdAt ? ` · ${formatProductDateTime(item.provenance.createdAt)}` : ""}. Documentul este rezultatul pregătit, nu dovada motivului comercial.</p>
          </section>
        </div>

        <aside className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5 lg:border-l lg:border-t-0">
          <h3 className="text-sm font-semibold">Context autorizat</h3>
          <dl className="mt-4 grid gap-3 text-xs leading-5">
            <div><dt className="text-[rgb(var(--text-muted))]">Oportunitate</dt><dd><ContextLink href={item.target.href}>{item.target.label}</ContextLink></dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Companie</dt><dd>{item.company ? <ContextLink href={item.company.href}>{item.company.label}</ContextLink> : "Neasociată în datele curente"}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Contact</dt><dd>{item.contact ? <ContextLink href={item.contact.href}>{item.contact.label}</ContextLink> : "Neasociat în datele curente"}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Responsabil</dt><dd className="flex items-center gap-1.5">{item.owner ? <><UserCircleIcon className="h-4 w-4 text-[rgb(var(--text-muted))]" aria-hidden="true" />{item.owner.label}</> : "Neatribuit"}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Termen</dt><dd className="flex items-center gap-1.5">{item.deadline ? <><ClockIcon className="h-4 w-4 text-[rgb(var(--text-muted))]" aria-hidden="true" />{formatProductDate(item.deadline)}</> : "Neconfirmat"}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">Valoare estimată, neconfirmată</dt><dd className="font-semibold tabular-nums">{hasEstimatedValue ? formatProductCurrency(value, item.currency) : "Valoare neconfirmată"}</dd><p className="text-[rgb(var(--text-faint))]">Moneda originală: {item.currency}. Nu reprezintă venit confirmat și nu este agregată aici.</p></div>
          </dl>

          <section className="mt-5 border-t border-[rgb(var(--border))] pt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold"><ShieldCheckIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />Limita acțiunii</p>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.willNotChange.map((value) => <li key={value}>— {value}</li>)}</ul>
          </section>
        </aside>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] px-5 py-3.5">
        <div>
          <p className="text-xs font-semibold text-[rgb(var(--foreground))]">Neexecutat · necesită acțiune umană</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{item.editable ? "Ai drept de actualizare în destinația sigură." : "Poți citi contextul; actualizarea nu este disponibilă pentru acest tip sau rol."}</p>
        </div>
        <Button href={item.reviewHref} variant="secondary" size="small">{item.editable ? <PencilSquareIcon className="h-4 w-4" aria-hidden="true" /> : null}{item.reviewLabel}</Button>
      </footer>
    </article>
  );
}
