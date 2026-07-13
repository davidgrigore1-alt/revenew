import { EmptyState } from "@/components/dashboard/EmptyState";
import { OpportunityCard } from "@/components/dashboard/OpportunityCard";
import { Button } from "@/components/ui/Button";
import type { Opportunity } from "@/lib/types";

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
  return (
    <div className="grid gap-5">
      {opportunities.length > 0 ? (
        <div className="grid gap-4">
          {opportunities.map((opportunity) => (
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
