import "server-only";

import type { RecoveryAction, RecoveryEvent } from "@/lib/recovery";
import type { CommercialSignal } from "@/lib/types";
import type {
  WorkspaceDecisionEvidence,
  WorkspaceDecisionItem,
  WorkspaceDecisionQueue,
  WorkspaceDecisionSeverity,
  WorkspaceDecisionType
} from "@/lib/workspace-decision-queue";

export type ExecutiveDailyBriefState = "ready" | "clear" | "insufficient";
export type ExecutiveBriefItemKind = "action" | "decision" | "information";
export type ExecutiveMorningBriefStatus = "critical" | "attention" | "stable" | "incomplete";

export type ExecutiveBriefPriority = {
  id: string;
  kind: ExecutiveBriefItemKind;
  kindLabel: "De făcut" | "Necesită decizie" | "De verificat";
  severity: WorkspaceDecisionSeverity;
  statusLabel: string;
  title: string;
  company?: string;
  opportunity?: string;
  reason: string;
  whyItMatters: string;
  derivedReasonAssumption?: string;
  supportingFacts: string[];
  evidence: WorkspaceDecisionEvidence[];
  amount?: number;
  currency?: string;
  valueKind?: "estimated_unconfirmed";
  dueAt?: string;
  occurredAt: string | null;
  safeAction: { label: string; href: string };
};

export type ExecutiveBriefChange = {
  id: string;
  label: string;
  context: string;
  occurredAt: string;
  href?: string;
};

export type ExecutiveDailyBrief = {
  generatedAt: string;
  period: { hours: 24; label: "În ultimele 24 de ore" };
  salutation: string;
  state: ExecutiveDailyBriefState;
  headline: string;
  summary: string;
  primaryPriority: ExecutiveBriefPriority | null;
  secondaryPriorities: ExecutiveBriefPriority[];
  hiddenPriorityCount: number;
  allPrioritiesHref: string;
  recentChanges: ExecutiveBriefChange[];
  assignedTodaySummary: { dueToday: number; overdue: number; href: "/today" };
  evidenceCoverage: { covered: number; visiblePriorities: number };
  scope: "individual" | "management";
};

type LegacyBriefCounts = {
  criticalDecisions: number;
  attentionDecisions: number;
  overdueFollowUps: number;
  pendingApprovals: number;
  unresolvedSignals: number;
  missingNextActions: number;
  missingOwners: number;
  missingPrimaryContacts: number;
};

export type ExecutiveMorningBrief = ExecutiveDailyBrief & {
  status: ExecutiveMorningBriefStatus;
  statusLabel: string;
  dateLabel: string;
  primaryRisk: string;
  whyItMatters: string;
  firstSafeActionLabel: string;
  firstSafeActionHref: string;
  evidence: WorkspaceDecisionEvidence | null;
  topDecisionItemId: string | null;
  counts: LegacyBriefCounts;
  estimatedExposedValueByCurrency: Array<{ currency: string; value: number }>;
  bullets: Array<{ id: string; title: string; context: string; detail: string }>;
};

type BriefOptions = {
  now?: Date;
  viewerName?: string | null;
  scope?: ExecutiveDailyBrief["scope"];
  actions?: RecoveryAction[];
  events?: RecoveryEvent[];
  signals?: CommercialSignal[];
  assignedToday?: { dueToday: number; overdue: number };
};

const meaningfulEventTypes = new Set([
  "action_completed",
  "approval_granted",
  "approval_rejected",
  "commercial_response_recorded",
  "follow_up_scheduled",
  "next_action_created",
  "outcome_recorded",
  "stage_changed"
]);

