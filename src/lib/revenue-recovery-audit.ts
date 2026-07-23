import "server-only";

import { buildExecutiveMorningBrief, type ExecutiveMorningBrief } from "@/lib/executive-morning-brief";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import {
  buildWorkspaceDecisionQueue,
  type WorkspaceDecisionEvidence,
  type WorkspaceDecisionItem,
  type WorkspaceDecisionQueue,
  type WorkspaceDecisionType
} from "@/lib/workspace-decision-queue";

export type RevenueRecoveryAuditStatus = ExecutiveMorningBrief["status"];

export type RevenueRecoveryAuditGap = {
  type: WorkspaceDecisionType;
  label: string;
  count: number;
  impact: string;
  actionLabel: string;
  actionHref: string;
};

export type RevenueRecoveryAuditPlanStep = {
  period: "Ziua 1" | "Zilele 2–3" | "Zilele 4–7";
  action: string;
  owner: string;
  desiredOutcome: string;
  actionLabel: string;
  actionHref: string;
};

export type RevenueRecoveryAudit = {
  generatedAt: string;
  workspaceName: string;
  status: RevenueRecoveryAuditStatus;
  statusLabel: ExecutiveMorningBrief["statusLabel"];
  headline: string;
  summary: string;
  firstSafeActionLabel: string;
  firstSafeActionHref: string;
  estimatedExposedValueByCurrency: Array<{ currency: string; value: number }>;
  counts: ExecutiveMorningBrief["counts"] & {
    preparedWorkNotAdvanced: number;
    activeOpportunitiesConsidered: number;
  };
  priorities: WorkspaceDecisionItem[];
  companyRisks: WorkspaceDecisionItem[];
  operationalGaps: RevenueRecoveryAuditGap[];
  sevenDayPlan: RevenueRecoveryAuditPlanStep[];
  evidence: WorkspaceDecisionEvidence[];
  sourceState: WorkspaceDecisionQueue["sourceState"];
};

type BuildRevenueRecoveryAuditInput = {
  generatedAt: string;
  workspaceName: string;
  activeOpportunityCount: number;
  queue: WorkspaceDecisionQueue;
  brief: ExecutiveMorningBrief;
};

const gapDefinitions: Array<{
  type: WorkspaceDecisionType;
  label: string;
  impact: string;
  fallbackActionLabel: string;
  fallbackActionHref: string;
}> = [
  {
    type: "overdue_follow_up",
    label: "Follow-up-uri întârziate",
    impact: "Continuitatea comercială este expusă, iar răspunsul poate întârzia.",
    fallbackActionLabel: "Revizuiește acțiunile restante",
    fallbackActionHref: "/today"
  },
  {
    type: "pending_approval",
    label: "Aprobări în așteptare",
    impact: "Semnalele nu pot avansa fără o decizie umană explicită.",
    fallbackActionLabel: "Verifică aprobările",
    fallbackActionHref: "/approvals"
  },
  {
    type: "prepared_work_not_advanced",
    label: "Documente pregătite fără pas final confirmat",
    impact: "Munca pregătită nu produce progres până la revizuire și execuție controlată.",
    fallbackActionLabel: "Revizuiește documentele",
    fallbackActionHref: "/outreach"
  },
  {
    type: "unresolved_signal",
    label: "Semnale prioritare nerezolvate",
    impact: "O decizie comercială poate rămâne blocată în lipsa revizuirii.",
    fallbackActionLabel: "Revizuiește semnalele",
    fallbackActionHref: "/inbox"
  },
  {
    type: "opportunity_without_next_action",
    label: "Oportunități fără acțiune următoare",
    impact: "Oportunitățile pot fi uitate între etape sau echipe.",
    fallbackActionLabel: "Completează următoarele acțiuni",
    fallbackActionHref: "/pipeline"
  },
  {
    type: "opportunity_without_owner",
    label: "Oportunități fără responsabil",
    impact: "Execuția nu are ownership confirmat.",
    fallbackActionLabel: "Atribuie responsabili",
    fallbackActionHref: "/pipeline"
  },
  {
    type: "company_without_primary_contact",
    label: "Companii fără contact principal",
    impact: "Follow-up-ul poate fi generic, duplicat sau direcționat greșit.",
    fallbackActionLabel: "Completează contactele principale",
    fallbackActionHref: "/companies"
  }
];

function uniqueEvidence(items: WorkspaceDecisionItem[]) {
  const seen = new Set<string>();
  const evidence: WorkspaceDecisionEvidence[] = [];
  for (const item of items) {
    for (const source of item.evidence) {
      const key = `${source.sourceType}:${source.sourceId}:${source.href}`;
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push(source);
      if (evidence.length === 12) return evidence;
    }
  }
  return evidence;
}

