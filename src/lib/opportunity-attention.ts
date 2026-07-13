import {
  DEFAULT_STALE_ACTIVITY_DAYS,
  isOpenOpportunity,
  selectPrimaryNextAction,
  stageForLegacyStatus
} from "@/lib/opportunity-domain";
import type { Opportunity } from "@/lib/types";

export type AttentionReasonCode =
  | "overdue_next_action"
  | "missing_next_action"
  | "stale_activity"
  | "unassigned_owner"
  | "missing_primary_contact"
  | "missing_decision_maker"
  | "missing_value"
  | "missing_expected_date"
  | "proposal_without_follow_up"
  | "insufficient_data";

export type AttentionSeverity = "low" | "medium" | "high";
export type OpportunityAttentionState = "on_track" | "needs_attention" | "at_risk" | "blocked" | "closed";

export type OpportunityAttentionReason = {
  code: AttentionReasonCode;
  label: string;
  explanation: string;
  severity: AttentionSeverity;
  sources: string[];
};

export type OpportunityAttentionAssessment = {
  state: OpportunityAttentionState;
  reasons: OpportunityAttentionReason[];
  primaryNextAction: ReturnType<typeof selectPrimaryNextAction>;
  lastMeaningfulActivityAt: string | null;
};

const definitions: Record<AttentionReasonCode, Omit<OpportunityAttentionReason, "code">> = {
  overdue_next_action: {
    label: "Acțiune restantă",
    explanation: "Următoarea acțiune nu a fost finalizată până la termen.",
    severity: "high",
    sources: ["opportunity_actions.status", "opportunity_actions.due_at"]
  },
  missing_next_action: {
    label: "Fără acțiune următoare",
    explanation: "Oportunitatea deschisă nu are un task incomplet care să indice pasul următor.",
    severity: "high",
    sources: ["opportunity_actions.status"]
  },
  stale_activity: {
    label: "Activitate veche",
    explanation: `Nu există activitate comercială în ultimele ${DEFAULT_STALE_ACTIVITY_DAYS} zile.`,
    severity: "medium",
    sources: ["opportunity_events.occurred_at", "opportunities.created_at"]
  },
  unassigned_owner: {
    label: "Fără responsabil",
    explanation: "Oportunitatea nu este atribuită unui membru al echipei.",
    severity: "high",
    sources: ["opportunities.owner_profile_id"]
  },
  missing_primary_contact: {
    label: "Fără contact principal",
    explanation: "Nu a fost selectat un contact principal din CRM.",
    severity: "medium",
    sources: ["opportunity_contacts.is_primary"]
  },
  missing_decision_maker: {
    label: "Decident neconfirmat",
    explanation: "Contactele asociate nu au un rol de decizie confirmat.",
    severity: "medium",
    sources: ["opportunity_contacts.role", "crm_contacts.decision_role"]
  },
  missing_value: {
    label: "Valoare lipsă",
    explanation: "Nu există o valoare recuperabilă estimată pentru prioritizare.",
    severity: "medium",
    sources: ["opportunities.estimated_value_low", "opportunities.estimated_value_high"]
  },
  missing_expected_date: {
    label: "Termen comercial lipsă",
    explanation: "Oportunitatea nu are un termen estimat pentru decizie sau închidere.",
    severity: "low",
    sources: ["opportunities.deadline"]
  },
  proposal_without_follow_up: {
    label: "Propunere fără follow-up",
    explanation: "Oportunitatea este în etapa de propunere, dar nu are o acțiune de urmărire.",
    severity: "high",
    sources: ["opportunities.status", "opportunity_actions.status"]
  },
  insufficient_data: {
    label: "Date insuficiente",
    explanation: "Lipsesc mai multe date esențiale pentru o evaluare operațională sigură.",
    severity: "medium",
    sources: ["opportunities", "opportunity_actions", "opportunity_contacts"]
  }
};

