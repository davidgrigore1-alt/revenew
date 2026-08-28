import { buildOpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import { preparedWorkForOpportunity } from "@/lib/prepared-work";
import type { CommercialSignal, Opportunity } from "@/lib/types";

export type InterventionCategory = "reply_received" | "follow_up_overdue" | "meeting_unprepared" | "next_action_missing" | "owner_missing" | "execution_drift" | "prepared_waiting";
export type InterventionEvidence = { id: string; label: string; at: string | null; href: string; source: "crm" | "gmail" | "calendar" };
export type InterventionCommunication = {
  inbound?: { id: string; at: string }; outbound?: { id: string; at: string };
  meeting?: { id: string; at: string }; prepared?: { id: string; at: string; href: string };
  responseWindowDays?: number;
};
export type InterventionPrivateContext = {
  businessId: string; profileId: string; state: "available" | "not_connected" | "partial" | "unavailable";
  byOpportunityId: Record<string, InterventionCommunication>;
};
export type CommercialIntervention = {
  id: string; opportunityId: string; organizationId: string | null; title: string; company: string;
  priority: "critical" | "important" | "watch"; category: InterventionCategory; summary: string; recommendation: string;
  reasons: Array<{ type: InterventionCategory; label: string; at: string | null }>; evidence: InterventionEvidence[];
  estimatedExposure: number | null; currency: string; owner: string; stage: string;
  meetingAt: string | null; changedAt: string | null;
  rankingReasons: string[];
  safeAction: "prepare_email" | "create_task" | "update_next_action" | "review"; reviewHref: string | null;
  /** Server-only freshness material; replaced by a hash before presentation. */
  revision: string;
};
const day = 86_400_000;
const time = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const weight: Record<InterventionCategory, number> = { reply_received: 95, follow_up_overdue: 45, meeting_unprepared: 70, prepared_waiting: 75, owner_missing: 45, next_action_missing: 40, execution_drift: 25 };

/** Projection of the canonical evaluator, not a second execution-state engine. */
export function buildCommercialInterventions(input: {
  opportunities: Opportunity[]; signals: CommercialSignal[];
  viewer: { businessId: string; profileId: string; isManager: boolean };
  privateContext: InterventionPrivateContext; now?: Date;
}) {
  const now = input.now ?? new Date();
  const instant = now.getTime();
  const privateAllowed = input.privateContext.businessId === input.viewer.businessId && input.privateContext.profileId === input.viewer.profileId;
  const candidates: Array<{ item: CommercialIntervention; rank: number }> = [];
  let waitingCount = 0;
  const seen = new Set<string>();
  for (const opportunity of input.opportunities) {
    if (opportunity.businessId !== input.viewer.businessId || (!input.viewer.isManager && opportunity.ownerProfileId !== input.viewer.profileId) || seen.has(opportunity.id)) continue;
    seen.add(opportunity.id);
    const context = privateAllowed ? input.privateContext.byOpportunityId[opportunity.id] ?? {} : {};
    const inbound = time(context.inbound?.at), outbound = time(context.outbound?.at), meeting = time(context.meeting?.at);
    const state = buildOpportunityCommercialState(opportunity, { now, linkedSignals: input.signals.filter((signal) => signal.businessId === input.viewer.businessId), communication: {
      lastInboundAt: context.inbound?.at, lastOutboundAt: context.outbound?.at,
      nextMeetingAt: context.meeting?.at, expectedResponseWindowDays: context.responseWindowDays
    } });
    if (state.lifecycle !== "open") continue;
    const reasons: CommercialIntervention["reasons"] = [];
    const add = (type: InterventionCategory, label: string, at: string | null = null) => reasons.push({ type, label, at });
    const currentActions = opportunity.actions.filter((action) => action.status !== "cancelled");
    const replyHandled = inbound > 0 && (outbound >= inbound || time(state.response.respondedAt) >= inbound || currentActions.some((action) =>
      (action.status === "done" && time(action.completedAt) >= inbound) ||
      (action.status === "pending" && time(action.dueDate) >= instant && time(action.createdAt) >= inbound)
    ));
    const waiting = state.execution.waitingIsLegitimate;
    if (waiting) waitingCount += 1;
    if (!waiting && inbound > outbound && inbound <= instant && instant - inbound <= 7 * day && !replyHandled) add("reply_received", "Clientul a răspuns; nu există un pas ulterior confirmat.", context.inbound!.at);
    const due = time(state.nextAction?.dueAt);
    const newerInteraction = Math.max(inbound, outbound, time(state.response.respondedAt));
    if (!waiting && !replyHandled && !reasons.some((reason) => reason.type === "reply_received") &&
      (state.execution.rule === "response_window_expired" || (state.flags.nextActionOverdue && newerInteraction < due))) {
      add("follow_up_overdue", state.execution.rule === "response_window_expired" ? "Fereastra de răspuns a expirat; este necesară o revenire." : "Termenul următoarei acțiuni a trecut fără finalizare.", state.execution.rule === "response_window_expired" ? state.execution.nextReviewAt : state.nextAction?.dueAt ?? null);
    }
    const prepared = preparedWorkForOpportunity(opportunity).filter((item) => ["prepared", "ready_for_review", "approved"].includes(item.status));
    const meetingHasStep = currentActions.some((action) => action.status === "pending" && time(action.dueDate) >= instant && time(action.dueDate) <= meeting);
    if (meeting >= instant && meeting <= instant + 3 * day && !meetingHasStep && !prepared.length && !context.prepared) add("meeting_unprepared", "Întâlnirea se apropie fără un pas de pregătire programat.", context.meeting!.at);
    if (!waiting && !replyHandled && state.flags.nextActionMissing && state.financial.estimatedValue !== null) add("next_action_missing", "Expunerea estimată nu are un pas următor confirmat.");
    if (state.ownership.validity === "missing") add("owner_missing", "Niciun responsabil nu este atribuit execuției comerciale.");
    if (!waiting && !replyHandled && (state.execution.state === "blocked" || state.flags.stale)) add("execution_drift", state.execution.state === "blocked" ? state.execution.reason : "Activitatea comercială este stagnantă conform evaluării oportunității.", state.activity.lastMeaningfulActivityAt);
    if (prepared.length || context.prepared || state.approval.state === "pending") add("prepared_waiting", "Lucrul pregătit așteaptă o decizie umană.", context.prepared?.at ?? null);
    if (!reasons.length) continue;
    reasons.sort((a, b) => weight[b.type] - weight[a.type]);
    const primary = reasons[0];
    const urgentMeeting = meeting > instant && meeting <= instant + day;
    const overdueReason = reasons.find((reason) => reason.type === "follow_up_overdue");
    const overdueDays = overdueReason?.at ? Math.max(0, Math.floor((instant - time(overdueReason.at)) / day)) : 0;
    const deadline = time(opportunity.deadline);
    const deadlineSoon = deadline > instant && deadline <= instant + day;
    const rankingReasons = [primary.type === "prepared_waiting" ? "O decizie umană poate debloca lucrul deja pregătit." : primary.label];
    if (urgentMeeting) rankingReasons.push("Întâlnire în următoarele 24 de ore.");
    if (deadlineSoon) rankingReasons.push("Termen comercial în următoarele 24 de ore.");
    if (overdueDays) rankingReasons.push(`Întârziere nerezolvată: ${overdueDays} ${overdueDays === 1 ? "zi" : "zile"}.`);
    const rank = (state.execution.state === "blocked" ? 100 : weight[primary.type])
      + (urgentMeeting ? 25 : 0) + (deadlineSoon ? 20 : 0) + Math.min(20, overdueDays * 2)
      + (reasons.some((reason) => reason.type === "owner_missing") && primary.type !== "owner_missing" ? 5 : 0);
    const priority = rank >= 100 ? "critical" : primary.type === "execution_drift" && rank < 45 ? "watch" : "important";
    const reviewHref = state.outreach.restricted || state.ownership.validity === "missing"
      ? `/opportunities/${opportunity.id}?tab=responsibility`
      : state.approval.signalId ? `/approvals?signal=${state.approval.signalId}` : context.prepared?.href ?? prepared[0]?.reviewHref ?? null;
    const safeAction: CommercialIntervention["safeAction"] = reviewHref ? "review" : primary.type === "reply_received" ? "prepare_email" : primary.type === "meeting_unprepared" || primary.type === "execution_drift" ? "create_task" : "update_next_action";
    const company = state.organization.name;
    const subject = `„${state.title.slice(0, 120)}”`;
    const recommendation = state.outreach.restricted ? `Verifică restricția pentru ${subject} înainte de orice contactare.`
      : state.ownership.validity === "missing" ? `Atribuie un responsabil comercial pentru ${subject} înainte de execuție${prepared.length || context.prepared ? "; apoi revizuiește lucrul pregătit" : ""}.`
      : reviewHref ? `Revizuiește lucrul pregătit pentru ${subject} și decide dacă poate fi aplicat.`
      : primary.type === "reply_received" ? `Revizuiește ultimul răspuns${company ? ` de la ${company}` : " primit"} și pregătește răspunsul comercial${meeting > instant ? " înainte de următoarea întâlnire" : "; confirmă următorul pas"}.`
      : primary.type === "meeting_unprepared" ? `Pregătește situația ${company ? `companiei ${company}` : "oportunității"} pentru întâlnire: întrebări deschise și obiectiv propus, de confirmat.`
      : primary.type === "follow_up_overdue" ? `Reia contactul${company ? ` cu ${company}` : " comercial"} privind ${subject}. Confirmă dacă discuția rămâne activă și stabilește următorul pas cu un termen nou.`
      : `Definește următorul pas pentru ${subject} și confirmă responsabilul și termenul.`;
    const evidence: InterventionEvidence[] = state.evidence.filter((item) => ["opportunity", "action", "approval", "document", "response"].includes(item.sourceType)).slice(0, 6).map((item) => ({ id: item.id, label: item.label, at: item.observedAt, href: item.href, source: "crm" }));
    if (context.inbound) evidence.push({ id: context.inbound.id, label: "Gmail · ultimul mesaj primit", at: context.inbound.at, href: `/inbox?email=${context.inbound.id}`, source: "gmail" });
    if (context.outbound) evidence.push({ id: context.outbound.id, label: "Gmail · ultimul mesaj trimis", at: context.outbound.at, href: `/inbox?email=${context.outbound.id}`, source: "gmail" });
    if (context.meeting && meeting >= instant) evidence.push({ id: context.meeting.id, label: "Google Calendar · întâlnire apropiată", at: context.meeting.at, href: `/ai?meeting=${context.meeting.id}&question=${encodeURIComponent("Pregătește întâlnirea selectată")}`, source: "calendar" });
    const summary = primary.type === "reply_received" && state.flags.nextActionMissing
      ? `Clientul a răspuns, dar lipsește următoarea acțiune${meeting > instant ? " înainte de întâlnire" : ""}.`
      : primary.type === "prepared_waiting" && state.ownership.validity === "missing" ? "Lucrul este pregătit; lipsește responsabilul care să preia decizia."
      : primary.type === "prepared_waiting" && overdueReason ? "Lucrul pregătit așteaptă decizia, iar următoarea acțiune este restantă."
      : primary.type === "meeting_unprepared" && state.flags.nextActionMissing ? "Întâlnire apropiată, fără pregătire și fără următor pas confirmat." : primary.label;
    const item: CommercialIntervention = {
      id: opportunity.id, opportunityId: opportunity.id, organizationId: state.organization.id, title: state.title,
      company: state.organization.name ?? "Companie neconfirmată", priority, category: primary.type, summary, recommendation, reasons, evidence, rankingReasons,
      estimatedExposure: state.financial.estimatedValue, currency: state.financial.currency,
      owner: state.ownership.ownerName ?? "Responsabil neconfirmat", stage: state.stage,
      meetingAt: meeting >= instant ? context.meeting!.at : null, changedAt: primary.at ?? state.activity.lastMeaningfulActivityAt,
      safeAction, reviewHref,
      revision: JSON.stringify({ updatedAt: opportunity.updatedAt, lifecycle: state.lifecycle, owner: state.ownership, nextAction: state.nextAction, actions: opportunity.actions, documents: opportunity.documents.map(({ id, status, editedAt, readyAt, sentAt }) => ({ id, status, editedAt, readyAt, sentAt })), approval: state.approval, response: state.response, outreach: state.outreach, context, reasons, safeAction })
    };
    candidates.push({ item, rank });
  }
  // Exposure is a bounded modifier relative to same-currency candidates only.
  // No FX assumptions and no pairwise mixed-currency comparator (which would be non-transitive).
  for (const candidate of candidates) {
    const value = candidate.item.estimatedExposure;
    if (value === null || value <= 0) continue;
    const peers = candidates.filter(({ item }) => item.currency === candidate.item.currency && (item.estimatedExposure ?? 0) > 0);
    const lower = peers.filter(({ item }) => item.estimatedExposure! < value).length;
    const modifier = peers.length > 1 ? Math.round(20 * lower / (peers.length - 1)) : 0;
    candidate.rank += modifier;
    if (modifier >= 10) candidate.item.rankingReasons.push(`Expunere estimată ridicată față de celelalte intervenții în ${candidate.item.currency}.`);
    if (candidate.rank >= 100) candidate.item.priority = "critical";
  }
  // No monetary comparison across currencies; stable, transitive ordering.
  candidates.sort((a, b) => b.rank - a.rank || time(b.item.changedAt) - time(a.item.changedAt) || a.item.id.localeCompare(b.item.id));
  const items = candidates.map(({ item }) => item);
  const exposure: Record<string, number> = Object.create(null);
  for (const item of items) if (item.estimatedExposure !== null && Number.isFinite(item.estimatedExposure)) exposure[item.currency] = (exposure[item.currency] ?? 0) + item.estimatedExposure;
  // React Server Components require plain objects across the client boundary.
  return { items, waitingCount, exposure: { ...exposure }, checkedAt: now.toISOString(), externalState: privateAllowed ? input.privateContext.state : "unavailable" as const };
}
