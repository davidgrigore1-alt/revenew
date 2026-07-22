import "server-only";

import type {
  WorkspaceDecisionEvidence,
  WorkspaceDecisionQueue,
  WorkspaceDecisionType
} from "@/lib/workspace-decision-queue";

export type ExecutiveMorningBriefStatus = "stable" | "attention" | "critical" | "incomplete";

export type ExecutiveMorningBrief = {
  dateLabel: string;
  status: ExecutiveMorningBriefStatus;
  statusLabel: "Stabil" | "Necesită atenție" | "Critic" | "Incomplet";
  headline: string;
  summary: string;
  primaryRisk: string;
  whyItMatters: string;
  firstSafeActionLabel: string;
  firstSafeActionHref: string;
  evidence: WorkspaceDecisionEvidence | null;
  counts: {
    criticalDecisions: number;
    attentionDecisions: number;
    pendingApprovals: number;
    missingNextActions: number;
    missingOwners: number;
    missingPrimaryContacts: number;
    unresolvedSignals: number;
    overdueFollowUps: number;
  };
  estimatedExposedValueByCurrency: Array<{ currency: string; value: number }>;
  bullets: Array<{ id: string; title: string; detail: string }>;
  topDecisionItemId: string | null;
};

const statusLabels: Record<ExecutiveMorningBriefStatus, ExecutiveMorningBrief["statusLabel"]> = {
  stable: "Stabil",
  attention: "Necesită atenție",
  critical: "Critic",
  incomplete: "Incomplet"
};

function count(queue: WorkspaceDecisionQueue, type: WorkspaceDecisionType) {
  return queue.countsByType[type] ?? 0;
}

function dateLabel(now: Date) {
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Bucharest"
  }).format(now);
}

function statusForQueue(queue: WorkspaceDecisionQueue): ExecutiveMorningBriefStatus {
  if (queue.sourceState === "empty_workspace") return "incomplete";
  if (queue.criticalCount > 0) return "critical";
  if (queue.attentionCount > 0) return "attention";
  if (queue.sourceState === "signals_only") return "incomplete";
  return "stable";
}

function headlineForStatus(status: ExecutiveMorningBriefStatus, queue: WorkspaceDecisionQueue) {
  if (status === "critical") {
    return `${queue.criticalCount} ${queue.criticalCount === 1 ? "decizie critică poate" : "decizii critice pot"} bloca progresul comercial.`;
  }
  if (status === "attention") {
    return `${queue.attentionCount} ${queue.attentionCount === 1 ? "prioritate comercială necesită" : "priorități comerciale necesită"} revizuire astăzi.`;
  }
  if (status === "stable") return "Nu există decizii critice acum.";
  return "Adaugă semnale sau oportunități pentru un brief operațional complet.";
}

export function buildExecutiveMorningBrief(
  queue: WorkspaceDecisionQueue,
  options: { now?: Date } = {}
): ExecutiveMorningBrief {
  const now = options.now ?? new Date();
  const status = statusForQueue(queue);
  const primary = queue.items[0] ?? null;
  const noData = queue.sourceState === "empty_workspace";
  const partialData = queue.sourceState === "signals_only" && !primary;
  const firstSafeActionLabel = primary?.actionLabel
    ?? (noData ? "Adaugă primul semnal" : partialData ? "Revizuiește semnalele" : "Verifică coada de recuperare");
  const firstSafeActionHref = primary?.actionHref
    ?? (noData ? "/inbox?create=1" : partialData ? "/inbox" : "/recoverable");
  const primaryRisk = primary?.title
    ?? (status === "stable" ? "Nu există un blocaj critic dovedit în datele disponibile." : "Nu există suficiente date pentru o prioritate comercială verificabilă.");
  const whyItMatters = primary?.whyItMatters
    ?? (status === "stable"
      ? "Conducerea poate monitoriza execuția fără o intervenție critică imediată."
      : "Fără semnale sau oportunități nu poate fi stabilită o prioritate operațională susținută de dovezi.");
  const summary = primary
    ? `Prioritatea principală este „${primary.title}”. Începe cu acțiunea „${primary.actionLabel.toLocaleLowerCase("ro-RO")}” înainte de extinderea pipeline-ului.`
    : status === "stable"
      ? "Datele disponibile nu indică un blocaj critic. Verifică periodic execuția și completează informațiile comerciale lipsă."
      : "Adaugă context comercial real pentru ca ReveNew să poată ordona deciziile și următoarele acțiuni sigure.";

  return {
    dateLabel: dateLabel(now),
    status,
    statusLabel: statusLabels[status],
    headline: headlineForStatus(status, queue),
    summary,
    primaryRisk,
    whyItMatters,
    firstSafeActionLabel,
    firstSafeActionHref,
    evidence: primary?.evidence[0] ?? null,
    counts: {
      criticalDecisions: queue.criticalCount,
      attentionDecisions: queue.attentionCount,
      pendingApprovals: count(queue, "pending_approval"),
      missingNextActions: count(queue, "opportunity_without_next_action"),
      missingOwners: count(queue, "opportunity_without_owner"),
      missingPrimaryContacts: count(queue, "company_without_primary_contact"),
      unresolvedSignals: count(queue, "unresolved_signal"),
      overdueFollowUps: count(queue, "overdue_follow_up")
    },
    estimatedExposedValueByCurrency: Object.entries(queue.estimatedExposedValueByCurrency)
      .filter(([, value]) => Number.isFinite(value) && value > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, value]) => ({ currency, value })),
    bullets: queue.items.slice(0, 3).map((item) => ({ id: item.id, title: item.title, detail: item.whyItMatters })),
    topDecisionItemId: primary?.id ?? null
  };
}
