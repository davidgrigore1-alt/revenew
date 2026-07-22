import "server-only";

import { approvalCenterSignals } from "@/lib/approval-center";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getCommercialSignalsForOrganization } from "@/lib/commercial-inbox";
import { isOpenOpportunity, selectPrimaryNextAction } from "@/lib/opportunity-domain";
import { recommendationFeedbackForSignal, type RecommendationFeedback } from "@/lib/recommendation-feedback";
import { buildRevenueRecoveryQueue } from "@/lib/revenue-recovery-queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type {
  CommercialSignal,
  CrmContact,
  CrmOrganization,
  Opportunity,
  OpportunityAction,
  OpportunityContact,
  OpportunityDocument,
  OpportunityEvent
} from "@/lib/types";

export type CompanyEvidenceSource =
  | "organization"
  | "contact"
  | "opportunity_contact"
  | "opportunity"
  | "opportunity_action"
  | "opportunity_document"
  | "opportunity_event"
  | "commercial_signal"
  | "commercial_signal_event"
  | "approval"
  | "recommendation_feedback";

export type CompanyEvidence = {
  sourceType: CompanyEvidenceSource;
  sourceId: string;
  sourceTimestamp: string | null;
  label: string;
  href?: string;
};

export type CompanyAttentionSeverity = "critical" | "high" | "medium" | "low";

export type CompanyAttentionItem = {
  id: string;
  code:
    | "overdue_next_action"
    | "missing_owner"
    | "missing_next_action"
    | "high_priority_signal"
    | "pending_approval"
    | "inactive_company"
    | "missing_primary_contact";
  severity: CompanyAttentionSeverity;
  title: string;
  description: string;
  href: string;
  occurredAt: string | null;
  evidence: CompanyEvidence;
};

export type CompanyTimelineItem = {
  id: string;
  label: string;
  description: string;
  kind: "Semnal" | "Oportunitate" | "Acțiune" | "Document" | "Aprobare" | "Feedback" | "Eveniment";
  occurredAt: string;
  href?: string;
  evidence: CompanyEvidence;
};

export type CompanyKnowledgeGap = {
  code: "missing_primary_contact" | "missing_owner" | "missing_next_action" | "missing_recent_activity" | "missing_domain";
  label: string;
  actionLabel: string;
  href: string;
  evidence: CompanyEvidence;
};

export type CompanyIntelligenceInput = {
  organization: CrmOrganization;
  contacts: CrmContact[];
  opportunities: Opportunity[];
  signals: CommercialSignal[];
};

export type CompanyIntelligenceSnapshot = {
  organization: CrmOrganization;
  identity: {
    website: string | null;
    industry: string | null;
    location: string | null;
    owner: string | null;
    primaryContact: CrmContact | null;
    contactCount: number;
    evidence: CompanyEvidence[];
  };
  commercial: {
    activeOpportunities: number;
    closedOpportunities: number;
    archivedOpportunities: number;
    recoverableValueByCurrency: Record<string, number>;
    blockedOrOverdue: number;
    unresolvedSignals: number;
    pendingApprovals: number;
    latestActivity: CompanyTimelineItem | null;
    inactivityDays: number | null;
    evidence: CompanyEvidence[];
  };
  canonicalNextAction: {
    title: string;
    description: string;
    dueAt: string | null;
    ownerName: string | null;
    href: string;
    evidence: CompanyEvidence;
  } | null;
  contacts: Array<{
    id: string;
    fullName: string;
    jobTitle: string | null;
    decisionRole: string | null;
    isPrimary: boolean;
    opportunityRoles: string[];
    opportunityCount: number;
    evidence: CompanyEvidence[];
  }>;
  opportunities: Array<{
    id: string;
    title: string;
    status: Opportunity["status"];
    lifecycleStatus: Opportunity["lifecycleStatus"];
    ownerName: string | null;
    estimatedValue: number;
    currency: string;
    nextActionTitle: string | null;
    nextActionDueAt: string | null;
    href: string;
    evidence: CompanyEvidence;
  }>;
  signals: CommercialSignal[];
  approvalItems: Array<{ signalId: string; title: string; href: string; evidence: CompanyEvidence }>;
  recommendationFeedback: Array<{ signalId: string; title: string; feedback: RecommendationFeedback; evidence: CompanyEvidence }>;
  attention: CompanyAttentionItem[];
  knowledgeGaps: CompanyKnowledgeGap[];
  timeline: CompanyTimelineItem[];
};

const DAY_MS = 86_400_000;
const INACTIVITY_DAYS = 30;
const severityRank: Record<CompanyAttentionSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const unresolvedSignalStatuses = new Set(["new", "analyzing", "ready_for_review", "approved", "postponed", "reviewed", "failed"]);

function evidence(sourceType: CompanyEvidenceSource, sourceId: string, sourceTimestamp: string | null | undefined, label: string, href?: string): CompanyEvidence {
  return { sourceType, sourceId, sourceTimestamp: sourceTimestamp ?? null, label, ...(href ? { href } : {}) };
}

