"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { OpportunityCard, getOpportunityTypeLabel } from "@/components/dashboard/OpportunityCard";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/Button";
import type { Opportunity, OpportunityStatus, OpportunityType } from "@/lib/types";

const allTypes = "all";
const allStatuses = "all";
type SortMode = "highest_value" | "highest_fit" | "most_urgent" | "newest";

type OpportunitiesExplorerProps = {
  opportunities: Opportunity[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCtaLabel?: string;
  emptyCtaHref?: string;
};

export function OpportunitiesExplorer({
  opportunities,
  emptyTitle = "Nicio oportunitate gasita",
  emptyDescription = "Schimba filtrul sau cauta dupa alt semnal comercial.",
  emptyCtaLabel,
  emptyCtaHref
}: OpportunitiesExplorerProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<OpportunityType | typeof allTypes>(allTypes);
  const [status, setStatus] = useState<OpportunityStatus | typeof allStatuses>(allStatuses);
  const [sort, setSort] = useState<SortMode>("highest_value");

  const types = Array.from(new Set(opportunities.map((item) => item.type)));
  const statuses = Array.from(new Set(opportunities.map((item) => item.status)));

  const filtered = useMemo(() => {
    return opportunities
      .filter((item) => {
        const matchesQuery = `${item.title} ${item.summary} ${item.recommendedAction}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesType = type === allTypes || item.type === type;
        const matchesStatus = status === allStatuses || item.status === status;

        return matchesQuery && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "highest_fit") return b.fitScore - a.fitScore;
        if (sort === "most_urgent") return b.urgencyScore - a.urgencyScore;
        if (sort === "newest") return b.id.localeCompare(a.id);
        return b.estimatedValueHigh - a.estimatedValueHigh;
      });
  }, [opportunities, query, type, status, sort]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-4 lg:grid-cols-[1fr_190px_190px_190px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cauta dupa companie, actiune sau semnal"
          className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-mint-400/60"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value as OpportunityType | typeof allTypes)}
          className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-white outline-none focus:border-mint-400/60"
        >
          <option value={allTypes}>Toate tipurile</option>
          {types.map((item) => (
            <option key={item} value={item}>
              {getOpportunityTypeLabel(item)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OpportunityStatus | typeof allStatuses)}
          className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-white outline-none focus:border-mint-400/60"
        >
          <option value={allStatuses}>Toate statusurile</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {getStatusLabel(item)}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortMode)}
          className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-3 text-sm text-white outline-none focus:border-mint-400/60"
        >
          <option value="highest_value">Valoare maxima</option>
          <option value="highest_fit">Fit maxim</option>
          <option value="most_urgent">Cele mai urgente</option>
          <option value="newest">Cele mai noi</option>
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4">
          {filtered.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          <EmptyState title={emptyTitle} description={emptyDescription} />
          {emptyCtaLabel && emptyCtaHref ? (
            <div className="flex justify-center">
              <Button href={emptyCtaHref}>{emptyCtaLabel}</Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
