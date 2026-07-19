import { assessOpportunityAttention, type OpportunityAttentionAssessment } from "@/lib/opportunity-attention";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import type { Opportunity } from "@/lib/types";

export type RevenueRecoveryQueueItem = {
  opportunity: Opportunity;
  assessment: OpportunityAttentionAssessment;
  primaryReason: OpportunityAttentionAssessment["reasons"][number];
};

const reasonPriority: Record<string, number> = {
  overdue_next_action: 900,
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
  return statePriority + Math.max(...item.assessment.reasons.map((reason) => reasonPriority[reason.code] ?? 0));
}

export function buildRevenueRecoveryQueue(opportunities: Opportunity[], options: { now?: Date } = {}) {
  return opportunities
    .filter(isOpenOpportunity)
    .map((opportunity): RevenueRecoveryQueueItem | null => {
      const assessment = assessOpportunityAttention(opportunity, options);
      if (assessment.reasons.length === 0) return null;
      const primaryReason = [...assessment.reasons].sort(
        (left, right) => (reasonPriority[right.code] ?? 0) - (reasonPriority[left.code] ?? 0)
      )[0];
      return { opportunity, assessment, primaryReason };
    })
    .filter((item): item is RevenueRecoveryQueueItem => Boolean(item))
    .sort((left, right) =>
      itemPriority(right) - itemPriority(left)
      || Number(right.opportunity.estimatedValueHigh ?? 0) - Number(left.opportunity.estimatedValueHigh ?? 0)
      || String(right.opportunity.updatedAt ?? "").localeCompare(String(left.opportunity.updatedAt ?? ""))
      || left.opportunity.id.localeCompare(right.opportunity.id)
    );
}
