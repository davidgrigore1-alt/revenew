import { approvalStateForSignal } from "@/lib/approval-center";
import {
  assessOpportunityAttention,
  type AttentionReasonCode,
  type OpportunityAttentionAssessment
} from "@/lib/opportunity-attention";
import {
  lifecycleForOpportunity,
  stageForLegacyStatus
} from "@/lib/opportunity-domain";
import type { CommercialSignal, Opportunity } from "@/lib/types";
import { assessCommercialExecution, type CommercialCommunication, type CommercialExecutionAssessment } from "@/lib/commercial-execution";

export type CommercialStateEvidenceType =
  | "opportunity"
  | "action"
  | "contact"
  | "event"
  | "document"
  | "approval"
  | "response"
  | "outcome";

export type CommercialStateEvidence = {
  id: string;
  sourceType: CommercialStateEvidenceType;
  sourceId: string;
  label: string;
  observedAt: string | null;
  href: string;
};

export type CommercialStateExceptionCode = AttentionReasonCode
  | "pending_approval"
  | "prepared_document_not_advanced"
  | "outreach_restricted";

export type CommercialStateException = {
  code: CommercialStateExceptionCode;
  label: string;
  explanation: string;
  rule: string;
  severity: "critical" | "attention" | "informative";
  evidenceIds: string[];
  missingInformation: string[];
  safeAction: { label: string; href: string };
};

export type OpportunityCommercialState = {
  opportunityId: string;
  title: string;
  organization: { id: string | null; name: string | null };
  primaryContact: { id: string; name: string } | null;
  stage: ReturnType<typeof stageForLegacyStatus>;
  lifecycle: ReturnType<typeof lifecycleForOpportunity>;
  financial: {
    estimatedValue: number | null;
    currency: string;
    confirmedRevenue: number | null;
    confirmedRevenueCurrency: string | null;
  };
  ownership: {
    ownerProfileId: string | null;
    ownerName: string | null;
    validity: "missing" | "unverified" | "confirmed";
  };
  activity: {
    lastMeaningfulActivityAt: string | null;
    inactivityDays: number | null;
  };
  nextAction: {
    id: string;
    title: string;
    dueAt: string | null;
    ownerProfileId: string | null;
    ownerName: string | null;
    overdue: boolean;
  } | null;
  flags: {
    nextActionMissing: boolean;
    nextActionOverdue: boolean;
    followUpOverdue: boolean;
    stale: boolean;
    blocked: boolean;
  };
  approval: {
    state: "not_required" | "pending";
    pendingCount: number;
    signalId: string | null;
  };
  document: {
    state: "none" | "draft" | "prepared" | "sent";
    id: string | null;
    title: string | null;
  };
  outreach: {
    restricted: boolean;
    reason: Opportunity["outreachRestrictionReason"];
  };
  response: {
    state: "none" | "recorded";
    category: string | null;
    respondedAt: string | null;
  };
  communication: {
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
    nextMeetingAt: string | null;
    responseWindowDays: number;
  };
  execution: CommercialExecutionAssessment;
  outcome: {
    state: ReturnType<typeof lifecycleForOpportunity>;
    confirmedByHuman: boolean;
    recordedAt: string | null;
  };
  attention: OpportunityAttentionAssessment;
  exceptions: CommercialStateException[];
  evidence: CommercialStateEvidence[];
  missingInformation: string[];
  recommendedSafeIntervention: { label: string; href: string };
  humanDecisionRequired: boolean;
  auditReferences: string[];
};

const exceptionPriority: Record<CommercialStateExceptionCode, number> = {
  overdue_next_action: 1000,
  pending_approval: 900,
  outreach_restricted: 850,
  prepared_document_not_advanced: 800,
  missing_next_action: 750,
  proposal_without_follow_up: 725,
  unassigned_owner: 700,
  missing_primary_contact: 600,
  stale_activity: 500,
  missing_decision_maker: 400,
  missing_value: 300,
  missing_expected_date: 200,
  insufficient_data: 100
};