function validTimestamp(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

function daypart(now: Date) {
  const parts = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Bucharest" }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 12);
  return hour < 12 ? "Bună dimineața" : hour < 18 ? "Bună ziua" : "Bună seara";
}

function salutation(now: Date, viewerName?: string | null) {
  const firstName = viewerName?.trim().split(/\s+/)[0];
  return firstName ? `${daypart(now)}, ${firstName}.` : `${daypart(now)}.`;
}

function itemKind(type: WorkspaceDecisionType): Pick<ExecutiveBriefPriority, "kind" | "kindLabel"> {
  if (type === "pending_approval") return { kind: "decision", kindLabel: "Necesită decizie" };
  if (type === "unresolved_signal" || type === "inactive_active_opportunity") return { kind: "information", kindLabel: "De verificat" };
  return { kind: "action", kindLabel: "De făcut" };
}

function groupKey(item: WorkspaceDecisionItem) {
  if (item.type === "pending_approval") return "approvals:pending";
  if (item.relatedOpportunityId) return `opportunity:${item.relatedOpportunityId}`;
  if (item.relatedCompanyId) return `company:${item.relatedCompanyId}:${item.type}`;
  return `${item.evidence[0]?.sourceType}:${item.evidence[0]?.sourceId ?? item.id}`;
}

function uniqueEvidence(items: WorkspaceDecisionItem[]) {
  const evidence = new Map<string, WorkspaceDecisionEvidence>();
  for (const item of items) {
    for (const source of item.evidence) evidence.set(`${source.sourceType}:${source.sourceId}`, source);
  }
  return Array.from(evidence.values()).slice(0, 4);
}

function priorityFromGroup(items: WorkspaceDecisionItem[]): ExecutiveBriefPriority {
  const primary = items[0]!;
  const approvals = primary.type === "pending_approval" && items.length > 1;
  const facts = [...items.map((item) => item.reason), ...items.map((item) => item.statusLabel)]
    .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
    .slice(0, 4);
  return {
    id: approvals ? "brief:pending-approvals" : `brief:${primary.id}`,
    ...itemKind(primary.type),
    severity: primary.severity,
    statusLabel: approvals ? `${items.length} în așteptare` : primary.statusLabel,
    title: approvals ? `${items.length} aprobări așteaptă decizie` : primary.title,
    ...(approvals ? {} : primary.relatedCompanyName ? { company: primary.relatedCompanyName } : {}),
    ...(approvals ? {} : primary.relatedOpportunityTitle ? { opportunity: primary.relatedOpportunityTitle } : {}),
    reason: approvals ? "Mai multe semnale sunt pregătite pentru o decizie umană." : primary.reason,
    whyItMatters: approvals ? "Aprobările pot bloca avansarea controlată a mai multor elemente comerciale." : primary.whyItMatters,
    derivedReasonAssumption: primary.type === "inactive_active_opportunity" ? "Interpretarea folosește numai activitatea înregistrată în ReveNew." : undefined,
    supportingFacts: facts,
    evidence: uniqueEvidence(items),
    ...(!approvals && primary.estimatedValue !== undefined && primary.currency ? { amount: primary.estimatedValue, currency: primary.currency, valueKind: "estimated_unconfirmed" as const } : {}),
    ...(!approvals && primary.dueAt ? { dueAt: primary.dueAt } : {}),
    occurredAt: primary.occurredAt,
    safeAction: { label: approvals ? "Verifică aprobările" : primary.actionLabel, href: approvals ? "/approvals" : primary.actionHref }
  };
}

function mergePriorities(queue: WorkspaceDecisionQueue) {
  const groups = new Map<string, WorkspaceDecisionItem[]>();
  for (const item of queue.items) {
    const key = groupKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.values()).map(priorityFromGroup);
}

function allPrioritiesHref(priorities: ExecutiveBriefPriority[]) {
  if (priorities.length > 0 && priorities.every((item) => item.safeAction.href.startsWith("/approvals"))) return "/approvals";
  if (priorities.length > 0 && priorities.every((item) => item.safeAction.href.startsWith("/inbox"))) return "/inbox";
  return "/recoverable";
}

function recentChanges(options: BriefOptions, now: Date) {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const changes: ExecutiveBriefChange[] = [];
  const inPeriod = (value: string) => Date.parse(value) >= cutoff && Date.parse(value) <= now.getTime();

  for (const event of options.events ?? []) {
    const occurredAt = validTimestamp(event.date);
    if (!occurredAt || !inPeriod(occurredAt) || !meaningfulEventTypes.has(event.type)) continue;
    changes.push({ id: `event:${event.id}`, label: event.label, context: "Schimbare înregistrată în istoricul oportunității", occurredAt, ...(event.opportunityId ? { href: `/opportunities/${event.opportunityId}#opportunity-timeline` } : {}) });
  }

  for (const action of options.actions ?? []) {
    const completedAt = validTimestamp(action.completedAt);
    if (action.status === "done" && completedAt && inPeriod(completedAt)) {
      changes.push({ id: `action-completed:${action.id}`, label: "Acțiune comercială finalizată", context: `${action.company} · ${action.title}`, occurredAt: completedAt, ...(action.opportunityId ? { href: `/opportunities/${action.opportunityId}#workflow-actions` } : {}) });
    }
    const dueAt = validTimestamp(action.dueAt);
    if (action.status === "pending" && dueAt && Date.parse(dueAt) >= cutoff && Date.parse(dueAt) < now.getTime()) {
      changes.push({ id: `action-overdue:${action.id}`, label: "Follow-up devenit restant", context: `${action.company} · ${action.title}`, occurredAt: dueAt, ...(action.opportunityId ? { href: `/opportunities/${action.opportunityId}#workflow-actions` } : {}) });
    }
  }

  for (const signal of options.signals ?? []) {
    if (["archived", "dismissed", "duplicate", "ignored"].includes(signal.status)) continue;
    const occurredAt = validTimestamp(signal.createdAt) ?? validTimestamp(signal.occurredAt);
    if (!occurredAt || !inPeriod(occurredAt)) continue;
    changes.push({ id: `signal:${signal.id}`, label: "Semnal comercial nou", context: [signal.contactCompany, signal.title].filter(Boolean).join(" · "), occurredAt, href: `/inbox?signal=${signal.id}` });
  }

  const unique = new Map<string, ExecutiveBriefChange>();
  for (const change of changes.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || left.id.localeCompare(right.id))) {
    if (!unique.has(change.id)) unique.set(change.id, change);
  }
  return Array.from(unique.values()).slice(0, 3);
}

