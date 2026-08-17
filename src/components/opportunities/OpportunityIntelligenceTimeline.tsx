import Link from "next/link";
import { ArrowRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import {
  formatTimelineDateGroup,
  formatTimelineExactDate,
  type OpportunityTimelineEvent,
  type OpportunityTimelineResult
} from "@/lib/opportunity-intelligence-timeline";
import { formatCurrency } from "@/lib/utils";

function SnapshotItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{children}</dd>
    </div>
  );
}

function EvidenceDetails({ event }: { event: OpportunityTimelineEvent }) {
  return (
    <details className="group mt-3">
      <summary className="focus-ring inline-flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-button text-xs font-semibold text-[rgb(var(--text-muted))] marker:hidden hover:text-[rgb(var(--foreground))]">
        Dovezi și trasabilitate
        <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-2 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5 text-[rgb(var(--text-secondary))]">
        <ul className="grid gap-1.5">
          {event.evidence.map((item) => <li key={item}>• {item}</li>)}
          {event.statusBefore || event.statusAfter ? (
            <li>• Tranziție înregistrată: {event.statusBefore ?? "stare anterioară neprecizată"} → {event.statusAfter ?? "stare nouă neprecizată"}</li>
          ) : null}
        </ul>
      </div>
    </details>
  );
}

