import "server-only";

import { approvalStateForSignal } from "@/lib/approval-center";
import { assessOpportunityAttention } from "@/lib/opportunity-attention";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import type { RecoverySummary } from "@/lib/recovery";
import type { CommercialSignal, Opportunity } from "@/lib/types";

export type WorkspaceDecisionSeverity = "critical" | "attention" | "informative";

export type WorkspaceDecisionType =
  | "overdue_follow_up"
  | "pending_approval"
  | "prepared_work_not_advanced"
  | "unresolved_signal"
  | "opportunity_without_next_action"
  | "opportunity_without_owner"
  | "company_without_primary_contact"
  | "inactive_active_opportunity"
  | "high_value_blocked_opportunity";

export type WorkspaceDecisionEvidence = {
  sourceType: "opportunity" | "opportunity_action" | "opportunity_document" | "commercial_signal" | "approval";
  sourceId: string;
  sourceTimestamp: string | null;
  label: string;
  href: string;
};

export type WorkspaceDecisionItem = {
  id: string;
  type: WorkspaceDecisionType;
  title: string;
  reason: string;
  whyItMatters: string;
  severity: WorkspaceDecisionSeverity;
  relatedCompanyId?: string;
  relatedCompanyName?: string;
  relatedOpportunityId?: string;
  relatedOpportunityTitle?: string;
  actionLabel: string;
  actionHref: string;
  evidence: WorkspaceDecisionEvidence[];
  occurredAt: string | null;
  dueAt?: string;
  estimatedValue?: number;
  currency?: string;
  ownerName?: string;
  statusLabel: string;
};

export type WorkspaceDecisionQueue = {
  items: WorkspaceDecisionItem[];
  totalCandidates: number;
  criticalCount: number;
  attentionCount: number;
  sourceState: "empty_workspace" | "signals_only" | "opportunities_available";
};

const severityRank: Record<WorkspaceDecisionSeverity, number> = { critical: 3, attention: 2, informative: 1 };
const typeRank: Record<WorkspaceDecisionType, number> = {
  overdue_follow_up: 9,
  pending_approval: 8,
  prepared_work_not_advanced: 7,
  high_value_blocked_opportunity: 6,
  opportunity_without_next_action: 5,
  opportunity_without_owner: 5,
  unresolved_signal: 4,
  company_without_primary_contact: 3,
  inactive_active_opportunity: 2
};

function validTimestamp(value?: string | null) {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function opportunityContext(opportunity: Opportunity) {
  const primary = opportunity.contacts?.find((contact) => contact.isPrimary) ?? opportunity.contacts?.[0];
  const relatedCompanyId = opportunity.organizationId ?? primary?.contact.organizationId ?? undefined;
  const relatedCompanyName = primary?.contact.organization?.name ?? opportunity.contact?.company ?? undefined;
  return { relatedCompanyId, relatedCompanyName };
}

function signalContext(signal: CommercialSignal) {
  return {
    relatedCompanyId: signal.matchedOrganizationId ?? undefined,
    relatedCompanyName: signal.contactCompany ?? undefined
  };
}

function supportedEstimate(value: number | null | undefined, currency: string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 && currency ? { estimatedValue: amount, currency } : {};
}

function opportunityEstimate(opportunity: Opportunity) {
  return supportedEstimate(opportunity.estimatedValueHigh, opportunity.currency ?? "RON");
}

function opportunityFields(opportunity: Opportunity) {
  return {
    ...opportunityContext(opportunity),
    relatedOpportunityId: opportunity.id,
    relatedOpportunityTitle: opportunity.title,
    ...(opportunity.ownerName ? { ownerName: opportunity.ownerName } : {}),
    ...opportunityEstimate(opportunity)
  };
}

function compareItems(left: WorkspaceDecisionItem, right: WorkspaceDecisionItem) {
  const severity = severityRank[right.severity] - severityRank[left.severity];
  if (severity) return severity;

  const leftDue = validTimestamp(left.dueAt);
  const rightDue = validTimestamp(right.dueAt);
  if (leftDue && rightDue && leftDue !== rightDue) return leftDue.localeCompare(rightDue);
  if (leftDue !== rightDue) return leftDue ? -1 : 1;

  const type = typeRank[right.type] - typeRank[left.type];
  if (type) return type;

  if (left.currency && left.currency === right.currency) {
    const value = Number(right.estimatedValue ?? 0) - Number(left.estimatedValue ?? 0);
    if (value) return value;
  }

  const recency = String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? ""));
  return recency || left.id.localeCompare(right.id);
}

