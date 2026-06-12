"use client";

import { useMemo, useState } from "react";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import type { LeadContact, LeadStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const all = "all";

export function LeadsExplorer({ leads }: { leads: LeadContact[] }) {
  const [industry, setIndustry] = useState(all);
  const [city, setCity] = useState(all);
  const [status, setStatus] = useState<LeadStatus | typeof all>(all);
  const [minScore, setMinScore] = useState("0");
  const [actions, setActions] = useState<Record<string, string>>({});

  const industries = Array.from(new Set(leads.map((lead) => lead.industry)));
  const cities = Array.from(new Set(leads.map((lead) => lead.city)));
  const statuses = Array.from(new Set(leads.map((lead) => lead.status ?? "new")));

  const filtered = useMemo(
    () =>
      leads.filter((lead) => {
        const leadStatus = lead.status ?? "new";
        return (
          (industry === all || lead.industry === industry) &&
          (city === all || lead.city === city) &&
          (status === all || leadStatus === status) &&
          lead.leadScore >= Number(minScore)
        );
      }),
    [city, industry, leads, minScore, status]
  );

  function mark(id: string, label: string) {
    setActions((current) => ({ ...current, [id]: label }));
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-4 md:grid-cols-4">
        <select value={industry} onChange={(event) => setIndustry(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-white">
          <option value={all}>Toate industriile</option>
          {industries.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={city} onChange={(event) => setCity(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-white">
          <option value={all}>Toate orașele</option>
          {cities.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | typeof all)} className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-white">
          <option value={all}>Toate statusurile</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={minScore} onChange={(event) => setMinScore(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-white">
          <option value="0">Orice scor</option>
          <option value="70">Scor 70+</option>
          <option value="80">Scor 80+</option>
          <option value="85">Scor 85+</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.map((lead) => (
          <article key={lead.id} className="rounded-xl border border-white/10 bg-ink-900/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{lead.companyName}</h2>
                <p className="mt-1 text-sm text-zinc-400">{lead.industry} • {lead.city} • {lead.status ?? "new"}</p>
              </div>
              <ScoreBadge label="Lead" score={lead.leadScore} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Contact</p>
                <p className="mt-1 font-semibold text-white">{lead.contactName}</p>
                <p className="text-sm text-zinc-400">{lead.email ?? lead.phone ?? "Contact neconfirmat"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Buget estimat</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(lead.estimatedBudget)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Semnal nevoie</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">{lead.needSignal}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Unghi recomandat</p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">{lead.recommendedAngle}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Generează email", "Adaugă în outreach", "Marchează contactat"].map((label) => (
                <button key={label} type="button" onClick={() => mark(lead.id, label)} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white">
                  {label}
                </button>
              ))}
              {actions[lead.id] ? <span className="px-3 py-2 text-xs font-semibold text-mint-400">{actions[lead.id]}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
