"use server";

import {
  addCommercialSignalEvent as addCommercialSignalEventData,
  archiveCommercialSignal as archiveCommercialSignalData,
  convertSignalToOpportunity as convertSignalToOpportunityData,
  createCommercialSignal as createCommercialSignalData,
  ignoreCommercialSignal as ignoreCommercialSignalData,
  updateCommercialSignal as updateCommercialSignalData,
  type CommercialSignalInput
} from "@/lib/commercial-inbox";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { requirePermission } from "@/lib/authz/require-permission";

export async function createCommercialSignal(input: CommercialSignalInput) {
  await requireActivePaidAccess();
  await requirePermission("signals.create");
  return createCommercialSignalData(input);
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
