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

export async function createCommercialSignal(input: CommercialSignalInput) {
  return createCommercialSignalData(input);
}

export async function updateCommercialSignal(id: string, input: CommercialSignalInput) {
  return updateCommercialSignalData(id, input);
}

export async function ignoreCommercialSignal(id: string) {
  return ignoreCommercialSignalData(id);
}

export async function archiveCommercialSignal(id: string) {
  return archiveCommercialSignalData(id);
}

export async function convertSignalToOpportunity(signalId: string) {
  return convertSignalToOpportunityData(signalId);
}

export async function addCommercialSignalEvent(signalId: string, eventType: string, description: string, metadata: Record<string, unknown> = {}) {
  return addCommercialSignalEventData(signalId, eventType, description, metadata);
}