function opportunityEvidence(opportunity: Opportunity, href: string): WorkspaceDecisionEvidence {
  return {
    sourceType: "opportunity",
    sourceId: opportunity.id,
    sourceTimestamp: validTimestamp(opportunity.updatedAt) ?? validTimestamp(opportunity.createdAt),
    label: `Oportunitatea „${opportunity.title}”`,
    href
  };
}

export function buildWorkspaceDecisionQueue(
  input: Pick<RecoverySummary, "opportunities" | "signals">,
  options: { now?: Date; limit?: number } = {}
): WorkspaceDecisionQueue {
  const now = options.now ?? new Date();
  const candidates: WorkspaceDecisionItem[] = [];

  for (const opportunity of input.opportunities.filter(isOpenOpportunity)) {
    const href = `/opportunities/${opportunity.id}`;
    const assessment = assessOpportunityAttention(opportunity, { now });
    const nextAction = assessment.primaryNextAction;
    const timestamp = assessment.lastMeaningfulActivityAt ?? validTimestamp(opportunity.updatedAt) ?? validTimestamp(opportunity.createdAt);
    const common = opportunityFields(opportunity);

    if (nextAction?.dueDate && Date.parse(nextAction.dueDate) < now.getTime()) {
      const actionHref = `${href}#workflow-actions`;
      candidates.push({
        id: `decision:overdue:${nextAction.id}`,
        type: "overdue_follow_up",
        title: "Follow-up întârziat",
        reason: `„${nextAction.title}” a depășit termenul stabilit.`,
        whyItMatters: "Întârzierea poate rupe continuitatea comercială și poate lăsa oportunitatea fără răspuns.",
        severity: "critical",
        ...common,
        actionLabel: "Revizuiește oportunitatea",
        actionHref,
        evidence: [{ sourceType: "opportunity_action", sourceId: nextAction.id, sourceTimestamp: validTimestamp(nextAction.updatedAt) ?? validTimestamp(nextAction.createdAt) ?? validTimestamp(nextAction.dueDate), label: `Acțiunea restantă „${nextAction.title}”`, href: actionHref }],
        occurredAt: validTimestamp(nextAction.updatedAt) ?? validTimestamp(nextAction.createdAt) ?? validTimestamp(nextAction.dueDate),
        dueAt: nextAction.dueDate,
        statusLabel: "Restant"
      });
    }

    const preparedDocument = opportunity.documents
      .filter((document) => ["approved", "ready_to_send"].includes(document.status)
        && document.sendStatus !== "sent" && document.status !== "sent" && !document.sentAt)
      .sort((left, right) => String(right.readyAt ?? right.editedAt ?? right.createdAt ?? "").localeCompare(String(left.readyAt ?? left.editedAt ?? left.createdAt ?? "")))[0];
    if (preparedDocument) {
      const documentHref = `${href}#documents`;
      const documentTimestamp = validTimestamp(preparedDocument.readyAt) ?? validTimestamp(preparedDocument.editedAt) ?? validTimestamp(preparedDocument.createdAt);
      candidates.push({
        id: `decision:prepared:${preparedDocument.id}`,
        type: "prepared_work_not_advanced",
        title: "Document pregătit, pas final neconfirmat",
        reason: `„${preparedDocument.title}” este pregătit, dar nu există dovadă de trimitere.`,
        whyItMatters: "Munca pregătită nu poate susține oportunitatea până când un utilizator nu revizuiește și execută pasul sigur.",
        severity: "attention",
        ...common,
        actionLabel: "Revizuiește documentele",
        actionHref: documentHref,
        evidence: [{ sourceType: "opportunity_document", sourceId: preparedDocument.id, sourceTimestamp: documentTimestamp, label: `Documentul „${preparedDocument.title}”`, href: documentHref }],
        occurredAt: documentTimestamp,
        statusLabel: preparedDocument.status === "approved" ? "Aprobat · netrimis" : "Pregătit · netrimis"
      });
    }

    if (assessment.state === "at_risk" && Number(opportunity.estimatedValueHigh ?? 0) > 0 && !assessment.reasons.some((reason) => reason.code === "overdue_next_action")) {
      candidates.push({
        id: `decision:blocked:${opportunity.id}`,
        type: "high_value_blocked_opportunity",
        title: "Oportunitate cu valoare estimată blocată",
        reason: assessment.reasons.slice(0, 3).map((reason) => reason.label).join(" · "),
        whyItMatters: "O oportunitate cu valoare comercială susținută de date poate pierde ritm dacă blocajele operaționale rămân nerezolvate.",
        severity: "critical",
        ...common,
        actionLabel: "Revizuiește oportunitatea",
        actionHref: href,
        evidence: [opportunityEvidence(opportunity, href)],
        occurredAt: timestamp,
        statusLabel: "În risc"
      });
    }

    if (!nextAction) {
      const actionHref = `${href}#workflow-actions`;
      candidates.push({
        id: `decision:next-action:${opportunity.id}`,
        type: "opportunity_without_next_action",
        title: "Oportunitate fără acțiune următoare",
        reason: `„${opportunity.title}” nu are un pas incomplet cu termen și responsabilitate clară.`,
        whyItMatters: "Fără următorul pas, oportunitatea poate rămâne uitată între echipe sau etape.",
        severity: "attention",
        ...common,
        actionLabel: "Completează următoarea acțiune",
        actionHref,
        evidence: [opportunityEvidence(opportunity, actionHref)],
        occurredAt: timestamp,
        statusLabel: "Acțiune lipsă"
      });
    }

    if (!opportunity.ownerProfileId) {
      candidates.push({
        id: `decision:owner:${opportunity.id}`,
        type: "opportunity_without_owner",
        title: "Oportunitate fără responsabil",
        reason: `„${opportunity.title}” nu are ownership confirmat.`,
        whyItMatters: "Fără responsabil atribuit, următorul pas poate rămâne neexecutat chiar dacă oportunitatea este validă.",
        severity: "attention",
        ...common,
        actionLabel: "Atribuie responsabil",
        actionHref: href,
        evidence: [opportunityEvidence(opportunity, href)],
        occurredAt: timestamp,
        statusLabel: "Neatribuit"
      });
    }

    const primaryContact = opportunity.contacts?.find((contact) => contact.isPrimary);
    if (!primaryContact) {
      const contactHref = `${href}#opportunity-contacts`;
      candidates.push({
        id: `decision:contact:${opportunity.id}`,
        type: "company_without_primary_contact",
        title: "Nu există contact principal",
        reason: `„${opportunity.title}” nu are o persoană principală confirmată.`,
        whyItMatters: "Lipsa contactului principal crește riscul unui follow-up generic, duplicat sau trimis persoanei greșite.",
        severity: "attention",
        ...common,
        actionLabel: "Adaugă contact principal",
        actionHref: contactHref,
        evidence: [opportunityEvidence(opportunity, contactHref)],
        occurredAt: timestamp,
        statusLabel: "Contact lipsă"
      });
    }

    if (assessment.reasons.some((reason) => reason.code === "stale_activity") && nextAction && !(nextAction.dueDate && Date.parse(nextAction.dueDate) < now.getTime())) {
      candidates.push({
        id: `decision:inactive:${opportunity.id}`,
        type: "inactive_active_opportunity",
        title: "Activitate comercială fără progres recent",
        reason: `„${opportunity.title}” este activă, dar ultima activitate importantă este veche.`,
        whyItMatters: "O oportunitate activă fără progres recent poate ascunde un follow-up uitat sau un handoff incomplet.",
        severity: "informative",
        ...common,
        actionLabel: "Revizuiește oportunitatea",
        actionHref: href,
        evidence: [opportunityEvidence(opportunity, href)],
        occurredAt: timestamp,
        statusLabel: "Activitate întârziată"
      });
    }
  }

  for (const signal of input.signals) {
    const approvalState = approvalStateForSignal(signal);
    const timestamp = validTimestamp(signal.reviewedAt) ?? validTimestamp(signal.updatedAt) ?? validTimestamp(signal.createdAt) ?? validTimestamp(signal.occurredAt);
    const common = { ...signalContext(signal), ...supportedEstimate(signal.estimatedRecoverableValue, signal.currency) };
    if (approvalState === "pending") {
      const href = `/approvals?signal=${signal.id}`;
      candidates.push({
        id: `decision:approval:${signal.id}`,
        type: "pending_approval",
        title: "Aprobare în așteptare",
        reason: `„${signal.title}” este pregătit pentru decizia unui utilizator.`,
        whyItMatters: "Semnalul nu poate deveni acțiune sau oportunitate controlată până la aprobarea umană.",
        severity: signal.reviewDueAt && Date.parse(signal.reviewDueAt) < now.getTime() ? "critical" : "attention",
        ...common,
        actionLabel: "Verifică aprobarea",
        actionHref: href,
        evidence: [{ sourceType: "approval", sourceId: signal.id, sourceTimestamp: timestamp, label: `Aprobarea semnalului „${signal.title}”`, href }],
        occurredAt: timestamp,
        ...(validTimestamp(signal.reviewDueAt) ? { dueAt: signal.reviewDueAt ?? undefined } : {}),
        statusLabel: "Decizie umană necesară"
      });
      continue;
    }

    const unresolved = !signal.convertedOpportunityId
      && !["converted", "dismissed", "duplicate", "ignored", "archived"].includes(signal.status)
      && ["high", "urgent"].includes(signal.priority);
    if (unresolved) {
      const href = `/inbox?signal=${signal.id}`;
      candidates.push({
        id: `decision:signal:${signal.id}`,
        type: "unresolved_signal",
        title: "Semnal comercial prioritar nerezolvat",
        reason: signal.primaryRecoveryReason || signal.extractedSummary || signal.title,
        whyItMatters: "Un semnal prioritar neverificat poate întârzia o decizie comercială ce necesită context și control uman.",
        severity: signal.priority === "urgent" || signal.urgencyLevel === "critical" ? "critical" : "attention",
        ...common,
        actionLabel: "Deschide semnalul",
        actionHref: href,
        evidence: [{ sourceType: "commercial_signal", sourceId: signal.id, sourceTimestamp: timestamp, label: `Semnalul „${signal.title}”`, href }],
        occurredAt: timestamp,
        ...(validTimestamp(signal.reviewDueAt ?? signal.suggestedDueDate) ? { dueAt: (signal.reviewDueAt ?? signal.suggestedDueDate) ?? undefined } : {}),
        statusLabel: "Nerezolvat"
      });
    }
  }

  const valid = candidates
    .filter((item) => item.evidence.length > 0 && item.evidence.every((source) => source.sourceId && source.label && source.href))
    .sort(compareItems);
  const limit = Math.max(1, Math.min(options.limit ?? 5, 20));
  return {
    items: valid.slice(0, limit),
    totalCandidates: valid.length,
    criticalCount: valid.filter((item) => item.severity === "critical").length,
    attentionCount: valid.filter((item) => item.severity === "attention").length,
    sourceState: input.opportunities.length > 0 ? "opportunities_available" : input.signals.length > 0 ? "signals_only" : "empty_workspace"
  };
}
