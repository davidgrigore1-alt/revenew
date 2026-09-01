import Link from "next/link";
import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";
import { StatusPill } from "@/components/ui/StatusPill";
import type { CompanyBusinessMemory, CompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { formatDate } from "@/lib/utils";

type ExternalEmail = { id: string; sent_at: string; direction: "inbound" | "outbound"; sender_name: string | null; sender_email: string | null; subject: string | null; excerpt: string | null };
type ExternalEvent = { id: string; title: string | null; starts_at: string; ends_at: string; event_status: string | null };

type Props = {
  memory: CompanyBusinessMemory;
  opportunities: CompanyIntelligenceSnapshot["opportunities"];
  emails: ExternalEmail[];
  events: ExternalEvent[];
};

const dateTime = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });

export function CompanyExecutionWorkspace({ memory, opportunities, emails, events }: Props) {
  const tasks = opportunities.filter((item) => item.nextActionTitle).slice(0, 6);
  const gaps = memory.criticalGaps.slice(0, 4);
  const loops = memory.openLoops.slice(0, 5);
  return (
    <section aria-label="Execuția comercială a companiei" className="grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
      <div className="min-w-0 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
        <header className="flex flex-wrap items-end justify-between gap-3 py-4">
          <div><p className="product-eyebrow">Execuție curentă</p><h2 className="mt-1 text-lg font-semibold">Ce așteaptă o decizie sau un pas următor</h2></div>
          <span className="text-xs tabular-nums text-[rgb(var(--text-faint))]">{loops.length + gaps.length} situații explicabile</span>
        </header>
        {loops.map((item) => <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
          <ClockIcon className="mt-0.5 h-5 w-5 text-[rgb(var(--warning))]" aria-hidden="true" />
          <div className="min-w-0"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{item.description}</p>{item.whyItMatters ? <p className="mt-1 text-xs text-[rgb(var(--text-faint))]">De ce contează: {item.whyItMatters}</p> : null}</div>
          {item.href ? <Link className="focus-ring self-start text-sm font-semibold text-[rgb(var(--primary))] hover:underline" href={item.href}>{item.actionLabel}</Link> : null}
        </article>)}
        {gaps.map((gap) => <article key={gap.code} className="grid gap-3 py-4 sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-[rgb(var(--warning))]" aria-hidden="true" />
          <div><h3 className="font-semibold">{gap.label}</h3><p className="mt-1 text-xs text-[rgb(var(--text-faint))]">Lipsă deterministă în contextul comercial autorizat.</p></div>
          <Link className="focus-ring self-start text-sm font-semibold text-[rgb(var(--primary))] hover:underline" href={gap.href}>{gap.actionLabel}</Link>
        </article>)}
        {!loops.length && !gaps.length ? <div className="flex items-start gap-3 py-6"><CheckCircleIcon className="h-5 w-5 text-[rgb(var(--success))]" aria-hidden="true" /><div><h3 className="font-semibold">Nicio lipsă critică detectată</h3><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">ReveNew nu a identificat acum un blocaj care cere intervenție.</p></div></div> : null}
      </div>

      <aside className="grid content-start gap-6">
        <section aria-labelledby="company-tasks-title">
          <div className="flex items-center justify-between gap-3"><h2 id="company-tasks-title" className="text-sm font-semibold">Următorii pași</h2><StatusPill tone={tasks.length ? "warning" : "success"}>{tasks.length}</StatusPill></div>
          <div className="mt-3 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
            {tasks.map((item) => <Link key={item.id} href={item.href} className="product-interactive-row focus-ring block py-3"><span className="block truncate text-sm font-semibold">{item.nextActionTitle}</span><span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">{item.title} · {item.ownerName || "Fără responsabil"}{item.nextActionDueAt ? ` · ${formatDate(item.nextActionDueAt)}` : ""}</span></Link>)}
            {!tasks.length ? <p className="py-4 text-sm text-[rgb(var(--text-muted))]">Niciun pas următor explicit.</p> : null}
          </div>
        </section>

        <section aria-labelledby="company-connected-title">
          <div className="flex items-center gap-2"><IntegrationBrandIcon provider="gmail" size="small" /><h2 id="company-connected-title" className="text-sm font-semibold">Context conectat privat</h2></div>
          <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Vizibil numai utilizatorului care a autorizat conexiunea Google.</p>
          <div className="mt-3 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
            {emails.slice(0, 3).map((email) => <Link key={email.id} href={`/inbox?email=${email.id}`} className="product-interactive-row focus-ring block py-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{email.subject || "Fără subiect"}</span><time className="shrink-0 text-[0.6875rem] text-[rgb(var(--text-faint))]" dateTime={email.sent_at}>{dateTime.format(new Date(email.sent_at))}</time></div><p className="mt-1 line-clamp-1 text-xs text-[rgb(var(--text-muted))]">{email.direction === "inbound" ? "Primit" : "Trimis"} · {email.sender_name || email.sender_email || "Identitate neconfirmată"}</p></Link>)}
            {events.slice(0, 2).map((event) => <div key={event.id} className="flex items-start gap-3 py-3"><CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--info-text))]" aria-hidden="true" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{event.title || "Întâlnire"}</p><time className="mt-1 block text-xs text-[rgb(var(--text-muted))]" dateTime={event.starts_at}>{dateTime.format(new Date(event.starts_at))}</time></div></div>)}
            {!emails.length && !events.length ? <p className="py-4 text-sm text-[rgb(var(--text-muted))]">Niciun email sau eveniment legat explicit de această companie.</p> : null}
          </div>
        </section>
      </aside>
    </section>
  );
}