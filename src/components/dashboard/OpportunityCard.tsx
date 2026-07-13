import Link from "next/link";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { Opportunity } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

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

  return (
    <Link
      href={`/opportunities/${opportunity.id}`}
      className="block min-w-0 rounded-xl border border-white/10 bg-white/[0.045] p-5 transition hover:border-mint-400/35 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-mint-400/40"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">
          {typeLabels[opportunity.type]}
        </span>
        <StatusBadge status={opportunity.status} />
        <ScoreBadge label="Fit" score={opportunity.fitScore} />
      </div>
      <h2 className="mt-4 break-words text-lg font-semibold leading-7 text-white">{opportunity.title}</h2>
      <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-zinc-400">{opportunity.summary}</p>
      <div className="mt-5 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Valoare</span>
          <span className="font-semibold text-white">
            {formatCurrency(opportunity.estimatedValueLow)} - {formatCurrency(opportunity.estimatedValueHigh)}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Termen</span>
          <span className="font-semibold text-white">{formatDate(opportunity.deadline)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Contact</span>
          <span className="font-semibold text-white">{primaryContact}</span>
        </div>
      </div>
      <div className="mt-4 min-w-0">
        <span className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Următorul pas</span>
        <span className="break-words text-sm font-semibold text-white">{opportunity.recommendedAction}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-mint-300">Deschide oportunitatea -&gt;</p>
    </Link>
  );
}