function reason(code: AttentionReasonCode): OpportunityAttentionReason {
  return { code, ...definitions[code] };
}

function isDecisionMaker(opportunity: Opportunity) {
  const accepted = new Set(["decision_maker", "economic_buyer", "decident", "buyer", "approver"]);
  return Boolean(opportunity.contacts?.some((association) => {
    const relationshipRole = association.role?.trim().toLowerCase().replaceAll(" ", "_");
    const contactRole = association.contact.decisionRole?.trim().toLowerCase().replaceAll(" ", "_");
    return (relationshipRole && accepted.has(relationshipRole)) || (contactRole && accepted.has(contactRole));
  }));
}

function latestActivity(opportunity: Opportunity) {
  const meaningfulEvent = /^(stage_changed|marked_contacted|contacted|follow_up_scheduled|next_action_(created|completed)|action_(completed|postponed)|primary_contact_changed|contact_assigned|outcome_(recorded|corrected)|lifecycle_reopened)$/;
  const values = [
    opportunity.createdAt,
    ...opportunity.timeline
      .filter((event) => Boolean(event.type && meaningfulEvent.test(event.type)))
      .map((event) => event.date)
  ].filter((value): value is string => Boolean(value && !Number.isNaN(Date.parse(value))));
  values.sort((left, right) => right.localeCompare(left));
  return values[0] ?? null;
}

export function assessOpportunityAttention(
  opportunity: Opportunity,
  options: { now?: Date; staleAfterDays?: number } = {}
): OpportunityAttentionAssessment {
  const primaryNextAction = selectPrimaryNextAction(opportunity.actions);
  const lastMeaningfulActivityAt = latestActivity(opportunity);

  if (!isOpenOpportunity(opportunity)) {
    return { state: "closed", reasons: [], primaryNextAction, lastMeaningfulActivityAt };
  }

  const now = options.now ?? new Date();
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_ACTIVITY_DAYS;
  const reasons: OpportunityAttentionReason[] = [];
  const primaryContact = opportunity.contacts?.find((contact) => contact.isPrimary) ?? null;

  if (!primaryNextAction) reasons.push(reason("missing_next_action"));
  if (primaryNextAction?.dueDate && Date.parse(primaryNextAction.dueDate) < now.getTime()) {
    reasons.push(reason("overdue_next_action"));
  }
  if (!opportunity.ownerProfileId) reasons.push(reason("unassigned_owner"));
  if (!primaryContact) reasons.push(reason("missing_primary_contact"));
  if (!isDecisionMaker(opportunity)) reasons.push(reason("missing_decision_maker"));
  if (Number(opportunity.estimatedValueHigh ?? 0) <= 0 && Number(opportunity.estimatedValueLow ?? 0) <= 0) {
    reasons.push(reason("missing_value"));
  }
  if (!opportunity.deadline) reasons.push(reason("missing_expected_date"));
  if (stageForLegacyStatus(opportunity.status) === "proposal" && !primaryNextAction) {
    reasons.push(reason("proposal_without_follow_up"));
  }
  if (lastMeaningfulActivityAt) {
    const ageMs = now.getTime() - Date.parse(lastMeaningfulActivityAt);
    if (ageMs > staleAfterDays * 86_400_000) reasons.push(reason("stale_activity"));
  }

  const missingCoreData = [
    !opportunity.ownerProfileId,
    !primaryContact,
    !primaryNextAction,
    Number(opportunity.estimatedValueHigh ?? 0) <= 0,
    !opportunity.deadline
  ].filter(Boolean).length;
  if (missingCoreData >= 3) reasons.push(reason("insufficient_data"));

  const state: OpportunityAttentionState = reasons.some((item) => item.severity === "high")
    ? "at_risk"
    : reasons.length > 0
      ? "needs_attention"
      : "on_track";

  return { state, reasons, primaryNextAction, lastMeaningfulActivityAt };
}