function validTimestamp(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

function daysSince(value: string | null, now: Date) {
  if (!value) return null;
  return Math.max(0, Math.floor((now.getTime() - Date.parse(value)) / DAY_MS));
}

function timelineKindForSignalEvent(eventType: string): CompanyTimelineItem["kind"] {
  if (["signal_converted", "signal_dismissed", "duplicate_marked", "signal_reviewed"].includes(eventType)) return "Aprobare";
  if (["recommendation_feedback_recorded", "analysis_review_edited"].includes(eventType)) return "Feedback";
  return "Semnal";
}

function timelineFrom(input: CompanyIntelligenceInput) {
  const items: CompanyTimelineItem[] = [];

  for (const opportunity of input.opportunities) {
    const opportunityHref = `/opportunities/${opportunity.id}`;
    const opportunityTimestamp = validTimestamp(opportunity.updatedAt) ?? validTimestamp(opportunity.createdAt);
    if (opportunityTimestamp) {
      items.push({
        id: `opportunity:${opportunity.id}`,
        label: opportunity.updatedAt && opportunity.updatedAt !== opportunity.createdAt ? "Oportunitate actualizată" : "Oportunitate creată",
        description: opportunity.title,
        kind: "Oportunitate",
        occurredAt: opportunityTimestamp,
        href: opportunityHref,
        evidence: evidence("opportunity", opportunity.id, opportunityTimestamp, `Oportunitatea „${opportunity.title}”`, opportunityHref)
      });
    }

    for (const event of opportunity.timeline) {
      const timestamp = validTimestamp(event.date);
      if (!timestamp) continue;
      items.push({
        id: `opportunity_event:${event.id}`,
        label: event.label,
        description: event.description || opportunity.title,
        kind: "Eveniment",
        occurredAt: timestamp,
        href: opportunityHref,
        evidence: evidence("opportunity_event", event.id, timestamp, `Eveniment în „${opportunity.title}”`, opportunityHref)
      });
    }

    for (const action of opportunity.actions) {
      const timestamp = validTimestamp(action.completedAt) ?? validTimestamp(action.updatedAt) ?? validTimestamp(action.createdAt) ?? validTimestamp(action.dueDate);
      if (!timestamp) continue;
      items.push({
        id: `opportunity_action:${action.id}`,
        label: action.status === "done" ? "Acțiune finalizată" : action.status === "cancelled" ? "Acțiune anulată" : "Acțiune programată",
        description: `${action.title} · ${opportunity.title}`,
        kind: "Acțiune",
        occurredAt: timestamp,
        href: `${opportunityHref}#workflow-actions`,
        evidence: evidence("opportunity_action", action.id, timestamp, `Acțiunea „${action.title}”`, `${opportunityHref}#workflow-actions`)
      });
    }

    for (const document of opportunity.documents) {
      const timestamp = validTimestamp(document.sentAt) ?? validTimestamp(document.readyAt) ?? validTimestamp(document.editedAt) ?? validTimestamp(document.createdAt);
      if (!timestamp) continue;
      items.push({
        id: `opportunity_document:${document.id}`,
        label: document.status === "approved" ? "Document aprobat" : document.status === "sent" ? "Document marcat ca trimis" : "Document pregătit",
        description: `${document.title} · ${opportunity.title}`,
        kind: "Document",
        occurredAt: timestamp,
        href: `${opportunityHref}#documents`,
        evidence: evidence("opportunity_document", document.id, timestamp, `Documentul „${document.title}”`, `${opportunityHref}#documents`)
      });
    }
  }

  for (const signal of input.signals) {
    const signalHref = `/inbox?signal=${signal.id}`;
    const timestamp = validTimestamp(signal.occurredAt) ?? validTimestamp(signal.createdAt);
    if (timestamp) {
      items.push({
        id: `commercial_signal:${signal.id}`,
        label: "Semnal comercial înregistrat",
        description: signal.title,
        kind: "Semnal",
        occurredAt: timestamp,
        href: signalHref,
        evidence: evidence("commercial_signal", signal.id, timestamp, `Semnalul „${signal.title}”`, signalHref)
      });
    }
    for (const event of signal.events ?? []) {
      const eventTimestamp = validTimestamp(event.createdAt);
      if (!eventTimestamp) continue;
      const kind = timelineKindForSignalEvent(event.eventType);
      const href = kind === "Aprobare" && approvalCenterSignals([signal], "pending").length > 0 ? `/approvals?signal=${signal.id}` : signalHref;
      items.push({
        id: `commercial_signal_event:${event.id}`,
        label: event.description || "Semnal actualizat",
        description: signal.title,
        kind,
        occurredAt: eventTimestamp,
        href,
        evidence: evidence(kind === "Feedback" ? "recommendation_feedback" : kind === "Aprobare" ? "approval" : "commercial_signal_event", event.id, eventTimestamp, `Istoric pentru semnalul „${signal.title}”`, href)
      });
    }
  }

  const unique = new Map<string, CompanyTimelineItem>();
  for (const item of items) {
    if (!unique.has(`${item.evidence.sourceType}:${item.evidence.sourceId}`)) unique.set(`${item.evidence.sourceType}:${item.evidence.sourceId}`, item);
  }
  return Array.from(unique.values())
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || left.id.localeCompare(right.id));
}

