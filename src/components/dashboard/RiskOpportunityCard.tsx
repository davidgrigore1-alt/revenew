import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function riskReason(opportunity: Opportunity) {
  const today = new Date().toISOString().slice(0, 10);
  if (opportunity.deadline && opportunity.deadline.slice(0, 10) <= today) {
    return "Termen depășit sau astăzi";
  }
  if (opportunity.status === "follow_up_needed") {
    return "Follow-up întârziat";
  }
  if (opportunity.urgencyScore >= 80) {
    return "Urgență ridicată";
  }
  return "Valoare mare, încă deschisă";
}

export function RiskOpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Link href={`/opportunities/${opportunity.id}`} className="focus-ring block rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 transition hover:border-[rgb(var(--primary)_/_0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[rgb(var(--foreground))]">{opportunity.title}</h3>
          <p className="mt-1 text-sm text-[rgb(var(--warning))]">{riskReason(opportunity)}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[rgb(var(--foreground))]">{formatCurrency(opportunity.estimatedValueHigh)}</p>
      </div>
      <p className="mt-3 text-xs text-[rgb(var(--muted-foreground))]">Termen: {formatDate(opportunity.deadline)}</p>
    </Link>
  );
}