function TimelineRow({ event }: { event: OpportunityTimelineEvent }) {
  const isDerived = event.nature === "derived";
  return (
    <li className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0 sm:grid-cols-[1.5rem_minmax(0,1fr)] sm:gap-4">
      <div className="relative flex justify-center" aria-hidden="true">
        <span className="absolute bottom-[-1.25rem] top-3 w-px bg-[rgb(var(--border))] last:hidden" />
        <span className={`relative mt-1.5 size-2.5 rounded-full border-2 ${isDerived ? "border-[rgb(var(--primary))] bg-[rgb(var(--background))]" : "border-[rgb(var(--foreground))] bg-[rgb(var(--surface))]"}`} />
      </div>
      <article className={isDerived ? "rounded-control border border-[rgb(var(--gold-500)/0.34)] bg-[rgb(var(--gold-50)/0.22)] px-3 py-3 dark:bg-[rgb(var(--brand-950)/0.28)] sm:px-4" : "min-w-0 py-0.5"}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`rounded-pill border px-2 py-0.5 text-[0.6875rem] font-semibold ${isDerived ? "border-[rgb(var(--gold-500)/0.4)] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"}`}>
            {isDerived ? "Interpretare ReveNew" : "Fapt înregistrat"}
          </span>
          <span className="text-[0.6875rem] font-medium text-[rgb(var(--text-muted))]">{event.category}</span>
          <time dateTime={event.occurredAt} title={formatTimelineExactDate(event.occurredAt)} className="text-[0.6875rem] text-[rgb(var(--text-muted))] sm:ml-auto">
            {formatTimelineExactDate(event.occurredAt)}
          </time>
        </div>
        <h4 className="mt-2 text-sm font-semibold text-[rgb(var(--foreground))] sm:text-base">{event.title}</h4>
        <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{event.summary}</p>
        {event.amount && event.currency ? <p className="mt-2 text-xs font-semibold text-[rgb(var(--foreground))]">Valoare menționată în sursă: {formatCurrency(event.amount, event.currency)} · nu este venit confirmat</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[rgb(var(--text-muted))]">
          <span>{isDerived ? "Bazat pe" : "Sursă"}: {event.source.label}</span>
          {event.actor ? <span>Înregistrat de: {event.actor}</span> : null}
          {event.source.href ? (
            <Link href={event.source.href} className="focus-ring inline-flex min-h-8 items-center gap-1 rounded-button font-semibold text-[rgb(var(--primary))] hover:underline">
              {event.source.type === "commercial_signal" ? "Deschide semnalul" : event.source.type === "document" ? "Deschide documentul" : "Verifică dovada"}
              <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        <EvidenceDetails event={event} />
      </article>
    </li>
  );
}

export function OpportunityIntelligenceTimeline({ result }: { result: OpportunityTimelineResult | null }) {
  if (!result || result.state === "error") {
    return (
      <section id="opportunity-timeline" tabIndex={-1} className="scroll-mt-24 rounded-panel border border-[rgb(var(--danger-border))] bg-[rgb(var(--surface))] p-5 outline-none target:ring-2 target:ring-[rgb(var(--primary)/0.42)]" aria-labelledby="opportunity-timeline-title">
        <h2 id="opportunity-timeline-title" className="font-display text-xl font-semibold">Istoric comercial</h2>
        <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Nu am putut încărca istoricul oportunității. Reîncarcă pagina pentru o nouă verificare sigură.</p>
      </section>
    );
  }

  const groups = new Map<string, OpportunityTimelineEvent[]>();
  for (const event of result.events) {
    const label = formatTimelineDateGroup(event.occurredAt);
    groups.set(label, [...(groups.get(label) ?? []), event]);
  }
  const state = result.currentState;

  return (
    <section id="opportunity-timeline" tabIndex={-1} className="scroll-mt-24 overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card outline-none target:ring-2 target:ring-[rgb(var(--primary)/0.42)]" aria-labelledby="opportunity-timeline-title">
      <header className="border-b border-[rgb(var(--border))] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Poveste comercială verificabilă</p>
            <h2 id="opportunity-timeline-title" className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">Istoric comercial</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">Fapte înregistrate și interpretări ReveNew în ordine cronologică.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
            <ClockIcon className="h-4 w-4" aria-hidden="true" />
            {result.observedCount} fapte · {result.derivedCount} interpretări
          </div>
        </div>
        <div className="mt-5 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4" aria-labelledby="current-state-title">
          <h3 id="current-state-title" className="text-sm font-semibold">Situație actuală</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SnapshotItem label="Status">{state.status}</SnapshotItem>
            <SnapshotItem label="Valoare estimată">{state.estimatedValue && state.currency ? <>{formatCurrency(state.estimatedValue, state.currency)} <span className="block text-xs font-normal text-[rgb(var(--text-muted))]">nu este venit confirmat</span></> : "Valoare neconfirmată"}</SnapshotItem>
            <SnapshotItem label="Ultima activitate">{state.latestActivityLabel}{state.latestActivityAt ? <time dateTime={state.latestActivityAt} className="block text-xs font-normal text-[rgb(var(--text-muted))]">{formatTimelineExactDate(state.latestActivityAt)}</time> : null}</SnapshotItem>
            <SnapshotItem label="Următor pas">{state.nextActionLabel}<span className={`block text-xs font-semibold ${state.nextActionState === "restant" ? "text-[rgb(var(--danger-text))]" : "text-[rgb(var(--text-muted))]"}`}>{state.nextActionState === "restant" ? "Restant" : state.nextActionState === "programat" ? "Programat" : "Neconfirmat"}{state.nextActionDueAt ? ` · ${formatTimelineExactDate(state.nextActionDueAt)}` : ""}</span></SnapshotItem>
            <SnapshotItem label="Responsabil">{state.ownerLabel}</SnapshotItem>
          </dl>
        </div>
      </header>

      <div className="px-4 py-5 sm:px-6">
        {result.state === "empty" ? (
          <div className="rounded-card border border-dashed border-[rgb(var(--border))] p-5">
            <h3 className="font-semibold">Nu există încă activitate înregistrată</h3>
            <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">ReveNew nu construiește un istoric din informații care nu există.</p>
          </div>
        ) : (
          <>
            {result.state === "limited" ? <div className="mb-5 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3"><p className="text-sm font-semibold">Istoric comercial limitat</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">ReveNew afișează numai evenimentele înregistrate până acum pentru această oportunitate.</p></div> : null}
            <div aria-label="Istoric comercial ordonat de la cel mai recent eveniment">
              {Array.from(groups.entries()).map(([label, events]) => (
                <section key={label} className="mb-6 last:mb-0" aria-labelledby={`timeline-group-${events[0].id.replaceAll(":", "-")}`}>
                  <h3 id={`timeline-group-${events[0].id.replaceAll(":", "-")}`} className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{label}</h3>
                  <ol>{events.map((event) => <TimelineRow key={event.id} event={event} />)}</ol>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
