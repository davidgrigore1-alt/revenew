export const PILOT_DEFINITION_VERSION = "commercial-state-v1";
export const PILOT_SNAPSHOT_FORMAT_VERSION = 1;

export const pilotMetricKeys = [
  "owner_coverage_pp",
  "next_action_coverage_pp",
  "overdue_followups_reduction",
  "stale_opportunities_reduction",
  "actions_completed",
  "human_confirmed_exceptions",
  "confirmed_outcomes"
] as const;

export type PilotMetricKey = (typeof pilotMetricKeys)[number];
export type PilotCriterionStatus = "met" | "not_met" | "insufficient_data";
export type MeasurementClassification = "observed" | "derived" | "human_confirmed" | "unknown";

export type PilotSuccessCriterion = {
  id: string;
  metric: PilotMetricKey;
  targetValue: number;
  explanation: string;
};

export type PilotContract = {
  id: string;
  businessId: string;
  cohortOpportunityIds: string[];
  successCriteria: PilotSuccessCriterion[];
  definitionVersion: string;
  timezone: string;
  comparisonPolicy: { staleAfterDays: number; overdueReference: "captured_at" };
};

export type PilotSnapshotOpportunity = {
  opportunityId: string;
  organizationId: string | null;
  title: string;
  stage: string;
  lifecycle: string;
  estimatedValue: number | null;
  currency: string;
  confirmedRevenue: number | null;
  ownerState: "missing" | "unverified" | "confirmed";
  nextActionState: "missing" | "scheduled" | "overdue";
  nextActionDueAt: string | null;
  lastMeaningfulActivityAt: string | null;
  inactivityDays: number | null;
  stale: boolean;
  approvalState: "not_required" | "pending";
  documentState: "none" | "draft" | "prepared" | "sent";
  responseState: "none" | "recorded";
  outcomeState: string;
  outcomeConfirmedByHuman: boolean;
  exceptionCodes: string[];
  evidence: Array<{ id: string; sourceType: string; sourceId: string; label: string; observedAt: string | null; href: string }>;
  safeIntervention: { label: string; href: string };
  missingInformation: string[];
};

export type PilotSnapshotMetrics = {
  cohortSize: number;
  ownerAssigned: number;
  nextActionDefined: number;
  overdueFollowUps: number;
  staleOpportunities: number;
  exceptionCount: number;
  pendingApprovals: number;
  actionsCreated: number;
  actionsCompleted: number;
  humanConfirmedExceptions: number;
  humanDismissedExceptions: number;
  confirmedOutcomes: number;
  missingDataItems: number;
  estimatedValueByCurrency: Array<{ currency: string; value: number }>;
  confirmedRevenueByCurrency: Array<{ currency: string; value: number }>;
};

export type PilotSnapshotPayload = {
  formatVersion: number;
  definitionVersion: string;
  pilotId: string;
  businessId: string;
  snapshotKind: "baseline" | "checkpoint" | "final";
  capturedAt: string;
  timezone: string;
  comparisonPolicy: PilotContract["comparisonPolicy"];
  cohortOpportunityIds: string[];
  opportunities: PilotSnapshotOpportunity[];
  metrics: PilotSnapshotMetrics;
  classifications: Record<keyof PilotSnapshotMetrics, MeasurementClassification>;
  newDuringPilotOpportunityIds: string[];
  limitations: string[];
};

export type PilotCriterionEvaluation = PilotSuccessCriterion & {
  status: PilotCriterionStatus;
  baselineValue: number | null;
  finalValue: number | null;
  change: number | null;
  unit: "puncte procentuale" | "oportunități" | "înregistrări";
};

export type PilotComparison = {
  baselineCapturedAt: string;
  finalCapturedAt: string;
  cohortSize: number;
  criteria: PilotCriterionEvaluation[];
  criteriaSummary: { met: number; notMet: number; insufficientData: number };
  changes: Array<{ metric: PilotMetricKey; label: string; baseline: number; final: number; change: number; unit: string }>;
  estimatedValueByCurrency: PilotSnapshotMetrics["estimatedValueByCurrency"];
  confirmedRevenueByCurrency: PilotSnapshotMetrics["confirmedRevenueByCurrency"];
  newDuringPilotOpportunityIds: string[];
  limitations: string[];
};

function totalsByCurrency(items: PilotSnapshotOpportunity[], value: (item: PilotSnapshotOpportunity) => number | null) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const amount = value(item);
    if (amount === null || !Number.isFinite(amount) || amount <= 0) continue;
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + amount);
  }
  return Array.from(totals).map(([currency, amount]) => ({ currency, value: amount })).sort((a, b) => a.currency.localeCompare(b.currency));
}