export function buildExecutiveMorningBrief(queue: WorkspaceDecisionQueue, options: BriefOptions = {}): ExecutiveMorningBrief {
  const now = options.now ?? new Date();
  const priorities = mergePriorities(queue);
  const visible = priorities.slice(0, 3);
  const state: ExecutiveDailyBriefState = queue.sourceState === "empty_workspace" || (queue.sourceState === "signals_only" && priorities.length === 0)
    ? "insufficient"
    : priorities.length === 0 ? "clear" : "ready";
  const headline = state === "ready"
    ? `${visible.length} ${visible.length === 1 ? "lucru merită" : "lucruri merită"} verificate acum.`
    : state === "clear" ? "Nu există priorități comerciale critice acum" : "Nu există suficiente date pentru un briefing complet";
  const summary = state === "ready"
    ? "Începe cu prioritatea principală; celelalte elemente rămân secundare și nu sunt executate automat."
    : state === "clear"
      ? "Nu am identificat acțiuni restante, aprobări blocate sau semnale puternice care necesită verificare imediată."
      : "ReveNew poate prioritiza numai activitatea comercială înregistrată în spațiul de lucru.";
  const changes = recentChanges(options, now);
  const top = queue.items[0] ?? null;
  const status: ExecutiveMorningBriefStatus = state === "insufficient"
    ? "incomplete"
    : queue.criticalCount > 0 ? "critical" : queue.attentionCount > 0 ? "attention" : "stable";
  const counts: LegacyBriefCounts = {
    criticalDecisions: queue.criticalCount,
    attentionDecisions: queue.attentionCount,
    overdueFollowUps: queue.countsByType.overdue_follow_up,
    pendingApprovals: queue.countsByType.pending_approval,
    unresolvedSignals: queue.countsByType.unresolved_signal,
    missingNextActions: queue.countsByType.opportunity_without_next_action,
    missingOwners: queue.countsByType.opportunity_without_owner,
    missingPrimaryContacts: queue.countsByType.company_without_primary_contact
  };
  const fallbackAction = queue.sourceState === "empty_workspace"
    ? { label: "Adaugă primul semnal", href: "/inbox?create=1" }
    : { label: "Revizuiește semnalele", href: "/inbox" };

  return {
    generatedAt: now.toISOString(),
    period: { hours: 24, label: "În ultimele 24 de ore" },
    salutation: salutation(now, options.viewerName),
    state,
    headline,
    summary,
    primaryPriority: visible[0] ?? null,
    secondaryPriorities: visible.slice(1),
    hiddenPriorityCount: Math.max(0, priorities.length - visible.length),
    allPrioritiesHref: allPrioritiesHref(priorities),
    recentChanges: changes,
    assignedTodaySummary: { dueToday: options.assignedToday?.dueToday ?? 0, overdue: options.assignedToday?.overdue ?? 0, href: "/today" },
    evidenceCoverage: { covered: visible.filter((item) => item.evidence.length > 0).length, visiblePriorities: visible.length },
    scope: options.scope ?? "individual",
    status,
    statusLabel: status === "critical" ? "Intervenție necesară" : status === "attention" ? "Necesită atenție" : status === "stable" ? "Situație stabilă" : "Date insuficiente",
    dateLabel: new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeZone: "Europe/Bucharest" }).format(now),
    primaryRisk: top?.title ?? (state === "clear" ? "Fără blocaje critice identificate" : "Date comerciale insuficiente"),
    whyItMatters: top?.whyItMatters ?? summary,
    firstSafeActionLabel: top?.actionLabel ?? fallbackAction.label,
    firstSafeActionHref: top?.actionHref ?? fallbackAction.href,
    evidence: top?.evidence[0] ?? null,
    topDecisionItemId: top?.id ?? null,
    counts,
    estimatedExposedValueByCurrency: Object.entries(queue.estimatedExposedValueByCurrency)
      .filter(([, value]) => Number.isFinite(value) && value > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, value]) => ({ currency, value })),
    bullets: queue.items.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      context: [item.relatedCompanyName, item.relatedOpportunityTitle].filter(Boolean).join(" · "),
      detail: item.reason
    }))
  };
}
