"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { followUpStatusLabels, type FollowUpDraftStatus } from "@/lib/follow-up-studio";
import { formatDateTimeWithSeconds } from "@/lib/utils";

export type OutreachDraftItem = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  subject: string;
  body: string;
  status: FollowUpDraftStatus;
  generationMode: "ai" | "local_fallback";
  createdAt?: string;
  nextDueAt?: string;
};

type Tab = "review" | "approved" | "ready" | "sent" | "archived";
const tabs: Array<{ value: Tab; label: string; description: string }> = [
  { value: "review", label: "De revizuit", description: "Necesită verificare și decizie umană înainte de utilizare." },
  { value: "approved", label: "Aprobate", description: "Conținut aprobat, încă nepregătit pentru trimitere." },
  { value: "ready", label: "Pregătite", description: "Mesaje pregătite pentru o acțiune externă explicită." },
  { value: "sent", label: "Trimise extern", description: "Trimiteri externe confirmate în fluxul existent." },
  { value: "archived", label: "Arhivate", description: "Documente păstrate în istoric, fără acțiune curentă." }
];

function tabFor(status: FollowUpDraftStatus): Tab {
  if (status === "approved") return "approved";
  if (status === "ready_to_send") return "ready";
  if (status === "sent") return "sent";
  if (status === "archived") return "archived";
  return "review";
}

export function OutreachBoard({ drafts }: { drafts: OutreachDraftItem[] }) {
  const counts = useMemo(() => Object.fromEntries(tabs.map(({ value }) => [value, drafts.filter((draft) => tabFor(draft.status) === value).length])) as Record<Tab, number>, [drafts]);
  const initialTab = tabs.find(({ value }) => counts[value] > 0)?.value ?? "review";
  const [tab, setTab] = useState<Tab>(initialTab);
  const visible = useMemo(() => drafts.filter((draft) => tabFor(draft.status) === tab), [drafts, tab]);
  const activeTab = tabs.find((item) => item.value === tab) ?? tabs[0];

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="outreach-control-title">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-label text-[rgb(var(--primary))]">Control documente</p>
            <h2 id="outreach-control-title" className="mt-2 text-xl font-semibold tracking-[-0.025em]">Revizuire înainte de orice acțiune externă.</h2>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">ReveNew pregătește conținutul; aprobarea, canalul și momentul trimiterii rămân sub controlul echipei.</p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-5">
            {tabs.map(({ value, label }) => <div key={value} className="bg-[rgb(var(--surface-subtle))] p-3"><p className="text-label truncate text-[rgb(var(--text-faint))]">{label}</p><p className="mt-2 text-xl font-semibold">{counts[value]}</p></div>)}
          </div>
        </div>
      </section>

      <div className="border-b border-[rgb(var(--border))]" role="tablist" aria-label="Filtre status draft">
        <div className="flex gap-1 overflow-x-auto pb-3">
          {tabs.map(({ value, label }) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`focus-ring min-h-11 shrink-0 rounded-button px-3 py-2 text-sm font-semibold transition-colors ${tab === value ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"}`}>
              {label} · {counts[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-label text-[rgb(var(--text-faint))]">Coada curentă</p><h2 className="mt-1 text-base font-semibold">{activeTab.label}</h2></div>
        <p className="max-w-xl text-sm text-[rgb(var(--text-muted))]">{activeTab.description}</p>
      </div>

      {visible.length ? (
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
          {visible.map((draft) => (
            <article key={draft.id} className="flex h-full min-w-0 flex-col rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card transition-[border-color,box-shadow,transform] duration-fast hover:-translate-y-px hover:border-[rgb(var(--border-strong))] hover:shadow-card-hover">
              <div className="flex flex-wrap gap-2">
                <span className="status-pill status-pill-neutral">{draft.generationMode === "ai" ? "Draft asistat" : "Draft standard"}</span>
                <span className="status-pill status-pill-brand">{followUpStatusLabels[draft.status]}</span>
                <span className={`status-pill ${draft.status === "sent" ? "status-pill-success" : "status-pill-neutral"}`}>{draft.status === "sent" ? "Trimitere confirmată" : "Netrimis automat"}</span>
              </div>
              <p className="text-label mt-4 text-[rgb(var(--primary))]">{draft.opportunityTitle}</p>
              <h3 className="mt-2 font-semibold text-[rgb(var(--foreground))]">{draft.subject}</h3>
              <p className="mt-2 line-clamp-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--text-muted))]">{draft.body}</p>
              <div className="mt-4 grid gap-1 border-t border-[rgb(var(--border))] pt-3 text-xs text-[rgb(var(--text-muted))]">
                {draft.createdAt ? <p>Creat la {formatDateTimeWithSeconds(draft.createdAt)}</p> : null}
                {draft.nextDueAt ? <p className="font-semibold text-[rgb(var(--warning-text))]">Următorul follow-up: {formatDateTimeWithSeconds(draft.nextDueAt)}</p> : null}
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row sm:items-center">
                <Link href={`/outreach/${draft.id}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-button bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))]">Deschide Studio</Link>
                <Link href={`/opportunities/${draft.opportunityId}`} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-button border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))]">Vezi oportunitatea</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-6">
          <h3 className="text-sm font-semibold">Coada „{activeTab.label}” este liberă</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">{activeTab.description} Selectează o etapă cu documente sau deschide o oportunitate pentru a continua lucrul comercial.</p>
          <Link href="/opportunities" className="focus-ring mt-4 inline-flex min-h-11 items-center rounded-button text-sm font-semibold text-[rgb(var(--primary))]">Vezi oportunitățile →</Link>
        </div>
      )}
    </div>
  );
}
