import "server-only";

import { isOpenOpportunity } from "@/lib/opportunity-domain";
import type { Opportunity } from "@/lib/types";

export type DiscoverySeverity = "critical" | "attention" | "informative";

export type DiscoveryIssueCode =
  | "overdue_next_action"
  | "missing_owner"
  | "missing_next_action"
  | "high_priority_signal"
  | "pending_approval"
  | "inactive_company"
  | "missing_primary_contact";

export type DiscoveryCandidateType =
  | "company_risk"
  | "opportunity_risk"
  | "follow_up_gap"
  | "approval_blocker"
  | "signal_to_review"
  | "prepared_work_not_advanced"
  | "ownership_gap"
  | "next_action_gap";

export type DiscoveryEvidence = {
  sourceType: string;
  sourceId: string;
  sourceTimestamp: string | null;
  label: string;
  href?: string;
};

export type OpportunityDiscoveryCandidate = {
  id: string;
  type: DiscoveryCandidateType;
  title: string;
  reason: string;
  whyItMatters: string;
  severity: DiscoverySeverity;
  evidence: DiscoveryEvidence[];
  relatedCompanyId: string;
  relatedOpportunityId?: string;
  actionLabel: string;
  actionHref: string;
  occurredAt: string | null;
  estimatedValue?: number;
  currency?: string;
};

export type ExecutiveDecisionSnapshot = {
  relationshipStatus: "stable" | "attention" | "critical";
  statusLabel: "Stabil" | "Necesită atenție" | "Critic";
  primaryRisk: string;
  primaryRiskDetail: string;
  whyItMatters: string;
  safeNextActionLabel: string;
  safeNextActionHref: string;
  evidence: DiscoveryEvidence[];
};

type DiscoveryAttention = {
  id: string;
  code: DiscoveryIssueCode;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  occurredAt: string | null;
  evidence: DiscoveryEvidence;
};

type DiscoveryInput = {
  organizationId: string;
  attention: DiscoveryAttention[];
  opportunities: Opportunity[];
};

const severityRank: Record<DiscoverySeverity, number> = { critical: 3, attention: 2, informative: 1 };
const typeRank: Record<DiscoveryCandidateType, number> = {
  follow_up_gap: 8,
  approval_blocker: 7,
  signal_to_review: 6,
  opportunity_risk: 5,
  ownership_gap: 4,
  next_action_gap: 4,
  prepared_work_not_advanced: 3,
  company_risk: 2
};

export function whyItMattersForIssue(code: DiscoveryIssueCode) {
  const explanations: Record<DiscoveryIssueCode, string> = {
    overdue_next_action: "Întârzierea poate reduce șansa de răspuns și poate lăsa clientul fără claritate.",
    pending_approval: "Acțiunea comercială nu poate avansa controlat până când aprobarea umană nu este finalizată.",
    high_priority_signal: "Un semnal prioritar nerezolvat poate întârzia o decizie comercială care necesită verificare umană.",
    missing_owner: "Fără responsabil atribuit, oportunitatea poate rămâne nerezolvată chiar dacă există interes comercial.",
    missing_next_action: "Fără următorul pas, oportunitatea nu are un traseu operațional clar.",
    missing_primary_contact: "Fără contact principal, relația poate rămâne fără continuitate când responsabilul se schimbă.",
    inactive_company: "Lipsa activității recente poate ascunde un follow-up uitat sau o relație rămasă fără continuitate."
  };
  return explanations[code];
}

function candidateType(code: DiscoveryIssueCode): DiscoveryCandidateType {
  if (code === "overdue_next_action") return "follow_up_gap";
  if (code === "pending_approval") return "approval_blocker";
  if (code === "high_priority_signal") return "signal_to_review";
  if (code === "missing_owner") return "ownership_gap";
  if (code === "missing_next_action") return "next_action_gap";
  return "company_risk";
}

function candidateSeverity(item: DiscoveryAttention): DiscoverySeverity {
  if (item.severity === "critical") return "critical";
  if (item.code === "inactive_company" || item.severity === "low") return "informative";
  return "attention";
}

function opportunityForEvidence(opportunities: Opportunity[], evidence: DiscoveryEvidence) {
  return opportunities.find((opportunity) => opportunity.id === evidence.sourceId
    || opportunity.actions.some((action) => action.id === evidence.sourceId)
    || opportunity.documents.some((document) => document.id === evidence.sourceId)
    || opportunity.timeline.some((event) => event.id === evidence.sourceId));
}

