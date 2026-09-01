import {
  APPLICATION_TIME_ZONE,
  DEFAULT_STALE_ACTIVITY_DAYS,
  lifecycleForOpportunity,
  lifecycleLabels,
  selectPrimaryNextAction,
  stageForOpportunity
} from "@/lib/opportunity-domain";
import type {
  CommercialSignal,
  Opportunity,
  OpportunityAction,
  OpportunityDocument,
  OpportunityEvent
} from "@/lib/types";

export type OpportunityTimelineNature = "observed" | "derived";
export type OpportunityTimelineImportance = "major" | "normal" | "minor";
export type OpportunityTimelineSourceType =
  | "opportunity"
  | "opportunity_event"
  | "action"
  | "document"
  | "commercial_signal"
  | "commercial_response"
  | "contact"
  | "email"
  | "calendar_event";

export type OpportunityTimelineEvent = {
  id: string;
  type: string;
  occurredAt: string;
  title: string;
  summary: string;
  nature: OpportunityTimelineNature;
  importance: OpportunityTimelineImportance;
  category: "Oportunitate" | "Acțiune" | "Document" | "Interacțiune" | "Decizie" | "Contact" | "ReveNew";
  source: {
    type: OpportunityTimelineSourceType;
    id: string;
    label: string;
    href?: string;
  };
  evidence: string[];
  actor?: string | null;
  amount?: number | null;
  currency?: string | null;
  statusBefore?: string | null;
  statusAfter?: string | null;
  dedupeKey?: string;
};

export type OpportunityTimelineSnapshot = {
  status: string;
  estimatedValue: number | null;
  currency: string | null;
  latestActivityAt: string | null;
  latestActivityLabel: string;
  nextActionLabel: string;
  nextActionDueAt: string | null;
  nextActionState: "restant" | "programat" | "neconfirmat";
  ownerLabel: string;
};

export type OpportunityTimelineResult = {
  state: "ready" | "limited" | "empty" | "error";
  direction: "newest_first";
  currentState: OpportunityTimelineSnapshot;
  events: OpportunityTimelineEvent[];
  observedCount: number;
  derivedCount: number;
};

type TimelineInput = {
  opportunity: Opportunity;
  linkedSignals?: CommercialSignal[];
  externalContext?: {
    emails: Array<{ id: string; sent_at: string; direction: "inbound" | "outbound"; sender_name: string | null; sender_email: string | null; subject: string | null; excerpt: string | null }>;
    events: Array<{ id: string; title: string | null; starts_at: string; ends_at: string; event_status: string | null }>;
  };
};

type TimelineOptions = {
  now?: Date;
  limit?: number;
  inactivityDays?: number;
};

const dayMs = 86_400_000;
const stageLabels = {
  lead: "Lead",
  qualified: "Calificare",
  proposal: "Propunere",
  won: "Câștigată",
  lost: "Pierdută"
} as const;