function buildOperationalGaps(queue: WorkspaceDecisionQueue) {
  return gapDefinitions
    .map((definition): RevenueRecoveryAuditGap | null => {
      const count = queue.countsByType[definition.type] ?? 0;
      if (count === 0) return null;
      const example = queue.items.find((item) => item.type === definition.type);
      return {
        type: definition.type,
        label: definition.label,
        count,
        impact: definition.impact,
        actionLabel: example?.actionLabel ?? definition.fallbackActionLabel,
        actionHref: example?.actionHref ?? definition.fallbackActionHref
      };
    })
    .filter((gap): gap is RevenueRecoveryAuditGap => gap !== null)
    .slice(0, 3);
}

function buildCompanyRisks(items: WorkspaceDecisionItem[]) {
  const companyIds = new Set<string>();
  return items.filter((item) => {
    if (!item.relatedCompanyId || !item.relatedCompanyName || companyIds.has(item.relatedCompanyId)) return false;
    companyIds.add(item.relatedCompanyId);
    return true;
  }).slice(0, 3);
}

function buildSevenDayPlan(
  queue: WorkspaceDecisionQueue,
  brief: ExecutiveMorningBrief,
  gaps: RevenueRecoveryAuditGap[]
): RevenueRecoveryAuditPlanStep[] {
  const top = queue.items[0];
  if (!top) {
    return [{
      period: "Ziua 1",
      action: queue.sourceState === "empty_workspace"
        ? "Adaugă primul semnal comercial real și contextul necesar revizuirii."
        : "Revizuiește semnalele disponibile și confirmă dacă necesită o decizie comercială.",
      owner: "Manager comercial",
      desiredOutcome: "Există o bază verificabilă pentru prioritizare, fără date inventate.",
      actionLabel: brief.firstSafeActionLabel,
      actionHref: brief.firstSafeActionHref
    }];
  }

  const steps: RevenueRecoveryAuditPlanStep[] = [{
    period: "Ziua 1",
    action: `${top.actionLabel}: ${top.title.toLocaleLowerCase("ro-RO")}.`,
    owner: top.ownerName ?? "Manager comercial",
    desiredOutcome: "Principalul risc verificabil are o decizie și un următor pas confirmat.",
    actionLabel: top.actionLabel,
    actionHref: top.actionHref
  }];

  const middle = gaps.find((gap) => ["pending_approval", "opportunity_without_owner", "opportunity_without_next_action"].includes(gap.type));
  if (middle) {
    steps.push({
      period: "Zilele 2–3",
      action: `${middle.actionLabel} pentru cele ${middle.count} ${middle.label.toLocaleLowerCase("ro-RO")}.`,
      owner: "Manager comercial și responsabilii oportunităților",
      desiredOutcome: "Fiecare caz eligibil are decizie umană, ownership și pas următor clar.",
      actionLabel: middle.actionLabel,
      actionHref: middle.actionHref
    });
  }

  const later = gaps.find((gap) => gap !== middle);
  if (later) {
    steps.push({
      period: "Zilele 4–7",
      action: `${later.actionLabel} și verifică dovada de progres pentru cele ${later.count} ${later.label.toLocaleLowerCase("ro-RO")}.`,
      owner: "Responsabilii comerciali",
      desiredOutcome: "Buclele deschise au progres documentat sau o decizie explicită.",
      actionLabel: later.actionLabel,
      actionHref: later.actionHref
    });
  }

  return steps;
}

export function buildRevenueRecoveryAudit(input: BuildRevenueRecoveryAuditInput): RevenueRecoveryAudit {
  const priorities = input.queue.items.slice(0, 5);
  const operationalGaps = buildOperationalGaps(input.queue);
  return {
    generatedAt: input.generatedAt,
    workspaceName: input.workspaceName,
    status: input.brief.status,
    statusLabel: input.brief.statusLabel,
    headline: input.brief.headline,
    summary: input.brief.summary,
    firstSafeActionLabel: input.brief.firstSafeActionLabel,
    firstSafeActionHref: input.brief.firstSafeActionHref,
    estimatedExposedValueByCurrency: input.brief.estimatedExposedValueByCurrency,
    counts: {
      ...input.brief.counts,
      preparedWorkNotAdvanced: input.queue.countsByType.prepared_work_not_advanced ?? 0,
      activeOpportunitiesConsidered: input.activeOpportunityCount
    },
    priorities,
    companyRisks: buildCompanyRisks(input.queue.items),
    operationalGaps,
    sevenDayPlan: buildSevenDayPlan(input.queue, input.brief, operationalGaps),
    evidence: uniqueEvidence(priorities),
    sourceState: input.queue.sourceState
  };
}

export async function getRevenueRecoveryAudit(options: { now?: Date } = {}) {
  const now = options.now ?? new Date();
  const [summary, business] = await Promise.all([
    getRevenueWorkspaceSummary(),
    getCurrentBusinessOrDemo({ redirectIfMissing: true })
  ]);
  const queue = buildWorkspaceDecisionQueue(
    { opportunities: summary.opportunities, signals: summary.signals },
    { now, limit: 20 }
  );
  const brief = buildExecutiveMorningBrief(queue, { now });
  return buildRevenueRecoveryAudit({
    generatedAt: now.toISOString(),
    workspaceName: business?.name ?? "Workspace curent",
    activeOpportunityCount: summary.activeOpportunities.length,
    queue,
    brief
  });
}
