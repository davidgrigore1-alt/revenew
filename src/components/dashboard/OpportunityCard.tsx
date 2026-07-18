import Link from "next/link";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { assessOpportunityAttention } from "@/lib/opportunity-attention";

const typeLabels: Record<Opportunity["type"], string> = {
  public_procurement: "Achiziție publică",
  b2b_lead: "Lead B2B",
  grant: "Grant",
  partnership: "Parteneriat",
  invoice_followup: "Factură",
  contract_renewal: "Reînnoire",
  cold_outreach: "Cold outreach",
  website_lead: "Website lead",
  manual: "Manual"
};

export function getOpportunityTypeLabel(type: Opportunity["type"]) {
  return typeLabels[type];
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const primaryContact = opportunity.contacts?.find((item) => item.isPrimary)?.contact.fullName ?? opportunity.contact?.name ?? "Neconfirmat";
  const nextAction = opportunity.actions.find((action) => action.status === "pending")?.title ?? opportunity.recommendedAction;
  const attention = assessOpportunityAttention(opportunity);
  const attentionLabel = attention.state === "at_risk" || attention.state === "blocked" ? "În risc" : attention.state === "needs_attention" ? "Necesită atenție" : attention.state === "closed" ? "Închisă" : "În grafic";

  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="focus-ring block min-w-0 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card transition hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-subtle))]"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(14rem,1.2fr)_minmax(30rem,1.8fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[rgb(var(--surface-muted))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">{typeLabels[opportunity.type]}</span><StatusBadge status={opportunity.status} /><ScoreBadge label="Fit" score={opportunity.fitScore} /></div>
          <h2 className="mt-3 break-words text-base font-semibold leading-6 text-[rgb(var(--foreground))]">{opportunity.title}</h2>
          <p className="mt-1 line-clamp-1 text-xs text-[rgb(var(--text-muted))]">{opportunity.summary}</p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div><dt className="text-[0.65rem] uppercase tracking-[0.12em] text-[rgb(var(--text-faint))]">Valoare</dt><dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">
            {formatCurrency(opportunity.estimatedValueLow)} - {formatCurrency(opportunity.estimatedValueHigh)}
          </dd>
        </div>
        <div><dt className="text-[0.65rem] uppercase tracking-[0.12em] text-[rgb(var(--text-faint))]">Owner</dt><dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{opportunity.ownerName ?? "Neatribuit"}</dd></div>
        <div><dt className="text-[0.65rem] uppercase tracking-[0.12em] text-[rgb(var(--text-faint))]">Termen</dt><dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{formatDate(opportunity.deadline)}</dd></div>
        <div><dt className="text-[0.65rem] uppercase tracking-[0.12em] text-[rgb(var(--text-faint))]">Contact</dt><dd className="mt-1 truncate font-semibold text-[rgb(var(--foreground))]">{primaryContact}</dd></div>
        <div className="sm:col-span-2 xl:col-span-4"><dt className="text-[0.65rem] uppercase tracking-[0.12em] text-[rgb(var(--text-faint))]">Următorul pas</dt><dd className="mt-1 line-clamp-1 font-medium text-[rgb(var(--text-secondary))]">{nextAction}</dd></div>
        </dl>
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attention.state === "at_risk" || attention.state === "blocked" ? "bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]" : attention.state === "needs_attention" ? "bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]" : "bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-muted))]"}`}>{attentionLabel}</span>
          <span className="text-sm font-semibold text-[rgb(var(--primary))]">Deschide →</span>
        </div>
      </div>
    </Link>
  );
}
