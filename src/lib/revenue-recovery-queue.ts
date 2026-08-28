import type { OpportunityAttentionAssessment } from "@/lib/opportunity-attention";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import { buildOpportunityCommercialState, type OpportunityCommercialState, type CommercialStateException } from "@/lib/opportunity-commercial-state";
import type { CommercialSignal, Opportunity } from "@/lib/types";

export type RevenueRecoveryQueueItem = {
  opportunity: Opportunity;
  state: OpportunityCommercialState;
  assessment: OpportunityAttentionAssessment;
  primaryReason: CommercialStateException;
};

const reasonPriority: Record<string, number> = {
  overdue_next_action: 900,
  pending_approval: 850,
  prepared_document_not_advanced: 825,
  outreach_restricted: 840,
  missing_next_action: 800,
  unassigned_owner: 700,
  proposal_without_follow_up: 650,
  missing_primary_contact: 500,
  stale_activity: 400,
  missing_decision_maker: 300,
  missing_value: 200,
  missing_expected_date: 100,
  insufficient_data: 50
};

function itemPriority(item: RevenueRecoveryQueueItem) {
  const statePriority = item.assessment.state === "blocked" ? 1_200 : item.assessment.state === "at_risk" ? 1_000 : 0;
  return statePriority + Math.max(...item.state.exceptions.map((reason) => reasonPriority[reason.code] ?? 0));
}

export function buildRevenueRecoveryQueue(opportunities: Opportunity[], options: { now?: Date; staleAfterDays?: number; linkedSignals?: CommercialSignal[] } = {}) {
  return opportunities
    .filter(isOpenOpportunity)
    .map((opportunity): RevenueRecoveryQueueItem | null => {
      const state = buildOpportunityCommercialState(opportunity, options);
      const assessment = state.attention;
      if (state.exceptions.length === 0) return null;
      const primaryReason = state.exceptions[0];
      return { opportunity, state, assessment, primaryReason };
    })
    .filter((item): item is RevenueRecoveryQueueItem => Boolean(item))
    .sort((left, right) =>
      itemPriority(right) - itemPriority(left)
      || Number(right.opportunity.estimatedValueHigh ?? 0) - Number(left.opportunity.estimatedValueHigh ?? 0)
      || String(right.opportunity.updatedAt ?? "").localeCompare(String(left.opportunity.updatedAt ?? ""))
      || left.opportunity.id.localeCompare(right.opportunity.id)
    );
}
