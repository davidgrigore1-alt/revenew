import "server-only";

import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { buildOpportunityCommercialState } from "@/lib/opportunity-commercial-state";
import {
  buildPilotSnapshot,
  comparePilotSnapshots,
  type PilotComparison,
  type PilotContract,
  type PilotSnapshotOpportunity,
  type PilotSnapshotPayload,
  type PilotSuccessCriterion
} from "@/lib/pilot-measurement-core";
import { getRecoverySummary } from "@/lib/recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PilotEngagement = {
  id: string;
  businessId: string;
  name: string;
  customerFacingName: string;
  status: "draft" | "active" | "final_frozen" | "closed" | "cancelled";
  scopeNote: string;
  startsOn: string;
  expectedEndsOn: string;
  timezone: string;
  cohortOpportunityIds: string[];
  successCriteria: PilotSuccessCriterion[];
  comparisonPolicy: PilotContract["comparisonPolicy"];
  definitionVersion: string;
  limitations: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

type PilotRow = {
  id: string; business_id: string; name: string; customer_facing_name: string; status: PilotEngagement["status"];
  scope_note: string; starts_on: string; expected_ends_on: string; timezone: string; cohort_opportunity_ids: string[];
  success_criteria: PilotSuccessCriterion[]; comparison_policy: PilotContract["comparisonPolicy"]; definition_version: string;
  limitations: string[]; created_at: string; updated_at: string; closed_at: string | null; cancelled_at: string | null; cancellation_reason: string | null;
};

type SnapshotRow = { id: string; snapshot_kind: PilotSnapshotPayload["snapshotKind"]; snapshot_payload: PilotSnapshotPayload; integrity_hash: string; captured_at: string };

function mapPilot(row: PilotRow): PilotEngagement {
  return {
    id: row.id, businessId: row.business_id, name: row.name, customerFacingName: row.customer_facing_name,
    status: row.status, scopeNote: row.scope_note, startsOn: row.starts_on, expectedEndsOn: row.expected_ends_on,
    timezone: row.timezone, cohortOpportunityIds: row.cohort_opportunity_ids, successCriteria: row.success_criteria,
    comparisonPolicy: row.comparison_policy, definitionVersion: row.definition_version, limitations: row.limitations,
    createdAt: row.created_at, updatedAt: row.updated_at, closedAt: row.closed_at, cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason
  };
}

export function pilotContract(pilot: PilotEngagement): PilotContract {
  return {
    id: pilot.id, businessId: pilot.businessId, cohortOpportunityIds: pilot.cohortOpportunityIds,
    successCriteria: pilot.successCriteria, definitionVersion: pilot.definitionVersion, timezone: pilot.timezone,
    comparisonPolicy: pilot.comparisonPolicy
  };
}

function snapshotOpportunity(state: ReturnType<typeof buildOpportunityCommercialState>): PilotSnapshotOpportunity {
  return {
    opportunityId: state.opportunityId,
    organizationId: state.organization.id,
    title: state.title,
    stage: state.stage,
    lifecycle: state.lifecycle,
    estimatedValue: state.financial.estimatedValue,
    currency: state.financial.currency,
    confirmedRevenue: state.outcome.confirmedByHuman ? state.financial.confirmedRevenue : null,
    ownerState: state.ownership.validity,
    nextActionState: !state.nextAction ? "missing" : state.nextAction.overdue ? "overdue" : "scheduled",
    nextActionDueAt: state.nextAction?.dueAt ?? null,
    lastMeaningfulActivityAt: state.activity.lastMeaningfulActivityAt,
    inactivityDays: state.activity.inactivityDays,
    stale: state.flags.stale,
    approvalState: state.approval.state,
    documentState: state.document.state,
    responseState: state.response.state,
    outcomeState: state.outcome.state,
    outcomeConfirmedByHuman: state.outcome.confirmedByHuman,
    exceptionCodes: state.exceptions.map((item) => item.code),
    evidence: state.evidence.slice(0, 6).map((item) => ({ ...item, observedAt: item.observedAt ?? null })),
    safeIntervention: state.recommendedSafeIntervention,
    missingInformation: state.missingInformation.slice(0, 8)
  };
}

