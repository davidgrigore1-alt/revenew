"use client";

import { useMemo, useState } from "react";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { formatDateTimeWithSeconds } from "@/lib/utils";
import type { OutreachSequence } from "@/lib/types";

type Tab = "draft" | "scheduled" | "follow_up" | "sent" | "replied";

const tabs: Array<[Tab, string]> = [
  ["draft", "Drafturi"],
  ["scheduled", "De trimis"],
  ["follow_up", "Follow-up"],
  ["sent", "Trimise"],
  ["replied", "Raspuns primit"]
];

export function OutreachBoard({ sequences }: { sequences: OutreachSequence[] }) {
  const [tab, setTab] = useState<Tab>("draft");
  const [action, setAction] = useState("");

  const messages = useMemo(() => sequences.flatMap((sequence) => sequence.messages.map((message) => ({ ...message, sequence: sequence.name }))), [sequences]);
  const followUps = useMemo(() => sequences.flatMap((sequence) => sequence.followUps.map((followUp) => ({ ...followUp, sequence: sequence.name }))), [sequences]);

  const visibleMessages = messages.filter((message) => message.status === tab);
  const actions = ["Copiaza email", "Marcheaza trimis", "Programeaza follow-up"];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === value ? "bg-mint-400/12 text-mint-400" : "border border-white/10 bg-white/[0.05] text-zinc-300 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "follow_up" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {followUps.map((followUp) => (
            <article key={followUp.id} className="rounded-xl border border-gold-400/20 bg-gold-400/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">{formatDateTimeWithSeconds(followUp.dueDate)}</p>
              <h2 className="mt-2 font-semibold text-white">{followUp.sequence}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{followUp.task}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {actions.map((label) => (
                  <button key={label} onClick={() => setAction(`${label}: actiune pregatita.`)} className="rounded-lg border border-white/10 bg-ink-900/70 px-3 py-2 text-xs font-semibold text-zinc-300">
                    {label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleMessages.map((message) => (
            <article key={message.id} className="rounded-xl border border-white/10 bg-ink-900/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mint-400">{message.sequence}</p>
              <h2 className="mt-2 font-semibold text-white">{message.subject}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{message.body}</p>
              {message.dueDate ? <p className="mt-3 text-xs font-semibold text-gold-400">Creat la {formatDateTimeWithSeconds(message.dueDate)}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {actions.map((label) => (
                  <button key={label} onClick={() => setAction(`${label}: actiune pregatita.`)} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white">
                    {label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {action ? <StatusNotice tone="success">{action}</StatusNotice> : null}
    </div>
  );
}