export function buildCompanyIntelligenceSnapshot(input: CompanyIntelligenceInput, options: { now?: Date; timelineLimit?: number } = {}): CompanyIntelligenceSnapshot {
  const now = options.now ?? new Date();
  const organizationHref = `/crm/organizations/${input.organization.id}`;
  const activeOpportunities = input.opportunities.filter(isOpenOpportunity);
  const closedOpportunities = input.opportunities.filter((item) => ["won", "lost", "disqualified"].includes(item.lifecycleStatus ?? "") || ["won", "lost"].includes(item.status));
  const archivedOpportunities = input.opportunities.filter((item) => item.lifecycleStatus === "archived");
  const recoveryQueue = buildRevenueRecoveryQueue(activeOpportunities, { now });
  const unresolvedSignals = input.signals.filter((signal) => unresolvedSignalStatuses.has(signal.status));
  const pendingApprovals = approvalCenterSignals(input.signals, "pending");
  const primaryContact = input.contacts.find((contact) => contact.organizationId === input.organization.id && contact.isPrimaryForOrganization) ?? null;
  const timeline = timelineFrom(input);
  const latestActivity = timeline[0] ?? null;
  const inactivityDays = daysSince(latestActivity?.occurredAt ?? null, now);
  const recoverableValueByCurrency = recoveryQueue.reduce<Record<string, number>>((totals, item) => {
    const currency = item.opportunity.currency ?? "RON";
    totals[currency] = (totals[currency] ?? 0) + Number(item.opportunity.estimatedValueHigh ?? 0);
    return totals;
  }, {});

  const attention: CompanyAttentionItem[] = [];
  for (const opportunity of activeOpportunities) {
    const href = `/opportunities/${opportunity.id}`;
    const nextAction = selectPrimaryNextAction(opportunity.actions);
    if (nextAction?.status === "pending" && nextAction.dueDate && nextAction.dueDate < now.toISOString()) {
      attention.push({ id: `overdue:${nextAction.id}`, code: "overdue_next_action", severity: "critical", title: "Acțiune următoare restantă", description: `${nextAction.title} este scadentă din ${nextAction.dueDate.slice(0, 10)}.`, href: `${href}#workflow-actions`, occurredAt: nextAction.dueDate, evidence: evidence("opportunity_action", nextAction.id, nextAction.dueDate, `Acțiunea restantă „${nextAction.title}”`, `${href}#workflow-actions`) });
    }
    if (!opportunity.ownerProfileId) {
      attention.push({ id: `owner:${opportunity.id}`, code: "missing_owner", severity: "high", title: "Oportunitate fără responsabil", description: `„${opportunity.title}” nu are un responsabil confirmat.`, href, occurredAt: opportunity.updatedAt ?? opportunity.createdAt ?? null, evidence: evidence("opportunity", opportunity.id, opportunity.updatedAt ?? opportunity.createdAt, `Oportunitatea „${opportunity.title}”`, href) });
    }
    if (!nextAction) {
      attention.push({ id: `next-action:${opportunity.id}`, code: "missing_next_action", severity: "high", title: "Lipsește acțiunea următoare", description: `„${opportunity.title}” nu are un pas următor programat.`, href: `${href}#workflow-actions`, occurredAt: opportunity.updatedAt ?? opportunity.createdAt ?? null, evidence: evidence("opportunity", opportunity.id, opportunity.updatedAt ?? opportunity.createdAt, `Oportunitatea „${opportunity.title}”`, `${href}#workflow-actions`) });
    }
  }
  for (const signal of unresolvedSignals.filter((item) => item.priority === "urgent" || item.priority === "high" || item.urgencyLevel === "critical" || item.urgencyLevel === "high")) {
    const href = `/inbox?signal=${signal.id}`;
    attention.push({ id: `signal:${signal.id}`, code: "high_priority_signal", severity: signal.priority === "urgent" || signal.urgencyLevel === "critical" ? "critical" : "high", title: "Semnal comercial prioritar nerezolvat", description: signal.primaryRecoveryReason || signal.title, href, occurredAt: signal.updatedAt ?? signal.createdAt ?? signal.occurredAt ?? null, evidence: evidence("commercial_signal", signal.id, signal.updatedAt ?? signal.createdAt ?? signal.occurredAt, `Semnalul „${signal.title}”`, href) });
  }
  for (const { signal } of pendingApprovals) {
    const href = `/approvals?signal=${signal.id}`;
    attention.push({ id: `approval:${signal.id}`, code: "pending_approval", severity: "high", title: "Decizie umană în așteptare", description: `„${signal.title}” este pregătit pentru revizuire și aprobare.`, href, occurredAt: signal.reviewedAt ?? signal.updatedAt ?? signal.createdAt ?? null, evidence: evidence("approval", signal.id, signal.reviewedAt ?? signal.updatedAt ?? signal.createdAt, `Aprobarea semnalului „${signal.title}”`, href) });
  }
  if (!primaryContact) {
    attention.push({ id: `primary-contact:${input.organization.id}`, code: "missing_primary_contact", severity: "medium", title: "Contact principal neconfirmat", description: "Compania nu are o persoană principală confirmată pentru continuitatea relației.", href: "/contacts", occurredAt: input.organization.updatedAt ?? input.organization.createdAt ?? null, evidence: evidence("organization", input.organization.id, input.organization.updatedAt ?? input.organization.createdAt, `Profilul companiei „${input.organization.name}”`, organizationHref) });
  }
  if (inactivityDays === null || inactivityDays > INACTIVITY_DAYS) {
    attention.push({ id: `inactive:${input.organization.id}`, code: "inactive_company", severity: "medium", title: "Activitate comercială insuficient de recentă", description: inactivityDays === null ? "Nu există activitate comercială datată pentru această companie." : `Ultima activitate comercială este de acum ${inactivityDays} zile.`, href: organizationHref, occurredAt: latestActivity?.occurredAt ?? input.organization.updatedAt ?? input.organization.createdAt ?? null, evidence: latestActivity?.evidence ?? evidence("organization", input.organization.id, input.organization.updatedAt ?? input.organization.createdAt, `Profilul companiei „${input.organization.name}”`, organizationHref) });
  }

  const deduplicatedAttention: CompanyAttentionItem[] = Array.from(new Map<string, CompanyAttentionItem>(attention.map((item) => [`${item.code}:${item.evidence.sourceId}`, item])).values())
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity]
      || String(right.occurredAt ?? "").localeCompare(String(left.occurredAt ?? ""))
      || left.id.localeCompare(right.id));

  const queuedNextAction = recoveryQueue.map((item) => ({ opportunity: item.opportunity, action: item.assessment.primaryNextAction })).find((item) => item.action)?.action
    ?? activeOpportunities.map((opportunity) => selectPrimaryNextAction(opportunity.actions)).filter((action): action is OpportunityAction => Boolean(action)).sort((left, right) => String(left.dueDate ?? "").localeCompare(String(right.dueDate ?? "")) || left.id.localeCompare(right.id))[0]
    ?? null;
  const nextActionOpportunity = queuedNextAction ? activeOpportunities.find((opportunity) => opportunity.actions.some((action) => action.id === queuedNextAction.id)) ?? null : null;
  const approvalNext = pendingApprovals[0]?.signal ?? null;
  const signalNext = unresolvedSignals.find((signal) => signal.recommendedAction || signal.nextStep) ?? null;
  const canonicalNextAction = queuedNextAction && nextActionOpportunity
    ? { title: queuedNextAction.title, description: `Continuă „${nextActionOpportunity.title}” pe baza acțiunii programate.`, dueAt: queuedNextAction.dueDate || null, ownerName: queuedNextAction.assignedToName ?? nextActionOpportunity.ownerName ?? null, href: `/opportunities/${nextActionOpportunity.id}#workflow-actions`, evidence: evidence("opportunity_action", queuedNextAction.id, queuedNextAction.updatedAt ?? queuedNextAction.createdAt ?? queuedNextAction.dueDate, `Acțiunea „${queuedNextAction.title}”`, `/opportunities/${nextActionOpportunity.id}#workflow-actions`) }
    : approvalNext
      ? { title: "Revizuiește aprobarea în așteptare", description: approvalNext.title, dueAt: approvalNext.reviewDueAt ?? null, ownerName: null, href: `/approvals?signal=${approvalNext.id}`, evidence: evidence("approval", approvalNext.id, approvalNext.reviewedAt ?? approvalNext.updatedAt ?? approvalNext.createdAt, `Aprobarea semnalului „${approvalNext.title}”`, `/approvals?signal=${approvalNext.id}`) }
      : signalNext
        ? { title: signalNext.recommendedAction || signalNext.nextStep || "Revizuiește semnalul comercial", description: signalNext.title, dueAt: signalNext.suggestedDueDate ?? signalNext.reviewDueAt ?? null, ownerName: null, href: `/inbox?signal=${signalNext.id}`, evidence: evidence("commercial_signal", signalNext.id, signalNext.updatedAt ?? signalNext.createdAt ?? signalNext.occurredAt, `Semnalul „${signalNext.title}”`, `/inbox?signal=${signalNext.id}`) }
        : null;

  const organizationEvidence = evidence("organization", input.organization.id, input.organization.updatedAt ?? input.organization.createdAt, `Profilul companiei „${input.organization.name}”`, organizationHref);
  const knowledgeGaps: CompanyKnowledgeGap[] = [];
  const opportunityWithoutOwner = activeOpportunities.find((item) => !item.ownerProfileId);
  const opportunityWithoutNextAction = activeOpportunities.find((item) => !selectPrimaryNextAction(item.actions));
  if (!primaryContact) knowledgeGaps.push({ code: "missing_primary_contact", label: "Nu există un contact principal confirmat", actionLabel: "Gestionează contactele", href: "/contacts", evidence: organizationEvidence });
  if (opportunityWithoutOwner) knowledgeGaps.push({ code: "missing_owner", label: "Cel puțin o oportunitate nu are responsabil", actionLabel: "Atribuie responsabil", href: `/opportunities/${opportunityWithoutOwner.id}`, evidence: evidence("opportunity", opportunityWithoutOwner.id, opportunityWithoutOwner.updatedAt ?? opportunityWithoutOwner.createdAt, `Oportunitatea „${opportunityWithoutOwner.title}”`, `/opportunities/${opportunityWithoutOwner.id}`) });
  if (opportunityWithoutNextAction) knowledgeGaps.push({ code: "missing_next_action", label: "Cel puțin o oportunitate nu are acțiune următoare", actionLabel: "Definește pasul următor", href: `/opportunities/${opportunityWithoutNextAction.id}#workflow-actions`, evidence: evidence("opportunity", opportunityWithoutNextAction.id, opportunityWithoutNextAction.updatedAt ?? opportunityWithoutNextAction.createdAt, `Oportunitatea „${opportunityWithoutNextAction.title}”`, `/opportunities/${opportunityWithoutNextAction.id}#workflow-actions`) });
  if (inactivityDays === null || inactivityDays > INACTIVITY_DAYS) knowledgeGaps.push({ code: "missing_recent_activity", label: "Nu există activitate comercială recentă", actionLabel: "Revizuiește compania", href: organizationHref, evidence: latestActivity?.evidence ?? organizationEvidence });
  if (!input.organization.website) knowledgeGaps.push({ code: "missing_domain", label: "Domeniul companiei nu este cunoscut", actionLabel: "Completează compania", href: "/companies", evidence: organizationEvidence });

  const contactRelationships = input.contacts.map((contact) => {
    const associations = input.opportunities.flatMap((opportunity) => (opportunity.contacts ?? []).filter((association) => association.contactId === contact.id));
    return { id: contact.id, fullName: contact.fullName, jobTitle: contact.jobTitle ?? null, decisionRole: contact.decisionRole ?? null, isPrimary: Boolean(contact.isPrimaryForOrganization), opportunityRoles: Array.from(new Set(associations.map((association) => association.role).filter((role): role is string => Boolean(role)))), opportunityCount: new Set(associations.map((association) => association.opportunityId)).size, evidence: [evidence("contact", contact.id, contact.updatedAt ?? contact.createdAt, `Contactul „${contact.fullName}”`, "/contacts"), ...associations.map((association) => evidence("opportunity_contact", association.id, association.updatedAt ?? association.createdAt, `Relația cu oportunitatea ${association.opportunityId}`, `/opportunities/${association.opportunityId}`))] };
  });

  return {
    organization: input.organization,
    identity: { website: input.organization.website ?? null, industry: input.organization.industry ?? null, location: [input.organization.city, input.organization.county, input.organization.country].filter(Boolean).join(", ") || null, owner: activeOpportunities.find((item) => item.ownerName)?.ownerName ?? null, primaryContact, contactCount: input.contacts.length, evidence: [organizationEvidence, ...input.contacts.map((contact) => evidence("contact", contact.id, contact.updatedAt ?? contact.createdAt, `Contactul „${contact.fullName}”`, "/contacts")), ...activeOpportunities.filter((item) => item.ownerName).map((item) => evidence("opportunity", item.id, item.updatedAt ?? item.createdAt, `Responsabilul oportunității „${item.title}”`, `/opportunities/${item.id}`))] },
    commercial: { activeOpportunities: activeOpportunities.length, closedOpportunities: closedOpportunities.length, archivedOpportunities: archivedOpportunities.length, recoverableValueByCurrency, blockedOrOverdue: recoveryQueue.filter((item) => item.assessment.state === "blocked" || item.assessment.state === "at_risk" || item.primaryReason.code === "overdue_next_action").length, unresolvedSignals: unresolvedSignals.length, pendingApprovals: pendingApprovals.length, latestActivity, inactivityDays, evidence: [...input.opportunities.map((item) => evidence("opportunity", item.id, item.updatedAt ?? item.createdAt, `Oportunitatea „${item.title}”`, `/opportunities/${item.id}`)), ...input.signals.map((item) => evidence("commercial_signal", item.id, item.updatedAt ?? item.createdAt ?? item.occurredAt, `Semnalul „${item.title}”`, `/inbox?signal=${item.id}`))] },
    canonicalNextAction,
    contacts: contactRelationships,
    opportunities: input.opportunities.map((opportunity) => { const next = selectPrimaryNextAction(opportunity.actions); return { id: opportunity.id, title: opportunity.title, status: opportunity.status, lifecycleStatus: opportunity.lifecycleStatus, ownerName: opportunity.ownerName ?? null, estimatedValue: opportunity.estimatedValueHigh, currency: opportunity.currency ?? "RON", nextActionTitle: next?.title ?? null, nextActionDueAt: next?.dueDate ?? null, href: `/opportunities/${opportunity.id}`, evidence: evidence("opportunity", opportunity.id, opportunity.updatedAt ?? opportunity.createdAt, `Oportunitatea „${opportunity.title}”`, `/opportunities/${opportunity.id}`) }; }),
    signals: input.signals,
    approvalItems: pendingApprovals.map(({ signal }) => ({ signalId: signal.id, title: signal.title, href: `/approvals?signal=${signal.id}`, evidence: evidence("approval", signal.id, signal.reviewedAt ?? signal.updatedAt ?? signal.createdAt, `Aprobarea semnalului „${signal.title}”`, `/approvals?signal=${signal.id}`) })),
    recommendationFeedback: input.signals.map((signal) => ({ signalId: signal.id, title: signal.title, feedback: recommendationFeedbackForSignal(signal), evidence: evidence("recommendation_feedback", signal.id, recommendationFeedbackForSignal(signal).decidedAt ?? signal.updatedAt ?? signal.createdAt, `Feedback pentru recomandarea „${signal.title}”`, `/inbox?signal=${signal.id}`) })).filter((item) => item.feedback.state !== "pending_review").sort((left, right) => String(right.evidence.sourceTimestamp ?? "").localeCompare(String(left.evidence.sourceTimestamp ?? ""))),
    attention: deduplicatedAttention,
    knowledgeGaps,
    timeline: timeline.slice(0, options.timelineLimit ?? 12)
  };
}