export function discoverCompanyOpportunities(input: DiscoveryInput, options: { limit?: number } = {}): OpportunityDiscoveryCandidate[] {
  const candidates: OpportunityDiscoveryCandidate[] = input.attention.map((item) => {
    const opportunity = opportunityForEvidence(input.opportunities, item.evidence);
    const estimatedValue = opportunity && Number(opportunity.estimatedValueHigh) > 0 ? Number(opportunity.estimatedValueHigh) : undefined;
    return {
      id: `discovery:${item.id}`,
      type: candidateType(item.code),
      title: item.title,
      reason: item.description,
      whyItMatters: whyItMattersForIssue(item.code),
      severity: candidateSeverity(item),
      evidence: [item.evidence],
      relatedCompanyId: input.organizationId,
      ...(opportunity ? { relatedOpportunityId: opportunity.id } : {}),
      actionLabel: item.actionLabel,
      actionHref: item.href,
      occurredAt: item.occurredAt,
      ...(estimatedValue !== undefined ? { estimatedValue, currency: opportunity?.currency ?? "RON" } : {})
    };
  });

  for (const opportunity of input.opportunities.filter(isOpenOpportunity)) {
    for (const document of opportunity.documents) {
      const prepared = ["approved", "ready_to_send"].includes(document.status);
      const advanced = document.sendStatus === "sent" || document.status === "sent" || Boolean(document.sentAt);
      if (!prepared || advanced) continue;
      const href = `/opportunities/${opportunity.id}#documents`;
      const timestamp = document.readyAt ?? document.editedAt ?? document.createdAt ?? null;
      candidates.push({
        id: `discovery:document:${document.id}`,
        type: "prepared_work_not_advanced",
        title: document.status === "approved" ? "Document aprobat, trimitere neconfirmată" : "Document pregătit, acțiune finală necesară",
        reason: `„${document.title}” este pregătit, dar nu are o livrare confirmată.`,
        whyItMatters: "Munca este pregătită, dar valoarea nu ajunge la client fără o acțiune finală controlată.",
        severity: "attention",
        evidence: [{ sourceType: "opportunity_document", sourceId: document.id, sourceTimestamp: timestamp, label: `Documentul „${document.title}”`, href }],
        relatedCompanyId: input.organizationId,
        relatedOpportunityId: opportunity.id,
        actionLabel: "Revizuiește documentul",
        actionHref: href,
        occurredAt: timestamp,
        ...(Number(opportunity.estimatedValueHigh) > 0 ? { estimatedValue: Number(opportunity.estimatedValueHigh), currency: opportunity.currency ?? "RON" } : {})
      });
    }
  }

  const uniqueCandidates = new Map<string, OpportunityDiscoveryCandidate>();
  for (const candidate of candidates) {
    const primaryEvidence = candidate.evidence[0];
    const key = ["approval", "commercial_signal"].includes(primaryEvidence?.sourceType ?? "")
      ? `signal:${primaryEvidence?.sourceId}`
      : `${candidate.type}:${primaryEvidence?.sourceType}:${primaryEvidence?.sourceId}`;
    if (!uniqueCandidates.has(key)) uniqueCandidates.set(key, candidate);
  }

  return Array.from(uniqueCandidates.values())
    .filter((candidate) => candidate.evidence.length > 0 && candidate.evidence.every((item) => item.sourceId && item.label))
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity]
      || typeRank[right.type] - typeRank[left.type]
      || String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? ""))
      || left.id.localeCompare(right.id))
    .slice(0, options.limit ?? 8);
}

export function buildExecutiveDecisionSnapshot(input: {
  candidates: OpportunityDiscoveryCandidate[];
  organizationHref: string;
  organizationEvidence: DiscoveryEvidence;
}): ExecutiveDecisionSnapshot {
  const primary = input.candidates[0];
  if (!primary) {
    return {
      relationshipStatus: "stable",
      statusLabel: "Stabil",
      primaryRisk: "Nu există un risc comercial critic dovedit în datele disponibile.",
      primaryRiskDetail: "Datele existente nu indică o buclă comercială urgentă.",
      whyItMatters: "Conducerea poate continua monitorizarea fără o intervenție urgentă.",
      safeNextActionLabel: "Revizuiește compania",
      safeNextActionHref: input.organizationHref,
      evidence: [input.organizationEvidence]
    };
  }
  const relationshipStatus = primary.severity === "critical" ? "critical" : primary.severity === "attention" ? "attention" : "stable";
  return {
    relationshipStatus,
    statusLabel: relationshipStatus === "critical" ? "Critic" : relationshipStatus === "attention" ? "Necesită atenție" : "Stabil",
    primaryRisk: primary.title,
    primaryRiskDetail: primary.reason,
    whyItMatters: primary.whyItMatters,
    safeNextActionLabel: primary.actionLabel,
    safeNextActionHref: primary.actionHref,
    evidence: primary.evidence
  };
}
