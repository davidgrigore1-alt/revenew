"use client";

import Link from "next/link";
import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";
import { InterventionRow } from "@/components/dashboard/CommercialInterventions";

import { useCallback, useState } from "react";
import { CalendarDaysIcon, ClockIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import type { CopilotPresentation } from "@/lib/ai/copilot-types";
import { EmailDetailDrawer } from "@/components/intelligence/EmailDetailDrawer";
import { formatProductDateTime, formatProductTime, formatUserFacingText, presentDirection, presentOpportunityState } from "@/lib/ui/presentation";

const shortDay = new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "2-digit", month: "short", timeZone: "Europe/Bucharest" });

function GmailMark() {
  return <IntegrationBrandIcon provider="gmail" />;
}

function CalendarMark() {
  return <IntegrationBrandIcon provider="google_calendar" />;
}

function Monogram({ name, email }: { name: string | null; email: string | null }) {
  const value = (name || email || "Email").trim();
  const initials = value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "E";
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-muted))] text-xs font-bold text-[rgb(var(--text-secondary))]" aria-hidden="true">{initials}</span>;
}

function EmailCards({ presentation, onOpen }: { presentation: CopilotPresentation; onOpen: (messageId: string) => void }) {
  if (!presentation.emails.length) return null;
  return (
    <section className="mt-5" aria-labelledby="copilot-email-results">
      <div className="flex items-center justify-between gap-3">
        <h5 id="copilot-email-results" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]"><GmailMark />Conversații relevante</h5>
        <span className="text-xs tabular-nums text-[rgb(var(--text-faint))]">{presentation.emails.length} {presentation.emails.length === 1 ? "mesaj" : "mesaje"}</span>
      </div>
      <div className="mt-3 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
        {presentation.emails.map((email) => {
          const linked = Boolean(email.linkedOrganizationId || email.linkedOpportunityId);
          const senderLabel = email.senderName || email.senderEmail || (email.direction === "outbound" ? "Mesaj trimis" : "Expeditor neidentificat");
          return (
            <article key={email.sourceId} onClick={() => onOpen(email.recordId)} className={`product-interactive-row group cursor-pointer px-1 py-4 ${email.direction === "inbound" ? "border-l-2 border-l-[rgb(var(--primary)/0.65)]" : "border-l-2 border-l-transparent"}`}>
              <div className="flex items-start gap-3">
                <Monogram name={email.senderName} email={email.senderEmail} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-[rgb(var(--foreground))]">{senderLabel}</p>{email.senderEmail && email.senderEmail !== senderLabel ? <p className="truncate text-[0.6875rem] text-[rgb(var(--text-faint))]">{email.senderEmail}</p> : null}</div>
                    <time dateTime={email.sentAt} className="shrink-0 text-[0.6875rem] font-medium text-[rgb(var(--text-faint))]">{formatProductDateTime(email.sentAt, { year: false })}</time>
                  </div>
                  <h6 className="mt-2 text-sm font-semibold leading-5 text-[rgb(var(--text-secondary))]">{email.subject || "Fără subiect"}</h6>
                  {email.excerpt ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{formatUserFacingText(email.excerpt, { stripUrls: true })}</p> : <p className="mt-1 text-xs text-[rgb(var(--text-faint))]">Nu există un extras disponibil.</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--border))] pt-2.5">
                    <div className="flex flex-wrap gap-1.5"><span className="status-pill status-pill-neutral">{presentDirection(email.direction).label}</span><span className={linked ? "status-pill status-pill-success" : "status-pill status-pill-neutral"}>{linked ? "Context CRM" : "Nelegat de CRM"}</span></div>
                    <button type="button" className="focus-ring rounded-button px-2 py-1.5 text-[0.6875rem] font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-soft))]" onClick={(event) => { event.stopPropagation(); onOpen(email.recordId); }}>Deschide conversația</button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CalendarStrip({ presentation }: { presentation: CopilotPresentation }) {
  const base = presentation.calendarWindow?.from || presentation.meetings[0]?.startsAt;
  if (!base) return null;
  const duration = presentation.calendarWindow ? Math.max(1, Math.min(7, Math.round((Date.parse(presentation.calendarWindow.to) - Date.parse(presentation.calendarWindow.from)) / 86_400_000))) : Math.min(7, Math.max(1, presentation.meetings.length));
  const days = Array.from({ length: duration }, (_, index) => {
    const date = new Date(base); date.setUTCDate(date.getUTCDate() + index);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    const count = presentation.meetings.filter((meeting) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(meeting.startsAt)) === key).length;
    return { date, key, count };
  });
  return <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-7">{days.map((day) => <div key={day.key} className={`rounded-control border px-3 py-2.5 ${day.count ? "border-[rgb(var(--primary-border))] bg-[rgb(var(--primary-soft))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]"}`}><p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">{shortDay.format(day.date)}</p><p className={`mt-1 text-xs font-semibold ${day.count ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-muted))]"}`}>{day.count ? `${day.count} ${day.count === 1 ? "întâlnire" : "întâlniri"}` : "Liber"}</p></div>)}</div>;
}