type Row = Record<string, unknown>;
const stringValue = (row: Row, key: string) => typeof row[key] === "string" ? row[key] as string : null;
const numberValue = (row: Row, key: string) => Number(row[key] ?? 0);
const arrayValue = (row: Row, key: string) => Array.isArray(row[key]) ? row[key] as string[] : [];

function mapAction(row: Row): OpportunityAction {
  return { id: String(row.id), type: row.type as OpportunityAction["type"], title: String(row.title ?? "Acțiune"), description: String(row.description ?? ""), status: row.status as OpportunityAction["status"], dueDate: stringValue(row, "due_at") ?? "", priority: row.priority as OpportunityAction["priority"], assignedToProfileId: stringValue(row, "assigned_to_profile_id"), createdAt: stringValue(row, "created_at") ?? undefined, updatedAt: stringValue(row, "updated_at") ?? undefined, completedAt: stringValue(row, "completed_at") ?? undefined, cancelledAt: stringValue(row, "cancelled_at") ?? undefined };
}

function mapDocument(row: Row): OpportunityDocument {
  return { id: String(row.id), type: row.document_type as OpportunityDocument["type"], title: String(row.title ?? "Document comercial"), status: (row.status ?? "draft") as OpportunityDocument["status"], createdAt: stringValue(row, "created_at") ?? undefined, editedAt: stringValue(row, "edited_at") ?? undefined, readyAt: stringValue(row, "ready_at") ?? undefined, sentAt: stringValue(row, "sent_at") ?? undefined };
}