export function buildPilotSnapshot(input: {
  contract: PilotContract;
  snapshotKind: PilotSnapshotPayload["snapshotKind"];
  capturedAt: string;
  opportunities: PilotSnapshotOpportunity[];
  actionFacts: Array<{ opportunityId: string; createdAt: string | null; completedAt: string | null }>;
  reviewFacts: Array<{ opportunityId: string | null; decision: "confirmed" | "dismissed" | "unknown" }>;
  newDuringPilotOpportunityIds?: string[];
  limitations?: string[];
}): PilotSnapshotPayload {
  const unique = new Map<string, PilotSnapshotOpportunity>();
  for (const item of input.opportunities) if (!unique.has(item.opportunityId)) unique.set(item.opportunityId, item);
  const cohort = input.contract.cohortOpportunityIds.map((id) => unique.get(id)).filter((item): item is PilotSnapshotOpportunity => Boolean(item));
  if (cohort.length !== input.contract.cohortOpportunityIds.length) throw new Error("Cohorta pilotului nu poate fi măsurată integral.");
  const cohortIds = new Set(input.contract.cohortOpportunityIds);
  const actionFacts = input.actionFacts.filter((item) => cohortIds.has(item.opportunityId));
  const reviewFacts = input.reviewFacts.filter((item) => item.opportunityId && cohortIds.has(item.opportunityId));
  const metrics: PilotSnapshotMetrics = {
    cohortSize: cohort.length,
    ownerAssigned: cohort.filter((item) => item.ownerState !== "missing").length,
    nextActionDefined: cohort.filter((item) => item.nextActionState !== "missing").length,
    overdueFollowUps: cohort.filter((item) => item.nextActionState === "overdue").length,
    staleOpportunities: cohort.filter((item) => item.stale).length,
    exceptionCount: cohort.reduce((sum, item) => sum + new Set(item.exceptionCodes).size, 0),
    pendingApprovals: cohort.filter((item) => item.approvalState === "pending").length,
    actionsCreated: actionFacts.filter((item) => Boolean(item.createdAt)).length,
    actionsCompleted: actionFacts.filter((item) => Boolean(item.completedAt)).length,
    humanConfirmedExceptions: reviewFacts.filter((item) => item.decision === "confirmed").length,
    humanDismissedExceptions: reviewFacts.filter((item) => item.decision === "dismissed").length,
    confirmedOutcomes: cohort.filter((item) => item.outcomeConfirmedByHuman).length,
    missingDataItems: cohort.reduce((sum, item) => sum + item.missingInformation.length, 0),
    estimatedValueByCurrency: totalsByCurrency(cohort, (item) => item.estimatedValue),
    confirmedRevenueByCurrency: totalsByCurrency(cohort.filter((item) => item.outcomeConfirmedByHuman), (item) => item.confirmedRevenue)
  };
  return {
    formatVersion: PILOT_SNAPSHOT_FORMAT_VERSION,
    definitionVersion: input.contract.definitionVersion,
    pilotId: input.contract.id,
    businessId: input.contract.businessId,
    snapshotKind: input.snapshotKind,
    capturedAt: input.capturedAt,
    timezone: input.contract.timezone,
    comparisonPolicy: input.contract.comparisonPolicy,
    cohortOpportunityIds: [...input.contract.cohortOpportunityIds],
    opportunities: cohort,
    metrics,
    classifications: {
      cohortSize: "observed", ownerAssigned: "derived", nextActionDefined: "derived", overdueFollowUps: "derived",
      staleOpportunities: "derived", exceptionCount: "derived", pendingApprovals: "observed", actionsCreated: "observed",
      actionsCompleted: "observed", humanConfirmedExceptions: "human_confirmed", humanDismissedExceptions: "human_confirmed",
      confirmedOutcomes: "human_confirmed", missingDataItems: "derived", estimatedValueByCurrency: "observed",
      confirmedRevenueByCurrency: "human_confirmed"
    },
    newDuringPilotOpportunityIds: Array.from(new Set(input.newDuringPilotOpportunityIds ?? []))
      .filter((id) => !cohortIds.has(id)),
    limitations: Array.from(new Set(input.limitations ?? [])).slice(0, 12)
  };
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

function criterionValues(metric: PilotMetricKey, baseline: PilotSnapshotMetrics, final: PilotSnapshotMetrics) {
  if (metric === "owner_coverage_pp") return [percent(baseline.ownerAssigned, baseline.cohortSize), percent(final.ownerAssigned, final.cohortSize), "puncte procentuale"] as const;
  if (metric === "next_action_coverage_pp") return [percent(baseline.nextActionDefined, baseline.cohortSize), percent(final.nextActionDefined, final.cohortSize), "puncte procentuale"] as const;
  if (metric === "overdue_followups_reduction") return [baseline.overdueFollowUps, final.overdueFollowUps, "oportunități"] as const;
  if (metric === "stale_opportunities_reduction") return [baseline.staleOpportunities, final.staleOpportunities, "oportunități"] as const;
  if (metric === "actions_completed") return [baseline.actionsCompleted, final.actionsCompleted, "înregistrări"] as const;
  if (metric === "human_confirmed_exceptions") return [baseline.humanConfirmedExceptions, final.humanConfirmedExceptions, "înregistrări"] as const;
  return [baseline.confirmedOutcomes, final.confirmedOutcomes, "înregistrări"] as const;
}

function evaluateCriterion(criterion: PilotSuccessCriterion, baseline: PilotSnapshotMetrics, final: PilotSnapshotMetrics): PilotCriterionEvaluation {
  const [baselineValue, finalValue, unit] = criterionValues(criterion.metric, baseline, final);
  if (baselineValue === null || finalValue === null) return { ...criterion, status: "insufficient_data", baselineValue, finalValue, change: null, unit };
  const reduction = criterion.metric === "overdue_followups_reduction" || criterion.metric === "stale_opportunities_reduction";
  const change = reduction ? baselineValue - finalValue : finalValue - baselineValue;
  return { ...criterion, status: change >= criterion.targetValue ? "met" : "not_met", baselineValue, finalValue, change, unit };
}

const metricLabels: Record<PilotMetricKey, string> = {
  owner_coverage_pp: "Acoperire cu responsabil",
  next_action_coverage_pp: "Acoperire cu acțiune următoare",
  overdue_followups_reduction: "Follow-up-uri întârziate",
  stale_opportunities_reduction: "Oportunități inactive",
  actions_completed: "Acțiuni finalizate",
  human_confirmed_exceptions: "Excepții confirmate de echipă",
  confirmed_outcomes: "Rezultate confirmate"
};

export function comparePilotSnapshots(contract: PilotContract, baseline: PilotSnapshotPayload, final: PilotSnapshotPayload): PilotComparison {
  if (baseline.snapshotKind !== "baseline" || final.snapshotKind !== "final") throw new Error("Comparația necesită baseline și situație finală.");
  if (baseline.pilotId !== contract.id || final.pilotId !== contract.id) throw new Error("Snapshot-urile nu aparțin aceluiași pilot.");
  if (baseline.definitionVersion !== final.definitionVersion || baseline.definitionVersion !== contract.definitionVersion) throw new Error("Definițiile de măsurare nu sunt comparabile.");
  if (JSON.stringify(baseline.cohortOpportunityIds) !== JSON.stringify(final.cohortOpportunityIds)) throw new Error("Cohorta pilotului s-a schimbat.");
  const criteria = contract.successCriteria.map((item) => evaluateCriterion(item, baseline.metrics, final.metrics));
  const changes = contract.successCriteria.map((criterion) => {
    const evaluation = criteria.find((item) => item.id === criterion.id)!;
    return evaluation.change === null ? null : { metric: criterion.metric, label: metricLabels[criterion.metric], baseline: evaluation.baselineValue!, final: evaluation.finalValue!, change: evaluation.change, unit: evaluation.unit };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
  return {
    baselineCapturedAt: baseline.capturedAt,
    finalCapturedAt: final.capturedAt,
    cohortSize: baseline.metrics.cohortSize,
    criteria,
    criteriaSummary: {
      met: criteria.filter((item) => item.status === "met").length,
      notMet: criteria.filter((item) => item.status === "not_met").length,
      insufficientData: criteria.filter((item) => item.status === "insufficient_data").length
    },
    changes,
    estimatedValueByCurrency: final.metrics.estimatedValueByCurrency,
    confirmedRevenueByCurrency: final.metrics.confirmedRevenueByCurrency,
    newDuringPilotOpportunityIds: final.newDuringPilotOpportunityIds,
    limitations: Array.from(new Set([...baseline.limitations, ...final.limitations, "Schimbările observate nu demonstrează singure cauzalitate.", "Valorile estimate nu reprezintă venit confirmat."]))
  };
}