function validTimestamp(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function metadataString(event: OpportunityEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function actionStateTitle(action: OpportunityAction) {
  if (action.status === "done") return "Acțiune finalizată";
  if (action.status === "cancelled") return "Acțiune anulată";
  return "Acțiune programată";
}

function actionImportance(action: OpportunityAction): OpportunityTimelineImportance {
  if (action.status === "done" || action.status === "cancelled" || action.priority === "high") return "major";
  return "normal";
}

function actionTimestamp(action: OpportunityAction) {
  if (action.status === "done") return validTimestamp(action.completedAt) ?? validTimestamp(action.updatedAt) ?? validTimestamp(action.createdAt);
  if (action.status === "cancelled") return validTimestamp(action.cancelledAt) ?? validTimestamp(action.updatedAt) ?? validTimestamp(action.createdAt);
  return validTimestamp(action.createdAt);
}

function documentTimestamp(document: OpportunityDocument) {
  return validTimestamp(document.sentAt)
    ?? validTimestamp(document.readyAt)
    ?? validTimestamp(document.editedAt)
    ?? validTimestamp(document.createdAt);
}

function documentTitle(document: OpportunityDocument) {
  if (document.sentAt || document.status === "sent") return "Document comercial marcat ca trimis";
  if (document.status === "approved") return "Document comercial aprobat";
  if (document.readyAt || document.status === "ready_to_send") return "Document pregătit pentru revizuire";
  if (document.editedAt || document.status === "edited") return "Document comercial actualizat";
  return "Document comercial adăugat";
}

function shouldIncludeStoredEvent(event: OpportunityEvent) {
  const type = event.type ?? "event";
  return !/(analysis_saved|readiness_checked|confirmation_opened|send_attempted|provider_|test_completed|replay_blocked|usage_|viewed|opened)$/i.test(type);
}

function eventCategory(type: string): OpportunityTimelineEvent["category"] {
  if (/approval|outcome|won|lost|dismiss|reopen|stage_changed/i.test(type)) return "Decizie";
  if (/document|offer|proposal/i.test(type)) return "Document";
  if (/action|follow_up|task/i.test(type)) return "Acțiune";
  if (/contact|response|signal|reply/i.test(type)) return "Interacțiune";
  return "Oportunitate";
}

function eventImportance(type: string): OpportunityTimelineImportance {
  return /approval|outcome|won|lost|reopen|stage_changed|contacted|response|follow_up/i.test(type) ? "major" : "normal";
}

function normalizeStoredEvent(event: OpportunityEvent): OpportunityTimelineEvent | null {
  const occurredAt = validTimestamp(event.date);
  if (!occurredAt || !shouldIncludeStoredEvent(event)) return null;
  const type = event.type ?? "event";
  const relatedActionId = metadataString(event, "action_id");
  const relatedDocumentId = metadataString(event, "document_id");
  const relatedSignalId = metadataString(event, "signal_id") ?? metadataString(event, "commercial_signal_id");
  const relatedSource = relatedActionId
    ? `action:${relatedActionId}`
    : relatedDocumentId
      ? `document:${relatedDocumentId}`
      : relatedSignalId
        ? `commercial_signal:${relatedSignalId}`
        : null;
  return {
    id: `opportunity_event:${event.id}`,
    type,
    occurredAt,
    title: event.label || "Eveniment comercial înregistrat",
    summary: event.description || "Eveniment păstrat în istoricul oportunității.",
    nature: "observed",
    importance: eventImportance(type),
    category: eventCategory(type),
    source: { type: "opportunity_event", id: event.id, label: "Eveniment înregistrat", href: "#opportunity-source-context" },
    evidence: ["Data și descrierea provin din istoricul persistent al oportunității."],
    actor: event.actorProfileId ? "Membru al echipei" : null,
    statusBefore: metadataString(event, "status_before"),
    statusAfter: metadataString(event, "status_after"),
    dedupeKey: relatedSource ? `${relatedSource}:${occurredAt}` : undefined
  };
}

function normalizeAction(action: OpportunityAction): OpportunityTimelineEvent | null {
  const occurredAt = actionTimestamp(action);
  if (!occurredAt) return null;
  const dueAt = validTimestamp(action.dueDate);
  return {
    id: `action:${action.id}:${action.status}`,
    type: `action_${action.status}`,
    occurredAt,
    title: actionStateTitle(action),
    summary: [action.title, dueAt ? `Termen înregistrat: ${formatTimelineExactDate(dueAt)}` : null].filter(Boolean).join(" · "),
    nature: "observed",
    importance: actionImportance(action),
    category: action.status === "cancelled" ? "Decizie" : "Acțiune",
    source: { type: "action", id: action.id, label: "Acțiune internă", href: "#workflow-actions-list" },
    evidence: ["Starea, termenul și descrierea provin din acțiunea persistentă."],
    actor: action.assignedToName ?? null,
    dedupeKey: `action:${action.id}:${occurredAt}`
  };
}

function normalizeDocument(document: OpportunityDocument): OpportunityTimelineEvent | null {
  const occurredAt = documentTimestamp(document);
  if (!occurredAt) return null;
  return {
    id: `document:${document.id}:${document.status}`,
    type: `document_${document.status}`,
    occurredAt,
    title: documentTitle(document),
    summary: document.title,
    nature: "observed",
    importance: document.status === "sent" || document.status === "approved" || document.status === "ready_to_send" ? "major" : "normal",
    category: "Document",
    source: { type: "document", id: document.id, label: "Document comercial", href: `/outreach/${document.id}` },
    evidence: ["Tipul, starea și data provin din documentul asociat oportunității."],
    dedupeKey: `document:${document.id}:${occurredAt}`
  };
}

function normalizeSignal(signal: CommercialSignal): OpportunityTimelineEvent | null {
  const occurredAt = validTimestamp(signal.occurredAt) ?? validTimestamp(signal.createdAt);
  if (!occurredAt) return null;
  const hasExplicitValueEvidence = /valoare menționată/i.test(signal.valueClue ?? "");
  const explicitAmount = hasExplicitValueEvidence ? Number(signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0) : 0;
  return {
    id: `commercial_signal:${signal.id}`,
    type: "commercial_signal_linked",
    occurredAt,
    title: "Semnal comercial asociat",
    summary: signal.title,
    nature: "observed",
    importance: signal.priority === "urgent" || signal.priority === "high" ? "major" : "normal",
    category: "Interacțiune",
    source: { type: "commercial_signal", id: signal.id, label: signal.sourceLabel ?? "Semnal comercial", href: `/inbox?signal=${signal.id}` },
    evidence: ["Semnalul este legat explicit de această oportunitate în spațiul de lucru."],
    amount: explicitAmount > 0 ? explicitAmount : null,
    currency: explicitAmount > 0 ? signal.currency : null,
    dedupeKey: `commercial_signal:${signal.id}:${occurredAt}`
  };
}

function normalizeOpportunityCreated(opportunity: Opportunity): OpportunityTimelineEvent | null {
  const occurredAt = validTimestamp(opportunity.createdAt);
  if (!occurredAt) return null;
  return {
    id: `opportunity:${opportunity.id}:created`,
    type: "opportunity_created",
    occurredAt,
    title: "Oportunitate înregistrată",
    summary: opportunity.title,
    nature: "observed",
    importance: "major",
    category: "Oportunitate",
    source: { type: "opportunity", id: opportunity.id, label: "Oportunitate", href: "#opportunity-source-context" },
    evidence: ["Data provine din înregistrarea persistentă a oportunității."]
  };
}

function normalizeResponses(opportunity: Opportunity): OpportunityTimelineEvent[] {
  return (opportunity.responses ?? []).flatMap((response) => {
    const occurredAt = validTimestamp(response.respondedAt);
    if (!occurredAt) return [];
    return [{
      id: `commercial_response:${response.id}`,
      type: `commercial_response_${response.category}`,
      occurredAt,
      title: "Răspuns comercial înregistrat",
      summary: response.summary,
      nature: "observed" as const,
      importance: "major" as const,
      category: "Interacțiune" as const,
      source: {
        type: "commercial_response" as const,
        id: response.id,
        label: "Răspuns comercial",
        href: response.sourceDocumentId ? `/outreach/${response.sourceDocumentId}` : "#action-response"
      },
      evidence: ["Rezumatul și momentul provin din răspunsul comercial înregistrat."],
      actor: response.recordedBy || null,
      dedupeKey: `commercial_response:${response.id}:${occurredAt}`
    }];
  });
}

function normalizeContacts(opportunity: Opportunity): OpportunityTimelineEvent[] {
  return (opportunity.contacts ?? []).filter((association) => association.isPrimary).flatMap((association) => {
    const occurredAt = validTimestamp(association.createdAt);
    if (!occurredAt) return [];
    return [{
      id: `contact:${association.id}`,
      type: "primary_contact_associated",
      occurredAt,
      title: "Contact principal asociat",
      summary: association.contact.fullName,
      nature: "observed" as const,
      importance: "normal" as const,
      category: "Contact" as const,
      source: { type: "contact" as const, id: association.id, label: "Contact CRM", href: "#opportunity-contacts" },
      evidence: ["Asocierea principală provine din contactele persistente ale oportunității."]
    }];
  });
}

function eventFingerprint(event: OpportunityTimelineEvent) {
  return event.dedupeKey ?? `${event.source.type}:${event.source.id}:${event.type}:${event.occurredAt}`;
}

function deduplicate(events: OpportunityTimelineEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = eventFingerprint(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function chronologicalCompare(left: OpportunityTimelineEvent, right: OpportunityTimelineEvent) {
  return right.occurredAt.localeCompare(left.occurredAt)
    || (left.nature === right.nature ? 0 : left.nature === "observed" ? -1 : 1)
    || left.id.localeCompare(right.id);
}

function inactivityInsights(observed: OpportunityTimelineEvent[], now: Date, thresholdDays: number) {
  if (observed.length === 0) return [];
  const chronological = [...observed].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
  const insights: OpportunityTimelineEvent[] = [];
  const boundaries = [...chronological, {
    ...chronological[chronological.length - 1],
    id: "timeline-now-boundary",
    occurredAt: now.toISOString(),
    title: "Acum"
  }];
  for (let index = 1; index < boundaries.length; index += 1) {
    const previous = boundaries[index - 1];
    const current = boundaries[index];
    const difference = Date.parse(current.occurredAt) - Date.parse(previous.occurredAt);
    const days = Math.floor(difference / dayMs);
    if (days < thresholdDays) continue;
    insights.push({
      id: `derived:inactivity:${previous.id}:${current.id}`,
      type: "inactivity_gap",
      occurredAt: current.occurredAt,
      title: `${days} zile fără activitate înregistrată`,
      summary: `Interval calculat între „${previous.title}” și ${current.id === "timeline-now-boundary" ? "momentul actual" : `„${current.title}”`}.`,
      nature: "derived",
      importance: "major",
      category: "ReveNew",
      source: { type: previous.source.type, id: previous.source.id, label: previous.source.label, href: previous.source.href },
      evidence: [`Ultima activitate observată: ${formatTimelineExactDate(previous.occurredAt)}.`, current.id === "timeline-now-boundary" ? `Verificat la: ${formatTimelineExactDate(current.occurredAt)}.` : `Următoarea activitate observată: ${formatTimelineExactDate(current.occurredAt)}.`]
    });
  }
  return insights;
}

function overdueInsights(actions: OpportunityAction[], now: Date): OpportunityTimelineEvent[] {
  return actions.flatMap((action) => {
    const dueAt = validTimestamp(action.dueDate);
    if (action.status !== "pending" || !dueAt || Date.parse(dueAt) >= now.getTime()) return [];
    return [{
      id: `derived:overdue:${action.id}`,
      type: "action_became_overdue",
      occurredAt: dueAt,
      title: "Acțiune devenită restantă",
      summary: `${action.title} · termen depășit, finalizare neînregistrată.`,
      nature: "derived" as const,
      importance: "major" as const,
      category: "ReveNew" as const,
      source: { type: "action" as const, id: action.id, label: "Acțiune internă", href: "#workflow-actions-list" },
      evidence: [`Termen persistent: ${formatTimelineExactDate(dueAt)}.`, "Stare persistentă: în așteptare."]
    }];
  });
}

function missingNextActionInsight(opportunity: Opportunity, now: Date): OpportunityTimelineEvent[] {
  if (selectPrimaryNextAction(opportunity.actions)) return [];
  return [{
    id: `derived:missing-next-action:${opportunity.id}`,
    type: "missing_next_action",
    occurredAt: now.toISOString(),
    title: "Următorul pas nu este confirmat",
    summary: "Nu există o acțiune viitoare înregistrată pentru această oportunitate.",
    nature: "derived",
    importance: "major",
    category: "ReveNew",
    source: { type: "opportunity", id: opportunity.id, label: "Acțiunile oportunității", href: "#action-schedule" },
    evidence: ["Lista acțiunilor nu conține un pas în așteptare."]
  }];
}

function normalizeExternalEmail(email: NonNullable<TimelineInput["externalContext"]>["emails"][number]): OpportunityTimelineEvent | null {
  const occurredAt = validTimestamp(email.sent_at);
  if (!occurredAt) return null;
  const inbound = email.direction === "inbound";
  const identity = email.sender_name || email.sender_email || "Contact neidentificat";
  return {
    id: `email:${email.id}`,
    type: inbound ? "email_received" : "email_sent",
    occurredAt,
    title: inbound ? `Email primit de la ${identity}` : "Email trimis",
    summary: [email.subject || "Fără subiect", email.excerpt].filter(Boolean).join(" · ").slice(0, 320),
    nature: "observed",
    importance: "major",
    category: "Interacțiune",
    source: { type: "email", id: email.id, label: "Gmail autorizat", href: `/inbox?email=${email.id}` },
    evidence: ["Mesaj sincronizat din conexiunea Gmail privată a utilizatorului curent."],
    dedupeKey: `email:${email.id}`
  };
}

function normalizeExternalMeeting(event: NonNullable<TimelineInput["externalContext"]>["events"][number]): OpportunityTimelineEvent | null {
  const occurredAt = validTimestamp(event.starts_at);
  if (!occurredAt) return null;
  return {
    id: `calendar:${event.id}`,
    type: "calendar_meeting",
    occurredAt,
    title: event.title || "Întâlnire comercială",
    summary: `Eveniment Calendar · ${event.event_status || "status neconfirmat"}`,
    nature: "observed",
    importance: "major",
    category: "Interacțiune",
    source: { type: "calendar_event", id: event.id, label: "Google Calendar autorizat" },
    evidence: ["Eveniment sincronizat din conexiunea Calendar privată a utilizatorului curent."],
    dedupeKey: `calendar:${event.id}`
  };
}
function buildSnapshot(opportunity: Opportunity, observed: OpportunityTimelineEvent[], now: Date): OpportunityTimelineSnapshot {
  const nextAction = selectPrimaryNextAction(opportunity.actions);
  const dueAt = validTimestamp(nextAction?.dueDate);
  const estimatedValue = Number(opportunity.estimatedValueHigh ?? opportunity.estimatedValueLow ?? 0);
  const latest = [...observed].sort(chronologicalCompare)[0] ?? null;
  const lifecycle = lifecycleForOpportunity(opportunity);
  return {
    status: lifecycle === "open" ? stageLabels[stageForOpportunity(opportunity)] : lifecycleLabels[lifecycle],
    estimatedValue: estimatedValue > 0 ? estimatedValue : null,
    currency: estimatedValue > 0 ? opportunity.currency ?? "RON" : null,
    latestActivityAt: latest?.occurredAt ?? null,
    latestActivityLabel: latest?.title ?? "Nicio activitate înregistrată",
    nextActionLabel: nextAction?.title ?? "Următorul pas nu este confirmat",
    nextActionDueAt: dueAt,
    nextActionState: !nextAction ? "neconfirmat" : dueAt && Date.parse(dueAt) < now.getTime() ? "restant" : "programat",
    ownerLabel: opportunity.ownerName ?? "Responsabil neconfirmat"
  };
}

export function buildOpportunityIntelligenceTimeline(input: TimelineInput, options: TimelineOptions = {}): OpportunityTimelineResult {
  const now = options.now ?? new Date();
  const thresholdDays = options.inactivityDays ?? DEFAULT_STALE_ACTIVITY_DAYS;
  const limit = Math.max(1, Math.min(options.limit ?? 24, 50));
  const observed = deduplicate([
    normalizeOpportunityCreated(input.opportunity),
    ...input.opportunity.actions.map(normalizeAction),
    ...input.opportunity.documents.map(normalizeDocument),
    ...normalizeResponses(input.opportunity),
    ...normalizeContacts(input.opportunity),
    ...(input.linkedSignals ?? [])
      .filter((signal) => !input.opportunity.businessId || signal.businessId === input.opportunity.businessId)
      .map(normalizeSignal),
    ...(input.externalContext?.emails ?? []).map(normalizeExternalEmail),
    ...(input.externalContext?.events ?? []).map(normalizeExternalMeeting),
    ...input.opportunity.timeline.map(normalizeStoredEvent)
  ].filter((event): event is OpportunityTimelineEvent => Boolean(event)));
  const derived = [
    ...inactivityInsights(observed, now, thresholdDays),
    ...overdueInsights(input.opportunity.actions, now),
    ...missingNextActionInsight(input.opportunity, now)
  ];
  const events = deduplicate([...observed, ...derived]).sort(chronologicalCompare).slice(0, limit);
  return {
    state: observed.length === 0 ? "empty" : observed.length < 3 ? "limited" : "ready",
    direction: "newest_first",
    currentState: buildSnapshot(input.opportunity, observed, now),
    events,
    observedCount: observed.length,
    derivedCount: derived.length
  };
}

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APPLICATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function dateKey(value: Date) {
  const parts = Object.fromEntries(dateKeyFormatter.formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTimelineDateGroup(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Dată neconfirmată";
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - dayMs));
  const key = dateKey(date);
  if (key === today) return "Astăzi";
  if (key === yesterday) return "Ieri";
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: APPLICATION_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: key.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric"
  }).format(date);
}

export function formatTimelineExactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Dată neconfirmată";
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: APPLICATION_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