function mapEvent(row: Row): OpportunityEvent {
  return { id: String(row.id), type: String(row.event_type ?? "event"), label: String(row.label ?? "Eveniment comercial"), description: String(row.description ?? ""), date: stringValue(row, "occurred_at") ?? stringValue(row, "created_at") ?? "", businessId: stringValue(row, "business_id"), actorProfileId: stringValue(row, "actor_profile_id"), metadata: typeof row.metadata === "object" && row.metadata !== null ? row.metadata as Record<string, unknown> : {} };
}

function joinedRow(value: unknown): Row | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === "object" ? value[0] as Row : null;
  return value && typeof value === "object" ? value as Row : null;
}

function mapAssociation(row: Row): OpportunityContact | null {
  const contact = joinedRow(row.crm_contacts);
  if (!contact) return null;
  return { id: String(row.id), businessId: String(row.business_id), opportunityId: String(row.opportunity_id), contactId: String(row.contact_id), role: stringValue(row, "role"), isPrimary: Boolean(row.is_primary), notes: stringValue(row, "notes"), createdAt: stringValue(row, "created_at"), updatedAt: stringValue(row, "updated_at"), contact: { id: String(contact.id), businessId: String(contact.business_id), organizationId: stringValue(contact, "organization_id"), fullName: String(contact.full_name ?? "Contact"), jobTitle: stringValue(contact, "job_title"), decisionRole: stringValue(contact, "decision_role"), email: stringValue(contact, "email"), phone: stringValue(contact, "phone"), professionalUrl: stringValue(contact, "professional_url"), notes: stringValue(contact, "notes"), createdAt: stringValue(contact, "created_at"), updatedAt: stringValue(contact, "updated_at") } };
}

