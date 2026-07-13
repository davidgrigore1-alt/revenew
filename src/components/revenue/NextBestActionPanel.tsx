import { DataCard } from "@/components/dashboard/DataCard";
import { recommendNextBestAction } from "@/lib/revenue-workspace";
import type { Opportunity } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const urgencyLabels = {
  low: "Scăzută",
  medium: "Medie",
  high: "Ridicată"
};

const channelLabels = {
  email: "Email",
  phone: "Telefon",
  meeting: "Întâlnire",
  internal_review: "Revizuire internă"
};

export function NextBestActionPanel({ opportunity }: { opportunity: Opportunity }) {
  const recommendation = recommendNextBestAction(opportunity);

  return (
    <DataCard title="Următoarea acțiune recomandată" description="Recomandare deterministă pe baza datelor existente. Echipa decide ce execută.">
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
          <p className="text-lg font-semibold text-[rgb(var(--foreground))]">{recommendation.action}</p>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{recommendation.reason}</p>
        </div>
        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between gap-3 rounded-lg bg-[rgb(var(--surface-elevated))] px-3 py-2">
            <dt className="text-[rgb(var(--muted-foreground))]">Urgență</dt>
            <dd className="font-semibold text-[rgb(var(--foreground))]">{urgencyLabels[recommendation.urgency]}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-[rgb(var(--surface-elevated))] px-3 py-2">
            <dt className="text-[rgb(var(--muted-foreground))]">Canal</dt>
            <dd className="font-semibold text-[rgb(var(--foreground))]">{channelLabels[recommendation.channel]}</dd>
          </div>
          <div className="flex justify-between gap-3 rounded-lg bg-[rgb(var(--surface-elevated))] px-3 py-2">
            <dt className="text-[rgb(var(--muted-foreground))]">Termen sugerat</dt>
            <dd className="font-semibold text-[rgb(var(--foreground))]">{formatDate(recommendation.suggestedDueDate)}</dd>
          </div>
        </dl>
      </div>
      {recommendation.missingInformation.length > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-sm font-semibold text-amber-200">De confirmat înainte de execuție</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100">
            {recommendation.missingInformation.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </DataCard>
  );
}
