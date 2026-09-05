"use server";

import { requirePermission } from "@/lib/authz/require-permission";
import {
  confirmCommercialSignalImport as confirmImport,
  detectStaleCommercialSignals as detectSignals,
  previewCommercialSignalImport as previewImport
} from "@/lib/commercial-ingestion";
import type { CommercialMappedRow } from "@/lib/commercial-ingestion-core";
import type {ImportProvenance} from "@/lib/imports/actions";

export async function previewCommercialSignalImport(fileName: string, rows: CommercialMappedRow[]) {
  await requirePermission("signals.create");
  return previewImport(fileName, rows);
}

export async function confirmCommercialSignalImport(fileName: string, rows: CommercialMappedRow[], selectedFingerprints?: string[],provenance?:ImportProvenance) {
  await requirePermission("signals.create");
  return confirmImport(fileName, rows, selectedFingerprints,provenance);
}

export async function detectStaleCommercialSignals() {
  await requirePermission("signals.create");
  return detectSignals();
}