function mapOpportunity(row: Row, actions: OpportunityAction[], documents: OpportunityDocument[], events: OpportunityEvent[], contacts: OpportunityContact[], ownerName: string | null): Opportunity {
  return { id: String(row.id), businessId: String(row.business_id), organizationId: stringValue(row, "organization_id"), title: String(row.title ?? "Oportunitate comercială"), type: row.type as Opportunity["type"], status: row.status as Opportunity["status"], lifecycleStatus: row.lifecycle_status as Opportunity["lifecycleStatus"], commercialType: row.commercial_type as Opportunity["commercialType"], ownerProfileId: stringValue(row, "owner_profile_id"), ownerName, currency: stringValue(row, "currency") ?? "RON", createdAt: stringValue(row, "created_at") ?? undefined, updatedAt: stringValue(row, "updated_at") ?? undefined, estimatedValueLow: numberValue(row, "estimated_value_low"), estimatedValueHigh: numberValue(row, "estimated_value_high"), deadline: stringValue(row, "deadline") ?? undefined, city: stringValue(row, "city") ?? "", county: stringValue(row, "county") ?? "", fitScore: numberValue(row, "fit_score"), urgencyScore: numberValue(row, "urgency_score"), moneyScore: numberValue(row, "money_score"), confidenceScore: numberValue(row, "confidence_score"), summary: stringValue(row, "ai_summary") ?? stringValue(row, "summary") ?? "", relevance: arrayValue(row, "relevance"), risks: arrayValue(row, "risks"), recommendedAction: stringValue(row, "recommended_action") ?? "", rawSourceText: stringValue(row, "raw_source_text") ?? "", timeline: events, documents, actions, contacts };
}