function CalendarCards({ presentation }: { presentation: CopilotPresentation }) {
  if (!presentation.meetings.length && !presentation.calendarWindow) return null;
  return (
    <section className="mt-5" aria-labelledby="copilot-calendar-results">
      <div className="flex items-center justify-between gap-3"><h5 id="copilot-calendar-results" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]"><CalendarMark />Agenda verificată</h5>{presentation.calendarWindow ? <span className="text-[0.6875rem] text-[rgb(var(--text-faint))]">Europe/Bucharest</span> : null}</div>
      <CalendarStrip presentation={presentation} />
      {presentation.meetings.length ? <div className="mt-3 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">{presentation.meetings.map((meeting) => {
        const linked = Boolean(meeting.linkedOrganizationId || meeting.linkedOpportunityId);
        return <article key={meeting.sourceId} className="grid gap-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3.5 sm:grid-cols-[5.5rem_minmax(0,1fr)]"><div className="border-b border-[rgb(var(--border))] pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3"><p className="text-lg font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatProductTime(meeting.startsAt)}</p><p className="mt-0.5 text-[0.6875rem] text-[rgb(var(--text-faint))]">{shortDay.format(new Date(meeting.startsAt))}</p><p className="mt-2 flex items-center gap-1 text-[0.6875rem] text-[rgb(var(--text-muted))]"><ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatProductTime(meeting.endsAt)}</p></div><div className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-2"><h6 className="text-sm font-semibold text-[rgb(var(--foreground))]">{meeting.title || "Întâlnire"}</h6><span className={linked ? "status-pill status-pill-success" : "status-pill status-pill-neutral"}>{linked ? "Context comercial" : meeting.status === "tentative" ? "Provizoriu" : "Calendar"}</span></div>{meeting.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{meeting.description}</p> : null}<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-[rgb(var(--text-faint))]">{meeting.organizer ? <span>Organizator: {meeting.organizer.name || meeting.organizer.email}</span> : null}{meeting.participants.length ? <span className="inline-flex items-center gap-1"><UserGroupIcon className="h-3.5 w-3.5" aria-hidden="true" />{meeting.participants.length} participanți</span> : null}</div></div></article>;
      })}</div> : <div className="mt-3 flex items-start gap-3 rounded-card border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-4"><CalendarDaysIcon className="h-5 w-5 shrink-0 text-[rgb(var(--text-muted))]" aria-hidden="true" /><div><p className="text-sm font-semibold">Interval fără întâlniri</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Calendarul autorizat a fost verificat cu succes. Nu există evenimente sincronizate în perioada selectată.</p></div></div>}
    </section>
  );
}

function RecentChanges({ presentation }: { presentation: CopilotPresentation }) {
  if (presentation.kind !== "recent_changes" || !presentation.changes.length) return null;
  return (
    <section className="mt-5" aria-labelledby="copilot-recent-changes">
      <div className="flex items-end justify-between gap-3 border-b border-[rgb(var(--border))] pb-2.5">
        <div>
          <p className="micro-label">Activitate comercială</p>
          <h5 id="copilot-recent-changes" className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">Ce s-a schimbat recent</h5>
        </div>
        <span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{presentation.changes.length} {presentation.changes.length === 1 ? "schimbare" : "schimbări"}</span>
      </div>
      <div className="divide-y divide-[rgb(var(--border))]">
        {presentation.changes.map((change) => {
          const state = presentOpportunityState(change.status);
          const indicator = state.tone === "danger" ? "bg-[rgb(var(--danger-text))]" : state.tone === "warning" ? "bg-[rgb(var(--warning-text))]" : state.tone === "success" ? "bg-[rgb(var(--success-text))]" : "bg-[rgb(var(--primary))]";
          return (
            <Link key={change.sourceId} href={change.route} className="product-interactive-row focus-ring group grid gap-3 py-3.5 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
              <IntegrationBrandIcon provider="revenew" size="small" />
              <span className="min-w-0">
                <strong className="block truncate text-sm text-[rgb(var(--foreground))]">{change.title}</strong>
                <span className="mt-0.5 block truncate text-xs text-[rgb(var(--text-muted))]">{change.company || "Companie neconfirmată"}</span>
                <span className="mt-2 flex items-center gap-2 text-xs font-medium text-[rgb(var(--text-secondary))]"><span className={`h-1.5 w-1.5 rounded-full ${indicator}`} aria-hidden="true" />{state.label}</span>
              </span>
              <time dateTime={change.occurredAt} className="self-start whitespace-nowrap text-[0.6875rem] tabular-nums text-[rgb(var(--text-faint))] sm:self-center">{formatProductDateTime(change.occurredAt, { year: false })}</time>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function CopilotResultCards({ presentation, onAsk }: { presentation: CopilotPresentation; onAsk: (question: string) => void }) {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const closeEmail = useCallback(() => setSelectedEmailId(null), []);
  return <>
    {presentation.interventions ? <ol className="mt-4" aria-label="Intervenții prioritare">{presentation.interventions.map((item, index) => <InterventionRow key={`${item.id}:${item.version}`} item={item} index={index} compact />)}</ol> : null}
    <RecentChanges presentation={presentation} />
    <EmailCards presentation={presentation} onOpen={setSelectedEmailId} />
    <CalendarCards presentation={presentation} />
    <EmailDetailDrawer messageId={selectedEmailId} onClose={closeEmail} onAsk={onAsk} />
  </>;
}