function validTimestamp(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

function evidenceId(sourceType: CommercialStateEvidenceType, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function companyFor(opportunity: Opportunity) {
  const contact = opportunity.contacts?.find((item) => item.isPrimary) ?? opportunity.contacts?.find((item) => item.contact.organization);
  return {
    id: opportunity.organizationId ?? contact?.contact.organizationId ?? null,
    name: contact?.contact.organization?.name ?? opportunity.contact?.company ?? null
  };
}

function severityFor(code: AttentionReasonCode): CommercialStateException["severity"] {
  if (code === "overdue_next_action") return "critical";
  if (["missing_next_action", "proposal_without_follow_up", "unassigned_owner"].includes(code)) return "attention";
  return "informative";
}

function safeActionFor(code: CommercialStateExceptionCode, opportunityId: string, signalId?: string | null) {
  const base = `/opportunities/${opportunityId}`;
  if (code === "pending_approval" && signalId) return { label: "Verifică aprobarea", href: `/approvals?signal=${signalId}` };
  if (code === "prepared_document_not_advanced") return { label: "Revizuiește documentele", href: `${base}#opportunity-documents` };
  if (code === "missing_next_action" || code === "proposal_without_follow_up") return { label: "Completează următoarea acțiune", href: `${base}#action-schedule` };
  if (code === "overdue_next_action") return { label: "Revizuiește acțiunea restantă", href: `${base}#workflow-actions-list` };
  if (code === "unassigned_owner") return { label: "Atribuie responsabil", href: `${base}#action-responsibility` };
  if (code === "missing_primary_contact" || code === "missing_decision_maker") return { label: "Completează contactele", href: `${base}#opportunity-contacts` };
  if (code === "outreach_restricted") return { label: "Verifică restricția", href: `${base}#commercial-response` };
  return { label: "Revizuiește oportunitatea", href: base };
}

export function buildOpportunityCommercialState(
  opportunity: Opportunity,
  options: { now?: Date; staleAfterDays?: number; linkedSignals?: CommercialSignal[]; communication?: CommercialCommunication; explicitBlocker?: string | null; waitingInternal?: string | null } = {}
): OpportunityCommercialState {
  const now = options.now ?? new Date();
  const baseHref = `/opportunities/${opportunity.id}`;
  const linkedSignals = (options.linkedSignals ?? []).filter((signal) =>
    signal.detectedFromOpportunityId === opportunity.id || signal.convertedOpportunityId === opportunity.id
  );
  const attention = assessOpportunityAttention(opportunity, { now, staleAfterDays: options.staleAfterDays });
  const primaryContact = opportunity.contacts?.find((item) => item.isPrimary) ?? null;
  const nextAction = attention.primaryNextAction;
  const nextActionOverdue = Boolean(nextAction?.dueDate && Date.parse(nextAction.dueDate) < now.getTime());
  const pendingApprovals = linkedSignals.filter((signal) => approvalStateForSignal(signal) === "pending");
  const preparedDocument = [...opportunity.documents]
    .filter((document) => ["approved", "ready_to_send"].includes(document.status) && document.sendStatus !== "sent" && !document.sentAt)
    .sort((left, right) => String(right.readyAt ?? right.editedAt ?? right.createdAt ?? "").localeCompare(String(left.readyAt ?? left.editedAt ?? left.createdAt ?? "")))[0] ?? null;
  const sentDocument = [...opportunity.documents]
    .filter((document) => document.status === "sent" || document.sendStatus === "sent" || Boolean(document.sentAt))
    .sort((left, right) => String(right.sentAt ?? right.createdAt ?? "").localeCompare(String(left.sentAt ?? left.createdAt ?? "")))[0] ?? null;
  const draftDocument = [...opportunity.documents]
    .filter((document) => ["draft", "edited", "copied"].includes(document.status))
    .sort((left, right) => String(right.editedAt ?? right.createdAt ?? "").localeCompare(String(left.editedAt ?? left.createdAt ?? "")))[0] ?? null;
  const latestResponse = [...(opportunity.responses ?? [])]
    .sort((left, right) => right.respondedAt.localeCompare(left.respondedAt))[0] ?? null;
  const latestEvent = [...opportunity.timeline]
    .filter((event) => validTimestamp(event.date))
    .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null;
  const evidence: CommercialStateEvidence[] = [{
    id: evidenceId("opportunity", opportunity.id),
    sourceType: "opportunity",
    sourceId: opportunity.id,
    label: `Oportunitatea „${opportunity.title}”`,
    observedAt: validTimestamp(opportunity.updatedAt) ?? validTimestamp(opportunity.createdAt),
    href: baseHref
  }];

  if (nextAction) evidence.push({ id: evidenceId("action", nextAction.id), sourceType: "action", sourceId: nextAction.id, label: `Acțiunea „${nextAction.title}”`, observedAt: validTimestamp(nextAction.updatedAt) ?? validTimestamp(nextAction.createdAt) ?? validTimestamp(nextAction.dueDate), href: `${baseHref}#workflow-actions-list` });
  if (primaryContact) evidence.push({ id: evidenceId("contact", primaryContact.contact.id), sourceType: "contact", sourceId: primaryContact.contact.id, label: `Contact principal: ${primaryContact.contact.fullName}`, observedAt: validTimestamp(primaryContact.updatedAt) ?? validTimestamp(primaryContact.createdAt), href: `${baseHref}#opportunity-contacts` });
  if (latestEvent) evidence.push({ id: evidenceId("event", latestEvent.id), sourceType: "event", sourceId: latestEvent.id, label: latestEvent.label, observedAt: validTimestamp(latestEvent.date), href: `${baseHref}#opportunity-timeline` });
  if (preparedDocument) evidence.push({ id: evidenceId("document", preparedDocument.id), sourceType: "document", sourceId: preparedDocument.id, label: `Document pregătit: ${preparedDocument.title}`, observedAt: validTimestamp(preparedDocument.readyAt) ?? validTimestamp(preparedDocument.editedAt) ?? validTimestamp(preparedDocument.createdAt), href: `${baseHref}#opportunity-documents` });
  if (sentDocument) evidence.push({ id: evidenceId("document", sentDocument.id), sourceType: "document", sourceId: sentDocument.id, label: `Document trimis: ${sentDocument.title}`, observedAt: validTimestamp(sentDocument.sentAt) ?? validTimestamp(sentDocument.createdAt), href: `${baseHref}#opportunity-documents` });
  if (pendingApprovals[0]) evidence.push({ id: evidenceId("approval", pendingApprovals[0].id), sourceType: "approval", sourceId: pendingApprovals[0].id, label: `Aprobare în așteptare: ${pendingApprovals[0].title}`, observedAt: validTimestamp(pendingApprovals[0].reviewDueAt) ?? validTimestamp(pendingApprovals[0].updatedAt) ?? validTimestamp(pendingApprovals[0].createdAt), href: `/approvals?signal=${pendingApprovals[0].id}` });
  if (latestResponse) evidence.push({ id: evidenceId("response", latestResponse.id), sourceType: "response", sourceId: latestResponse.id, label: `Răspuns comercial: ${latestResponse.summary}`, observedAt: validTimestamp(latestResponse.respondedAt), href: `${baseHref}#commercial-response` });

  const lifecycle = lifecycleForOpportunity(opportunity);
  const confirmedRevenue = lifecycle === "won" && Number(opportunity.actualOutcomeAmount ?? 0) > 0
    ? Number(opportunity.actualOutcomeAmount)
    : null;
  if (lifecycle !== "open" && opportunity.outcomeRecordedAt) evidence.push({ id: evidenceId("outcome", opportunity.id), sourceType: "outcome", sourceId: opportunity.id, label: lifecycle === "won" ? "Rezultat câștigat confirmat de utilizator" : "Rezultat pierdut confirmat de utilizator", observedAt: validTimestamp(opportunity.outcomeRecordedAt), href: `${baseHref}#action-outcome` });

  const missingInformation = Array.from(new Set([
    !opportunity.ownerProfileId ? "Responsabilul comercial nu este atribuit." : !opportunity.ownerName ? "Identitatea responsabilului trebuie verificată." : "",
    !primaryContact ? "Contactul principal nu este confirmat." : "",
    !nextAction ? "Următoarea acțiune și termenul nu sunt confirmate." : "",
    nextAction && !nextAction.assignedToProfileId && !opportunity.ownerProfileId ? "Responsabilul următoarei acțiuni nu este confirmat." : "",
    Number(opportunity.estimatedValueHigh ?? 0) <= 0 ? "Valoarea estimată nu este disponibilă." : "",
    evidence.length <= 1 ? "Lipsește o dovadă comercială suplimentară față de înregistrarea oportunității." : ""
  ].filter(Boolean)));

  const evidenceByType = (type: CommercialStateEvidenceType) => evidence.filter((item) => item.sourceType === type).map((item) => item.id);
  const exceptions: CommercialStateException[] = attention.reasons.map((reason) => ({
    code: reason.code,
    label: reason.label,
    explanation: reason.explanation,
    rule: reason.sources.join(" + "),
    severity: severityFor(reason.code),
    evidenceIds: reason.code === "overdue_next_action" ? evidenceByType("action") : reason.code.includes("contact") || reason.code === "missing_decision_maker" ? evidenceByType("contact") : [evidenceId("opportunity", opportunity.id)],
    missingInformation: reason.code.startsWith("missing_") || reason.code === "unassigned_owner" ? missingInformation : [],
    safeAction: safeActionFor(reason.code, opportunity.id)
  }));

  if (pendingApprovals.length) exceptions.push({ code: "pending_approval", label: "Aprobare în așteptare", explanation: "Fluxul nu poate continua în siguranță până la decizia unui utilizator autorizat.", rule: "commercial_signals.review_status", severity: "attention", evidenceIds: evidenceByType("approval"), missingInformation: ["Decizia de aprobare nu este încă înregistrată."], safeAction: safeActionFor("pending_approval", opportunity.id, pendingApprovals[0]?.id) });
  if (preparedDocument) exceptions.push({ code: "prepared_document_not_advanced", label: "Document pregătit, pas final neconfirmat", explanation: "Există material comercial pregătit fără dovadă de utilizare sau trimitere.", rule: "opportunity_documents.status + send_status", severity: "attention", evidenceIds: evidenceByType("document"), missingInformation: ["Utilizarea sau trimiterea documentului nu este confirmată."], safeAction: safeActionFor("prepared_document_not_advanced", opportunity.id) });
  if (opportunity.outreachRestrictedAt) exceptions.push({ code: "outreach_restricted", label: "Contactarea este restricționată", explanation: "O restricție înregistrată blochează orice follow-up extern până la verificarea umană.", rule: "opportunities.outreach_restricted_at", severity: "critical", evidenceIds: [evidenceId("opportunity", opportunity.id)], missingInformation: [], safeAction: safeActionFor("outreach_restricted", opportunity.id) });
  exceptions.sort((left, right) => exceptionPriority[right.code] - exceptionPriority[left.code] || left.code.localeCompare(right.code));

  const lastMeaningful = attention.lastMeaningfulActivityAt;
  const inactivityDays = lastMeaningful ? Math.max(0, Math.floor((now.getTime() - Date.parse(lastMeaningful)) / 86_400_000)) : null;
  const document = sentDocument
    ? { state: "sent" as const, id: sentDocument.id, title: sentDocument.title }
    : preparedDocument
      ? { state: "prepared" as const, id: preparedDocument.id, title: preparedDocument.title }
      : draftDocument
        ? { state: "draft" as const, id: draftDocument.id, title: draftDocument.title }
        : { state: "none" as const, id: null, title: null };
  const recommendedSafeIntervention = exceptions[0]?.safeAction ?? { label: "Revizuiește oportunitatea", href: baseHref };
  const responseWindowDays = Math.min(10, Math.max(1, options.communication?.expectedResponseWindowDays ?? 3));
  const execution = assessCommercialExecution({
    now, lifecycleOpen: lifecycle === "open", ownerMissing: !opportunity.ownerProfileId, nextActionMissing: !nextAction,
    nextActionOverdue, approvalPending: pendingApprovals.length > 0, outreachRestricted: Boolean(opportunity.outreachRestrictedAt),
    explicitBlocker: options.explicitBlocker, waitingInternal: options.waitingInternal,
    preparedWorkState: preparedDocument ? "ready_for_review" : draftDocument ? "prepared" : "none",
    attentionRequired: attention.state === "at_risk", communication: options.communication
  });

  return {
    opportunityId: opportunity.id,
    title: opportunity.title,
    organization: companyFor(opportunity),
    primaryContact: primaryContact ? { id: primaryContact.contact.id, name: primaryContact.contact.fullName } : null,
    stage: stageForLegacyStatus(opportunity.status),
    lifecycle,
    financial: { estimatedValue: Number(opportunity.estimatedValueHigh ?? 0) > 0 ? Number(opportunity.estimatedValueHigh) : null, currency: opportunity.currency ?? "RON", confirmedRevenue, confirmedRevenueCurrency: confirmedRevenue === null ? null : opportunity.currency ?? "RON" },
    ownership: { ownerProfileId: opportunity.ownerProfileId ?? null, ownerName: opportunity.ownerName ?? null, validity: !opportunity.ownerProfileId ? "missing" : opportunity.ownerName ? "confirmed" : "unverified" },
    activity: { lastMeaningfulActivityAt: lastMeaningful, inactivityDays },
    nextAction: nextAction ? { id: nextAction.id, title: nextAction.title, dueAt: validTimestamp(nextAction.dueDate), ownerProfileId: nextAction.assignedToProfileId ?? opportunity.ownerProfileId ?? null, ownerName: nextAction.assignedToName ?? opportunity.ownerName ?? null, overdue: nextActionOverdue } : null,
    flags: { nextActionMissing: !nextAction, nextActionOverdue, followUpOverdue: nextActionOverdue, stale: attention.reasons.some((reason) => reason.code === "stale_activity"), blocked: exceptions.some((item) => item.severity === "critical") },
    approval: { state: pendingApprovals.length ? "pending" : "not_required", pendingCount: pendingApprovals.length, signalId: pendingApprovals[0]?.id ?? null },
    document,
    outreach: { restricted: Boolean(opportunity.outreachRestrictedAt), reason: opportunity.outreachRestrictionReason ?? null },
    response: { state: latestResponse ? "recorded" : "none", category: latestResponse?.category ?? null, respondedAt: latestResponse?.respondedAt ?? null },
    communication: { lastInboundAt: options.communication?.lastInboundAt ?? null, lastOutboundAt: options.communication?.lastOutboundAt ?? null, nextMeetingAt: options.communication?.nextMeetingAt ?? null, responseWindowDays },
    execution,
    outcome: { state: lifecycle, confirmedByHuman: lifecycle !== "open" && Boolean(opportunity.outcomeRecordedByProfileId || opportunity.outcomeRecordedAt), recordedAt: opportunity.outcomeRecordedAt ?? null },
    attention,
    exceptions,
    evidence: evidence.slice(0, 12),
    missingInformation,
    recommendedSafeIntervention,
    humanDecisionRequired: exceptions.length > 0 || lifecycle === "open",
    auditReferences: evidence.map((item) => item.id)
  };
}