export async function getCompanyIntelligenceSnapshot(organizationId: string): Promise<{ ready: boolean; snapshot: CompanyIntelligenceSnapshot | null; error?: string }> {
  if (!isSupabaseConfigured) return { ready: false, snapshot: null, error: "Inteligența companiei este disponibilă după configurarea Supabase." };
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!current?.business || !supabase) return { ready: false, snapshot: null, error: "Nu am putut încărca workspace-ul curent." };
  const businessId = current.business.id;

  const [organizationResult, contactsResult] = await Promise.all([
    supabase.from("crm_organizations").select("id,business_id,name,website,industry,phone,city,county,country,notes,relationship_status,is_archived,created_at,updated_at").eq("id", organizationId).eq("business_id", businessId).eq("is_archived", false).maybeSingle(),
    supabase.from("crm_contacts").select("id,business_id,organization_id,full_name,job_title,decision_role,email,phone,professional_url,is_active,is_primary_for_organization,notes,created_at,updated_at").eq("business_id", businessId).eq("organization_id", organizationId).eq("is_active", true).order("is_primary_for_organization", { ascending: false }).limit(100)
  ]);
  if (organizationResult.error || contactsResult.error) return { ready: false, snapshot: null, error: "Datele companiei nu au putut fi încărcate." };
  if (!organizationResult.data) return { ready: true, snapshot: null };

  const organizationRow = organizationResult.data as Row;
  const organization: CrmOrganization = { id: String(organizationRow.id), businessId: String(organizationRow.business_id), name: String(organizationRow.name), website: stringValue(organizationRow, "website"), industry: stringValue(organizationRow, "industry"), phone: stringValue(organizationRow, "phone"), city: stringValue(organizationRow, "city"), county: stringValue(organizationRow, "county"), country: stringValue(organizationRow, "country"), notes: stringValue(organizationRow, "notes"), relationshipStatus: stringValue(organizationRow, "relationship_status"), isArchived: Boolean(organizationRow.is_archived), createdAt: stringValue(organizationRow, "created_at"), updatedAt: stringValue(organizationRow, "updated_at") };
  const directContacts: CrmContact[] = ((contactsResult.data ?? []) as Row[]).map((row) => ({ id: String(row.id), businessId: String(row.business_id), organizationId: stringValue(row, "organization_id"), fullName: String(row.full_name), jobTitle: stringValue(row, "job_title"), decisionRole: stringValue(row, "decision_role"), email: stringValue(row, "email"), phone: stringValue(row, "phone"), professionalUrl: stringValue(row, "professional_url"), isActive: Boolean(row.is_active), isPrimaryForOrganization: Boolean(row.is_primary_for_organization), notes: stringValue(row, "notes"), createdAt: stringValue(row, "created_at"), updatedAt: stringValue(row, "updated_at") }));
  const contactIds = directContacts.map((contact) => contact.id);

  const [directOpportunitiesResult, linkedOpportunityResult] = await Promise.all([
    supabase.from("opportunities").select("id,business_id,organization_id,title,type,status,lifecycle_status,commercial_type,owner_profile_id,currency,estimated_value_low,estimated_value_high,deadline,city,county,fit_score,urgency_score,money_score,confidence_score,summary,ai_summary,relevance,risks,recommended_action,raw_source_text,created_at,updated_at").eq("business_id", businessId).eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(100),
    contactIds.length > 0 ? supabase.from("opportunity_contacts").select("opportunity_id").eq("business_id", businessId).in("contact_id", contactIds).limit(200) : Promise.resolve({ data: [], error: null })
  ]);
  if (directOpportunitiesResult.error || linkedOpportunityResult.error) return { ready: false, snapshot: null, error: "Oportunitățile companiei nu au putut fi încărcate." };
  const directRows = (directOpportunitiesResult.data ?? []) as Row[];
  const directIds = new Set(directRows.map((row) => String(row.id)));
  const linkedIds = ((linkedOpportunityResult.data ?? []) as Row[]).map((row) => String(row.opportunity_id)).filter((id) => !directIds.has(id));
  const linkedRowsResult = linkedIds.length > 0
    ? await supabase.from("opportunities").select("id,business_id,organization_id,title,type,status,lifecycle_status,commercial_type,owner_profile_id,currency,estimated_value_low,estimated_value_high,deadline,city,county,fit_score,urgency_score,money_score,confidence_score,summary,ai_summary,relevance,risks,recommended_action,raw_source_text,created_at,updated_at").eq("business_id", businessId).in("id", linkedIds).limit(100)
    : { data: [], error: null };
  if (linkedRowsResult.error) return { ready: false, snapshot: null, error: "Relațiile comerciale ale companiei nu au putut fi încărcate." };
  const opportunityRows = [...directRows, ...((linkedRowsResult.data ?? []) as Row[])];
  const opportunityIds = opportunityRows.map((row) => String(row.id));
  const signals = await getCommercialSignalsForOrganization(organizationId, { opportunityIds, contactIds });

  if (opportunityIds.length === 0) return { ready: true, snapshot: buildCompanyIntelligenceSnapshot({ organization, contacts: directContacts, opportunities: [], signals }) };

  const [actionsResult, documentsResult, eventsResult, associationsResult, ownersResult] = await Promise.all([
    supabase.from("opportunity_actions").select("id,business_id,opportunity_id,type,title,description,status,due_at,priority,assigned_to_profile_id,created_at,updated_at,completed_at,cancelled_at").eq("business_id", businessId).in("opportunity_id", opportunityIds).order("due_at", { ascending: true, nullsFirst: false }).limit(500),
    supabase.from("opportunity_documents").select("id,business_id,opportunity_id,document_type,title,status,created_at,edited_at,ready_at,sent_at").eq("business_id", businessId).in("opportunity_id", opportunityIds).order("created_at", { ascending: false }).limit(300),
    supabase.from("opportunity_events").select("id,business_id,opportunity_id,event_type,label,description,occurred_at,created_at,actor_profile_id,metadata").eq("business_id", businessId).in("opportunity_id", opportunityIds).order("occurred_at", { ascending: false }).limit(500),
    supabase.from("opportunity_contacts").select("id,business_id,opportunity_id,contact_id,role,is_primary,notes,created_at,updated_at,crm_contacts(id,business_id,organization_id,full_name,job_title,decision_role,email,phone,professional_url,notes,created_at,updated_at)").eq("business_id", businessId).in("opportunity_id", opportunityIds).order("is_primary", { ascending: false }).limit(300),
    supabase.rpc("business_assignable_profiles", { target_business_id: businessId })
  ]);
  const requiredError = actionsResult.error ?? documentsResult.error ?? eventsResult.error ?? associationsResult.error;
  if (requiredError) return { ready: false, snapshot: null, error: "Inteligența operațională a companiei nu a putut fi agregată." };

  const actionsByOpportunity = new Map<string, OpportunityAction[]>();
  for (const row of (actionsResult.data ?? []) as Row[]) {
    const opportunityId = String(row.opportunity_id);
    actionsByOpportunity.set(opportunityId, [...(actionsByOpportunity.get(opportunityId) ?? []), mapAction(row)]);
  }
  const documentsByOpportunity = new Map<string, OpportunityDocument[]>();
  for (const row of (documentsResult.data ?? []) as Row[]) {
    const opportunityId = String(row.opportunity_id);
    documentsByOpportunity.set(opportunityId, [...(documentsByOpportunity.get(opportunityId) ?? []), mapDocument(row)]);
  }
  const eventsByOpportunity = new Map<string, OpportunityEvent[]>();
  for (const row of (eventsResult.data ?? []) as Row[]) {
    const opportunityId = String(row.opportunity_id);
    eventsByOpportunity.set(opportunityId, [...(eventsByOpportunity.get(opportunityId) ?? []), mapEvent(row)]);
  }
  const associations = ((associationsResult.data ?? []) as Row[]).map(mapAssociation).filter((item): item is OpportunityContact => Boolean(item));
  const associationsByOpportunity = new Map<string, OpportunityContact[]>();
  for (const association of associations) associationsByOpportunity.set(association.opportunityId, [...(associationsByOpportunity.get(association.opportunityId) ?? []), association]);
  const ownerNames = new Map<string, string>(((ownersResult.data ?? []) as Array<{ profile_id: string; full_name: string }>).map((row) => [row.profile_id, row.full_name]));
  const opportunities = opportunityRows.map((row) => {
    const id = String(row.id);
    const ownerId = stringValue(row, "owner_profile_id");
    return mapOpportunity(row, actionsByOpportunity.get(id) ?? [], documentsByOpportunity.get(id) ?? [], eventsByOpportunity.get(id) ?? [], associationsByOpportunity.get(id) ?? [], ownerId ? ownerNames.get(ownerId) ?? null : null);
  });
  const connectedContacts = new Map(directContacts.map((contact) => [contact.id, contact]));
  for (const association of associations) connectedContacts.set(association.contact.id, association.contact);
  return { ready: true, snapshot: buildCompanyIntelligenceSnapshot({ organization, contacts: Array.from(connectedContacts.values()), opportunities, signals }) };
}
