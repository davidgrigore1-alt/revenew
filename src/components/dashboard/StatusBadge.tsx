import { StatusPill } from "@/components/ui/StatusPill";
import { domainStatePresentation, type DomainStatePresentation } from "@/lib/ui/domain-state-presentation";
import type { OpportunityStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  const presentation: DomainStatePresentation = domainStatePresentation.opportunityStatus[status];

  return (
    <StatusPill tone={presentation.tone} showDot={presentation.compact?.showDot ?? false}>
      {presentation.compact?.label ?? presentation.label}
    </StatusPill>
  );
}

export function getStatusLabel(status: OpportunityStatus) {
  return domainStatePresentation.opportunityStatus[status].label;
}