export async function assembleOfficialPilotSnapshot(
  pilot: PilotEngagement,
  snapshotKind: PilotSnapshotPayload["snapshotKind"],
  capturedAt = new Date().toISOString(),
  baselineCapturedAt: string | null = null
) {
  const summary = await getRecoverySummary();
  const cohortSet = new Set(pilot.cohortOpportunityIds);
  const states = summary.opportunities
    .filter((opportunity) => cohortSet.has(opportunity.id))
    .map((opportunity) => buildOpportunityCommercialState(opportunity, {
      now: new Date(capturedAt),
      staleAfterDays: pilot.comparisonPolicy.staleAfterDays,
      linkedSignals: summary.signals
    }))
    .map(snapshotOpportunity);
  const reviewFacts = summary.signals.map((signal) => ({
    opportunityId: signal.convertedOpportunityId ?? signal.detectedFromOpportunityId ?? null,
    decision: (["approved", "converted"] as string[]).includes(signal.reviewStatus)
      ? "confirmed" as const
      : (["dismissed", "duplicate"] as string[]).includes(signal.reviewStatus) ? "dismissed" as const : "unknown" as const
  }));
  const baselineTime = baselineCapturedAt ? new Date(baselineCapturedAt).getTime() : Number.NaN;
  const capturedTime = new Date(capturedAt).getTime();
  const newDuringPilotOpportunityIds = snapshotKind === "final" && Number.isFinite(baselineTime)
    ? summary.opportunities.filter((item) => {
        if (cohortSet.has(item.id) || !item.createdAt) return false;
        const createdTime = new Date(item.createdAt).getTime();
        return Number.isFinite(createdTime) && createdTime > baselineTime && createdTime <= capturedTime;
      }).map((item) => item.id)
    : [];
  return buildPilotSnapshot({
    contract: pilotContract(pilot), snapshotKind, capturedAt, opportunities: states,
    actionFacts: summary.actions.filter((item) => item.opportunityId).map((item) => ({ opportunityId: item.opportunityId!, createdAt: item.createdAt ?? null, completedAt: item.completedAt ?? null })),
    reviewFacts,
    newDuringPilotOpportunityIds,
    limitations: [
      ...pilot.limitations,
      "Măsurarea folosește numai activitatea și dovezile înregistrate în ReveNew.",
      "Activitatea desfășurată în alte sisteme poate lipsi."
    ]
  });
}

export type PilotMeasurementWorkspace = {
  available: boolean;
  canManage: boolean;
  workspaceName: string;
  pilots: PilotEngagement[];
  pilot: PilotEngagement | null;
  baseline: SnapshotRow | null;
  final: SnapshotRow | null;
  livePreview: PilotSnapshotPayload | null;
  comparison: PilotComparison | null;
  candidates: Array<{ id: string; title: string; company: string; currency: string; estimatedValue: number; active: boolean }>;
  error?: string;
};

export async function getPilotMeasurementWorkspace(selectedPilotId?: string): Promise<PilotMeasurementWorkspace> {
  const [current, authorization, summary] = await Promise.all([
    getCurrentBusinessForUser({ redirectIfMissing: true }), getAuthorizationContext(), getRecoverySummary()
  ]);
  if (!current) throw new Error("Spațiul de lucru nu este disponibil.");
  const candidates = summary.opportunities.map((item) => ({
    id: item.id, title: item.title, company: item.contact?.company || item.contact?.name || "Companie neconfirmată",
    currency: item.currency ?? "RON", estimatedValue: Number(item.estimatedValueHigh ?? 0),
    active: item.lifecycleStatus ? item.lifecycleStatus === "open" : !["won", "lost", "ignored"].includes(item.status)
  }));
  const supabase = createSupabaseServerClient();
  const canManage = hasPermission(authorization, "reports.view_team");
  if (!supabase || current.source !== "supabase") return { available: false, canManage, workspaceName: current.business.name, pilots: [], pilot: null, baseline: null, final: null, livePreview: null, comparison: null, candidates, error: "Pilotul persistent necesită mediul Supabase autorizat." };

  const pilotResult = await supabase.from("pilot_engagements").select("*").eq("business_id", current.business.id).order("created_at", { ascending: false }).limit(25);
  if (pilotResult.error) return { available: false, canManage, workspaceName: current.business.name, pilots: [], pilot: null, baseline: null, final: null, livePreview: null, comparison: null, candidates, error: "Migrarea locală pentru pilot nu este încă disponibilă în acest mediu." };
  const pilots = ((pilotResult.data ?? []) as PilotRow[]).map(mapPilot);
  const pilot = selectedPilotId === "new"
    ? null
    : pilots.find((item) => item.id === selectedPilotId) ?? pilots.find((item) => !["closed", "cancelled"].includes(item.status)) ?? pilots[0] ?? null;
  if (!pilot) return { available: true, canManage, workspaceName: current.business.name, pilots, pilot: null, baseline: null, final: null, livePreview: null, comparison: null, candidates };
  const snapshots = await supabase.from("pilot_snapshots").select("id,snapshot_kind,snapshot_payload,integrity_hash,captured_at").eq("business_id", current.business.id).eq("pilot_id", pilot.id).order("captured_at");
  if (snapshots.error) throw new Error("Snapshot-urile pilotului nu au putut fi încărcate.");
  const rows = (snapshots.data ?? []) as SnapshotRow[];
  const baseline = rows.find((item) => item.snapshot_kind === "baseline") ?? null;
  const final = rows.find((item) => item.snapshot_kind === "final") ?? null;
  const livePreview = ["draft", "active"].includes(pilot.status)
    ? await assembleOfficialPilotSnapshot(
        pilot,
        pilot.status === "draft" ? "baseline" : "final",
        new Date().toISOString(),
        baseline?.captured_at ?? null
      )
    : null;
  const comparison = baseline && final ? comparePilotSnapshots(pilotContract(pilot), baseline.snapshot_payload, final.snapshot_payload) : null;
  return { available: true, canManage, workspaceName: current.business.name, pilots, pilot, baseline, final, livePreview, comparison, candidates };
}
