import "server-only";
import { buildOpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import { evidenceHref, metadataEvidence, type EvidenceReference } from "@/lib/evidence-reference";
import type { CommercialIntervention } from "@/lib/commercial-interventions";
import type { CommercialCommunication } from "@/lib/commercial-execution";
import type { CommercialSignal, Opportunity } from "@/lib/types";
import type { WorkspaceDecisionQueue, WorkspaceDecisionItem } from "@/lib/workspace-decision-queue";

export type ExecutionCase = {
  id: string; opportunityId: string; organization: string; opportunityTitle: string;
  value: number | null; currency: string; status: Opportunity["status"];
  severity: "critical" | "attention" | "informative"; primaryReason: string; reasons: string[];
  rankingReasons: string[]; overdue: boolean; overdueDays: number | null;
  owner: { id: string | null; name: string };
  deadline: string | null; staleness: number | null; lastActivityAt: string | null; nextMeetingAt: string | null;
  nextAction: { title: string; dueAt: string | null; owner: string | null } | null;
  intervention: { label: string; href: string; explanation: string };
  evidence: EvidenceReference[]; recentActivity: EvidenceReference[];
};
export type ExecutionControlCenterModel = {
  cases: ExecutionCase[]; exposure: Record<string, number>; overdueCount: number;
  sourceState: "available" | "fallback"; waitingCount: number;
};

const date = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? value : null;
const time = (value?: string | null) => value ? Date.parse(value) || 0 : 0;
const unique = (items: EvidenceReference[]) => Array.from(new Map(items.map((item) => [item.sourceType + ":" + item.sourceId, item])).values());

/**
 * Presentation-only projection of already-authorized loader results.
 * Retains the intervention engine's order, reasons and reply/wait suppression.
 * If that loader is unavailable, reuses the existing decision queue (no new score).
 * Callers must supply the current workspace only; no new data access occurs here.
 */
export function buildExecutionControlCenter(input: {
  opportunities: Opportunity[]; signals: CommercialSignal[];
  queue: WorkspaceDecisionQueue;
  brief: { items: Omit<CommercialIntervention, "revision">[]; waitingCount: number } | null;
  viewer: { profileId: string | null; isManager: boolean };
  communicationsByOpportunityId?: Record<string, CommercialCommunication>;
  documentEvidenceByOpportunityId?: Record<string, EvidenceReference[]>;
  now?: Date;
}): ExecutionControlCenterModel {
  const now = input.now ?? new Date();
  const records = new Map(input.opportunities.filter((item) => input.viewer.isManager || item.ownerProfileId === input.viewer.profileId).map((item) => [item.id, item]));
  const fallback = new Map<string, WorkspaceDecisionItem[]>();
  for (const item of input.queue.items) {
    if (!item.relatedOpportunityId || item.type === "waiting_for_client") continue;
    const group = fallback.get(item.relatedOpportunityId) ?? [];
    group.push(item); fallback.set(item.relatedOpportunityId, group);
  }
  const interventions = new Map(input.brief?.items.map((item) => [item.opportunityId, item]) ?? []);
  const orderedIds = input.brief ? Array.from(interventions.keys()) : Array.from(fallback.keys());
  const cases: ExecutionCase[] = [];
  for (const id of orderedIds) {
    const opportunity = records.get(id);
    if (!opportunity) continue;
    const linkedSignals = input.signals.filter((signal) => (!opportunity.businessId || signal.businessId === opportunity.businessId)
      && (signal.detectedFromOpportunityId === id || signal.convertedOpportunityId === id));
    const state = buildOpportunityCommercialState(opportunity, { now, linkedSignals, communication: input.communicationsByOpportunityId?.[id] });
    if (state.lifecycle !== "open") continue;
    const intervention = interventions.get(id);
    const decisions = fallback.get(id) ?? [];
    const overdueReason = intervention?.reasons.find((item) => item.type === "follow_up_overdue");
    const overdue = intervention ? Boolean(overdueReason) : decisions.some((item) => item.type === "overdue_follow_up");
    const due = date(overdueReason?.at) ?? state.nextAction?.dueAt ?? null;
    const overdueDays = overdue && due ? Math.max(0, Math.floor((now.getTime() - time(due)) / 86_400_000)) : null;
    const base = "/opportunities/" + encodeURIComponent(id);
    const evidence: EvidenceReference[] = state.evidence.filter((item) => item.sourceType !== "event" || time(item.observedAt) <= now.getTime()).map((item) => metadataEvidence({
      sourceId: item.sourceId, sourceType: item.sourceType,
      title: item.sourceType === "response" ? "Răspuns comercial înregistrat" : item.label,
      occurredAt: item.observedAt, entityHref: item.href,
      supportingFact: item.sourceType === "document" && state.document.state === "prepared" && item.sourceId === state.document.id ? "Pregătit pentru revizuire; trimiterea nu este confirmată."
        : item.sourceType === "action" && state.nextAction?.overdue && item.sourceId === state.nextAction.id ? "Termen depășit; acțiunea nu este finalizată." : undefined
    }));
    evidence.push(...(input.documentEvidenceByOpportunityId?.[id] ?? []));
    // Private source metadata comes ONLY from the owner-scoped server brief.
    for (const source of intervention?.evidence ?? []) {
      if (source.source === "crm") continue;
      evidence.push(metadataEvidence({
        sourceType: source.source === "gmail" ? "email" : "calendar", sourceId: source.id,
        title: source.label, occurredAt: source.at, entityHref: source.href,
        provider: source.source === "gmail" ? "gmail" : "google_calendar"
      }));
    }
    for (const signal of linkedSignals) evidence.push(metadataEvidence({
      sourceType: "signal", sourceId: signal.id, title: signal.title, occurredAt: date(signal.occurredAt) ?? date(signal.createdAt),
      supportingFact: "Semnal asociat acestei oportunități.", entityHref: "/inbox?signal=" + encodeURIComponent(signal.id)
    }));
    const recentActivity = unique([
      ...opportunity.timeline.map((event) => metadataEvidence({ sourceType: "event", sourceId: event.id, title: event.label, occurredAt: date(event.date), entityHref: base + "#opportunity-timeline" })),
      ...opportunity.actions.map((action) => metadataEvidence({ sourceType: "action", sourceId: action.id, title: action.title,
        occurredAt: date(action.completedAt) ?? date(action.updatedAt) ?? date(action.createdAt),
        supportingFact: action.status === "done" ? "Acțiune finalizată." : action.status === "cancelled" ? "Acțiune anulată." : "Acțiune înregistrată.",
        entityHref: base + "#workflow-actions-list" })),
      ...opportunity.documents.map((document) => metadataEvidence({ sourceType: "document", sourceId: document.id, title: document.title,
        occurredAt: date(document.sentAt) ?? date(document.readyAt) ?? date(document.editedAt) ?? date(document.createdAt),
        entityHref: base + "#opportunity-documents" })),
      ...evidence.filter((item) => ["email", "calendar", "signal"].includes(item.sourceType))
    ]).filter((item) => !evidence.some(source => source.sourceType === item.sourceType && source.sourceId === item.sourceId))
      .filter((item) => item.occurredAt && time(item.occurredAt) <= now.getTime())
      .sort((a, b) => time(b.occurredAt) - time(a.occurredAt) || a.sourceId.localeCompare(b.sourceId)).slice(0, 5);
    const ownerMissing = state.ownership.validity === "missing";
    const reviewHref = intervention?.reviewHref;
    const safeAction = ownerMissing ? { label: "Atribuie responsabilul", href: base + "?tab=responsibility" }
      : reviewHref ? { label: "Revizuiește lucrul pregătit", href: reviewHref }
      : state.recommendedSafeIntervention;
    cases.push({
      id, opportunityId: id, organization: state.organization.name ?? "Companie neconfirmată", opportunityTitle: state.title,
      value: state.financial.estimatedValue !== null && Number.isFinite(state.financial.estimatedValue) ? state.financial.estimatedValue : null,
      currency: state.financial.currency, status: opportunity.status,
      severity: intervention ? intervention.priority === "critical" ? "critical" : intervention.priority === "watch" ? "informative" : "attention" : decisions[0].severity,
      primaryReason: intervention?.summary ?? decisions[0].title,
      reasons: Array.from(new Set(intervention ? intervention.reasons.map((item) => item.label) : decisions.map((item) => item.reason))),
      rankingReasons: intervention?.rankingReasons ?? ["Ordinea cozii comerciale existente: urgență, termen și context disponibil."],
      overdue, overdueDays, owner: { id: state.ownership.ownerProfileId, name: ownerMissing ? "Fără responsabil" : state.ownership.ownerName ?? "Nume neconfirmat" },
      deadline: date(opportunity.deadline), staleness: state.activity.inactivityDays, lastActivityAt: state.activity.lastMeaningfulActivityAt,
      nextMeetingAt: intervention?.meetingAt ?? null,
      nextAction: state.nextAction ? { title: state.nextAction.title, dueAt: state.nextAction.dueAt, owner: state.nextAction.ownerName } : null,
      intervention: { ...safeAction, href: evidenceHref(safeAction.href) ?? base, explanation: intervention?.recommendation ?? decisions[0].whyItMatters },
      evidence: unique(evidence), recentActivity
    });
  }
  const exposure: Record<string, number> = {};
  for (const item of cases) if (item.value !== null) Object.defineProperty(exposure, item.currency, { value: (Object.hasOwn(exposure, item.currency) ? exposure[item.currency] : 0) + item.value, enumerable: true, configurable: true });
  return { cases, exposure, overdueCount: cases.filter((item) => item.overdue).length, sourceState: input.brief ? "available" : "fallback", waitingCount: input.brief?.waitingCount ?? input.queue.countsByType.waiting_for_client };
}
