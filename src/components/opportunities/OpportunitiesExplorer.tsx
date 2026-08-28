"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/Button";
import { assessOpportunityAttention } from "@/lib/opportunity-attention";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type OpportunitiesExplorerProps = {
  opportunities: Opportunity[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCtaLabel?: string;
  emptyCtaHref?: string;
};

function companyName(opportunity: Opportunity) {
  return opportunity.contact?.company ?? opportunity.contacts?.[0]?.contact.organization?.name ?? "Companie neconfirmată";
}

export function OpportunitiesExplorer({
  opportunities,
  emptyTitle = "Nicio oportunitate găsită",
  emptyDescription = "Schimbă filtrul sau caută după alt semnal comercial.",
  emptyCtaLabel,
  emptyCtaHref
}: OpportunitiesExplorerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const allSelected = opportunities.length > 0 && opportunities.every((item) => selectedIds.has(item.id));

  if (!opportunities.length) {
    return <div className="grid gap-3"><EmptyState title={emptyTitle} description={emptyDescription} />{emptyCtaLabel && emptyCtaHref ? <div className="flex justify-center"><Button href={emptyCtaHref}>{emptyCtaLabel}</Button></div> : null}</div>;
  }

  return (
    <>
      {selectedIds.size > 0 ? <div role="toolbar" aria-label="Acțiuni pentru oportunitățile selectate" className="product-floating-surface sticky top-2 z-20 mb-2 flex flex-wrap items-center justify-between gap-3 px-3 py-2"><p className="text-xs font-semibold"><span className="tabular-nums text-[rgb(var(--primary))]">{selectedIds.size}</span> selectate</p><div className="flex gap-2"><Button href="/ai" variant="secondary" size="small">Deschide Ask ReveNew</Button><Button type="button" variant="ghost" size="small" onClick={() => setSelectedIds(new Set())}>Șterge selecția</Button></div></div> : null}
    <div className="overflow-x-auto border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))]" role="region" aria-label="Registru oportunități" tabIndex={0}>
      <table className="w-full min-w-[1060px] table-fixed border-collapse text-left text-sm">
        <caption className="sr-only">Oportunitățile comerciale din selecția curentă</caption>
        <thead className="bg-[rgb(var(--surface-subtle))] text-[0.6875rem] font-semibold text-[rgb(var(--text-secondary))]">
          <tr className="border-b border-[rgb(var(--border-strong))]">
            <th scope="col" className="w-[23%] px-3 py-2.5"><span className="flex items-center gap-2"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? new Set() : new Set(opportunities.map((item) => item.id)))} aria-label="Selectează oportunitățile vizibile" className="size-4 accent-[rgb(var(--primary))]" />Oportunitate</span></th>
            <th scope="col" className="w-[15%] px-3 py-2.5">Companie</th>
            <th scope="col" className="w-[11%] px-3 py-2.5">Status</th>
            <th scope="col" className="w-[20%] px-3 py-2.5">Următor pas</th>
            <th scope="col" className="w-[10%] px-3 py-2.5">Termen</th>
            <th scope="col" className="w-[11%] px-3 py-2.5">Responsabil</th>
            <th scope="col" className="w-[10%] px-3 py-2.5 text-right">Valoare estimată</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgb(var(--border))]">
          {opportunities.map((opportunity) => {
            const nextAction = opportunity.actions.filter((action) => action.status === "pending").sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
            const attention = assessOpportunityAttention(opportunity);
            const attentionLabel = attention.state === "at_risk" || attention.state === "blocked" ? "În risc" : attention.state === "needs_attention" ? "Atenție" : attention.state === "closed" ? "Închisă" : "În grafic";
            const attentionRail = attention.state === "at_risk" || attention.state === "blocked"
              ? "border-l-[rgb(var(--danger-border))]"
              : attention.state === "needs_attention"
                ? "border-l-[rgb(var(--warning-border))]"
                : "border-l-transparent";
            return (
              <tr key={opportunity.id} aria-selected={selectedIds.has(opportunity.id)} className={`product-interactive-row group focus-within:bg-[rgb(var(--surface-elevated))] ${selectedIds.has(opportunity.id) ? "bg-[rgb(var(--surface-elevated))]" : ""}`}>
                <td className={`border-l-2 px-3 py-2.5 align-middle ${attentionRail}`}>
                  <div className="flex min-w-0 items-start gap-2"><input type="checkbox" checked={selectedIds.has(opportunity.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); if (next.has(opportunity.id)) next.delete(opportunity.id); else next.add(opportunity.id); return next; })} aria-label={"Selectează oportunitatea " + opportunity.title} className="mt-0.5 size-4 shrink-0 accent-[rgb(var(--primary))]" /><Link href={"/opportunities/" + opportunity.id} className="focus-ring block min-w-0 flex-1 rounded-control">
                    <span className="block truncate font-semibold text-[rgb(var(--foreground))] decoration-[rgb(var(--primary))] underline-offset-4 group-hover:text-[rgb(var(--primary))] group-hover:underline">{opportunity.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-[rgb(var(--text-faint))]">{attentionLabel} · {opportunity.type.replaceAll("_", " ")}</span>
                  </Link></div>
                </td>
                <td className="truncate px-3 py-2.5 text-[rgb(var(--text-secondary))]">{companyName(opportunity)}</td>
                <td className="px-3 py-2.5"><StatusBadge status={opportunity.status} /></td>
                <td className="px-3 py-2.5">
                  <p className="truncate font-medium text-[rgb(var(--foreground))]">{nextAction?.title ?? opportunity.recommendedAction ?? "Neplanificat"}</p>
                  <p className="mt-0.5 truncate text-xs text-[rgb(var(--text-faint))]">{attention.reasons[0]?.label ?? "Fără excepție activă"}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-[rgb(var(--text-muted))]">{formatDate(nextAction?.dueDate ?? opportunity.deadline)}</td>
                <td className="truncate px-3 py-2.5 text-xs font-medium text-[rgb(var(--text-secondary))]">{opportunity.ownerName ?? "Neatribuit"}</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
