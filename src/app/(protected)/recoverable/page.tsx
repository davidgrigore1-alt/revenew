import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { RecoveryValueCard } from "@/components/dashboard/RecoveryValueCard";
import { SourceBadge } from "@/components/dashboard/SourceBadge";
import { getRecoverySummary, recoverableOpportunities, recoverableValue } from "@/lib/recovery";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const opportunityStatusLabels: Record<string, string> = {
  new: "Nouă",
  reviewed: "Verificată",
  action_generated: "Acțiune pregătită",
  contacted: "Contactată",
  follow_up_needed: "Necesită follow-up",
  won: "Câștigată",
  lost: "Pierdută",
  ignored: "Ignorată"
};

function CompactEmpty() {
  return (
    <p className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">
      Nu există încă oportunități recuperabile. Adaugă o cerere comercială ca să începi.
    </p>
  );
}

export default async function RecoverablePage() {
  const summary = await getRecoverySummary();
  const opportunities = recoverableOpportunities(summary.opportunities);
  const signals = summary.signals.filter((signal) => !signal.convertedOpportunityId && !["converted", "ignored", "archived"].includes(signal.status));
  const value = recoverableValue(summary.opportunities, summary.signals);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-7 pb-24 sm:px-6 lg:px-8 xl:pb-8">
      <RecoveryValueCard value={value} count={opportunities.length + signals.length} />

      <DataCard title="Lista de recuperare">
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-[rgb(var(--muted-foreground))]">
          <span className="rounded-full bg-[rgb(var(--muted))] px-3 py-1">Toate</span>
          <span className="rounded-full bg-[rgb(var(--muted))] px-3 py-1">Cereri active</span>
          <span className="rounded-full bg-[rgb(var(--muted))] px-3 py-1">Oportunități</span>
        </div>
        <div className="grid gap-3">
          {signals.map((signal) => (
            <Link key={signal.id} href="/inbox" className="focus-ring block rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 transition hover:border-[rgb(var(--primary)_/_0.45)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SourceBadge source={signal.source} />
                  <h2 className="mt-3 font-semibold text-[rgb(var(--foreground))]">{signal.contactCompany || signal.contactName || "Cerere comercială"}</h2>
                </div>
                <p className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(Number(signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0), signal.currency ?? "RON")}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{signal.extractedSummary || signal.detectedNeed || signal.rawMessage || "Cerere de verificat."}</p>
              <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">Recomandare: {signal.recommendedAction || signal.nextStep || "Revizuiește cererea."}</p>
            </Link>
          ))}

          {opportunities.map((opportunity) => (
            <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="focus-ring block rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 transition hover:border-[rgb(var(--primary)_/_0.45)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[rgb(var(--foreground))]">{opportunity.title}</h2>
                  <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{opportunityStatusLabels[opportunity.status] ?? "În lucru"} · Termen {formatDate(opportunity.deadline)}</p>
                </div>
                <p className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{opportunity.summary || "Oportunitate de verificat."}</p>
              <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">Recomandare: {opportunity.recommendedAction}</p>
            </Link>
          ))}

          {signals.length === 0 && opportunities.length === 0 ? <CompactEmpty /> : null}
        </div>
      </DataCard>

      <p className="px-1 text-xs text-[rgb(var(--muted-foreground))]">
        Valoarea este estimată din cereri active și oportunități deschise. Venitul confirmat este separat în Rezultate.
      </p>
    </main>
  );
}
