"use server";

import {
  addCommercialSignalEvent as addCommercialSignalEventData,
  analyzeCommercialSignal as analyzeCommercialSignalData,
  approveCommercialSignal as approveCommercialSignalData,
  archiveCommercialSignal as archiveCommercialSignalData,
  convertSignalToOpportunity as convertSignalToOpportunityData,
  createCommercialSignal as createCommercialSignalData,
  ignoreCommercialSignal as ignoreCommercialSignalData,
  setCommercialSignalReviewDecision as setCommercialSignalReviewDecisionData,
  updateCommercialSignal as updateCommercialSignalData,
  type CommercialSignalInput,
  type SignalApprovalInput
} from "@/lib/commercial-inbox";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { requirePermission } from "@/lib/authz/require-permission";

export async function createCommercialSignal(input: CommercialSignalInput) {
  await requireActivePaidAccess();
  await requirePermission("signals.create");
  return createCommercialSignalData(input);
}

export async function analyzeCommercialSignal(signalId: string) {
  const access = await requireActivePaidAccess();
  await requirePermission("opportunities.analyze");
  return analyzeCommercialSignalData(signalId, access.previewPlan?.id ?? access.subscription?.plan);
}

export async function approveCommercialSignal(signalId: string, input: SignalApprovalInput) {
  await requireActivePaidAccess();
  await requirePermission("signals.convert");
  return approveCommercialSignalData(signalId, input);
}

export async function setCommercialSignalReviewDecision(
  signalId: string,
  decision: "dismissed" | "duplicate" | "postponed",
  reason: string,
  reviewDueAt?: string
) {
  await requireActivePaidAccess();
  await requirePermission(decision === "postponed" ? "signals.update" : "signals.archive");
  return setCommercialSignalReviewDecisionData(signalId, decision, reason, reviewDueAt);
}

export async function updateCommercialSignal(id: string, input: CommercialSignalInput) {
  await requireActivePaidAccess();
  await requirePermission("signals.update");
  return updateCommercialSignalData(id, input);
}

export async function ignoreCommercialSignal(id: string) {
  await requireActivePaidAccess();
  await requirePermission("signals.archive");
  return ignoreCommercialSignalData(id);
}

export async function archiveCommercialSignal(id: string) {
  await requireActivePaidAccess();
  await requirePermission("signals.archive");
  return archiveCommercialSignalData(id);
}

export async function convertSignalToOpportunity(signalId: string) {
  await requireActivePaidAccess();
  await requirePermission("signals.convert");
  return convertSignalToOpportunityData(signalId);
}

export async function addCommercialSignalEvent(signalId: string, eventType: string, description: string, metadata: Record<string, unknown> = {}) {
  await requireActivePaidAccess();
  await requirePermission("signals.update");
  return addCommercialSignalEventData(signalId, eventType, description, metadata);
}
