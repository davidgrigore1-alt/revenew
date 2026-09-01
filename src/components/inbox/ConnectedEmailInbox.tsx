"use client";

import { IntegrationBrandIcon } from "@/components/ui/IntegrationBrandIcon";

import { useCallback, useMemo, useState } from "react";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { EmailDetailDrawer } from "@/components/intelligence/EmailDetailDrawer";
import { SegmentedFilter } from "@/components/ui/SegmentedFilter";
import { addBusinessDays } from "@/lib/commercial-execution";
import { readableEmailSnippet } from "@/lib/ui/email-reader";
import { formatProductDateTime, formatUserFacingText } from "@/lib/ui/presentation";

type InboxEmail = {
  id: string;
  sentAt: string;
  senderName: string | null;
  senderEmail: string | null;
  subject: string | null;
  excerpt: string | null;
  direction: "inbound" | "outbound";
  linkedContactId: string | null;
  linkedOrganizationId: string | null;
  linkedOpportunityId: string | null;
  draftStatus: string | null;
};

const dateTime = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" });
type InboxView = "all" | "requires_action" | "reply_received" | "waiting" | "approval_needed" | "unlinked";

function commercialState(email: InboxEmail, responseWindowBusinessDays: number, now = Date.now()): Exclude<InboxView, "all"> {
  const linked = Boolean(email.linkedContactId || email.linkedOrganizationId || email.linkedOpportunityId);
  if (email.draftStatus === "ready") return "approval_needed";
  if (!linked) return "unlinked";
  if (email.direction === "inbound") return "reply_received";
  return now > addBusinessDays(email.sentAt, responseWindowBusinessDays).getTime() ? "requires_action" : "waiting";
}

const viewLabels: Record<InboxView, string> = {
  all: "Toate",
  requires_action: "Necesită atenție",
  reply_received: "Răspuns primit",
  waiting: "Așteptare",
  approval_needed: "Aprobare necesară",
  unlinked: "Nelegate"
};

const stateLabels: Record<Exclude<InboxView, "all">, string> = {
  requires_action: "Necesită atenție",
  reply_received: "Răspuns primit",
  waiting: "Așteaptă clientul",
  approval_needed: "Aprobare necesară",
  unlinked: "Nelegat"
};

function GmailMark() {
  return <IntegrationBrandIcon provider="gmail" />;
}

function Monogram({ email }: { email: InboxEmail }) {
  const label = (email.senderName || email.senderEmail || "Email").trim();
  const initials = label.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "E";
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-muted))] text-[0.6875rem] font-bold text-[rgb(var(--text-secondary))]" aria-hidden="true">{initials}</span>;
}

export function ConnectedEmailInbox({ emails, responseWindowBusinessDays = 3, initialEmailId }: { emails: InboxEmail[]; responseWindowBusinessDays?: number; initialEmailId?: string }) {
  // The bounded inbox list may omit an older linked source. The reader authorizes the exact ID server-side.
  const [selected, setSelected] = useState<string | null>(() => initialEmailId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(initialEmailId) ? initialEmailId : null);
  const [view, setView] = useState<InboxView>("all");
  const close = useCallback(() => setSelected(null), []);
  const classified = useMemo(() => emails.map((email) => ({ email, state: commercialState(email, responseWindowBusinessDays) })), [emails, responseWindowBusinessDays]);
  const visible = view === "all" ? classified : classified.filter((item) => item.state === view);
  const viewOptions = (Object.keys(viewLabels) as InboxView[]).map((item) => ({
    id: item,
    label: viewLabels[item],
    count: item === "all" ? classified.length : classified.filter((entry) => entry.state === item).length,
  }));
  if (!emails.length) return null;
  return (
    <section className="mt-6 border-t border-[rgb(var(--border-subtle))] pt-6" aria-labelledby="connected-email-inbox-title">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-start gap-3"><GmailMark /><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Context privat conectat</p><h2 id="connected-email-inbox-title" className="mt-1 text-lg font-semibold">Conversații Gmail recente</h2><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Mesaje recente din conexiunea autorizată. Asocierea comercială este indicată separat.</p></div></div>
        <span className="text-xs tabular-nums text-[rgb(var(--text-faint))]">{emails.length} mesaje</span>
      </div>
      <div className="mt-4 border-b border-[rgb(var(--border-subtle))] pb-3">
        <SegmentedFilter label="Filtre conversații" options={viewOptions} value={view} onChange={setView} />
      </div>
      <ul aria-label="Conversații Gmail conectate" className="divide-y divide-[rgb(var(--border))] border-b border-[rgb(var(--border))]">
        {visible.map(({ email, state }) => <li key={email.id}><button type="button" aria-haspopup="dialog" onClick={() => setSelected(email.id)} className="product-interactive-row focus-ring group grid w-full gap-3 px-3 py-3.5 text-left sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-start">
          <Monogram email={email} />
          <span className="min-w-0"><span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold">{email.senderName || email.senderEmail || (email.direction === "outbound" ? "Mesaj trimis" : "Expeditor neidentificat")}</span><span className={state === "reply_received" ? "status-pill status-pill-success" : state === "requires_action" ? "status-pill status-pill-warning" : "status-pill status-pill-neutral"}>{stateLabels[state]}</span></span><span className="mt-1 block truncate text-xs font-semibold text-[rgb(var(--text-secondary))]">{readableEmailSnippet(formatUserFacingText(email.subject || "Fără subiect", { stripUrls: true }), 180)}</span>{email.excerpt ? <span className="mt-1 block line-clamp-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{readableEmailSnippet(formatUserFacingText(email.excerpt, { stripUrls: true }))}</span> : null}</span>
          <span className="grid shrink-0 justify-items-end gap-2"><time dateTime={email.sentAt} className="text-[0.6875rem] text-[rgb(var(--text-faint))]">{formatProductDateTime(email.sentAt)}</time><span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[rgb(var(--primary))] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Deschide <EnvelopeIcon className="h-3.5 w-3.5" aria-hidden="true" /></span></span>
        </button></li>)}
        {!visible.length ? <li className="py-6 text-center text-sm text-[rgb(var(--text-muted))]">Nicio conversație în această stare.</li> : null}
      </ul>
      <EmailDetailDrawer messageId={selected} onClose={close} onAsk={(question) => {
        const selectedRecordId = selected;
        close();
        // Allow the reader to restore scroll/focus before the existing global Ask opens.
        requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("revenew:open-contextual-assistant", { detail: { selectedRecordId, question } }))));
      }} />
    </section>
  );
}
