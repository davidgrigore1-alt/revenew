import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  batchFingerprint,
  normalizeCommercialValue,
  selectConfirmedCommercialRows,
  validateCommercialImportEnvelope,
  validateCommercialImportRows,
  type CommercialImportRowIssue,
  type CommercialMappedRow,
  type NormalizedCommercialImportRow
} from "@/lib/commercial-ingestion-core";
import { assessOpportunityAttention } from "@/lib/opportunity-attention";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CommercialImportPreviewRow = NormalizedCommercialImportRow & {
  exact_duplicate: boolean;
};

export type CommercialImportPreview = {
  ok: boolean;
  fileName: string;
  batchFingerprint: string;
  accepted: CommercialImportPreviewRow[];
  rejected: CommercialImportRowIssue[];
  error?: string;
};

export type CommercialImportResult = {
  ok: boolean;
  batchId?: string;
  created: number;
  rejected: number;
  duplicates: number;
  failed: number;
  duplicateBatch: boolean;
  notSelected: number;
  error?: string;
};

export type CommercialImportHistoryItem = {
  id: string;
  sourceType: "csv" | "stale_detection";
  fileName: string | null;
  createdAt: string;
  totalRows: number;
  createdRows: number;
  rejectedRows: number;
  duplicateRows: number;
  failedRows: number;
  status: string;
};

async function ingestionContext() {
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!current?.business || !supabase) throw new Error("Workspace-ul curent nu este disponibil.");
  return { current, business: current.business, supabase };
}

function safeFileName(value: string) {
  return value.normalize("NFKC").replace(/[^a-zA-Z0-9._ ()-]/g, "_").trim().slice(0, 240) || "import.csv";
}

export async function previewCommercialSignalImport(fileNameInput: string, rawRows: CommercialMappedRow[]): Promise<CommercialImportPreview> {
  const envelopeError = validateCommercialImportEnvelope(rawRows);
  if (envelopeError) return { ok: false, fileName: "", batchFingerprint: "", accepted: [], rejected: [], error: envelopeError };
  const fileName = safeFileName(fileNameInput);
  const { accepted: initiallyAccepted, rejected } = validateCommercialImportRows(rawRows);
  const { business, supabase } = await ingestionContext();
  const [signalsResult, organizationsResult, contactsResult, opportunitiesResult, ownersResult] = await Promise.all([
    supabase.from("commercial_signals").select("id,ingestion_fingerprint,contact_email,contact_company,title,source,source_reference,raw_message").eq("business_id", business.id).limit(2000),
    supabase.from("crm_organizations").select("normalized_name").eq("business_id", business.id).eq("is_archived", false).limit(2000),
    supabase.from("crm_contacts").select("normalized_email").eq("business_id", business.id).eq("is_active", true).limit(2000),
    supabase.from("opportunities").select("title,contact_email").eq("business_id", business.id).limit(2000),
    supabase.rpc("business_assignable_profiles", { target_business_id: business.id })
  ]);
  const firstError = signalsResult.error ?? organizationsResult.error ?? contactsResult.error ?? opportunitiesResult.error ?? ownersResult.error;
  if (firstError) {
    return { ok: false, fileName, batchFingerprint: "", accepted: [], rejected, error: "Previzualizarea nu poate verifica momentan datele workspace-ului." };
  }

  const exactFingerprints = new Set((signalsResult.data ?? []).map((item) => item.ingestion_fingerprint).filter(Boolean));
  const signalEmails = new Set((signalsResult.data ?? []).map((item) => normalizeCommercialValue(item.contact_email ?? "")).filter(Boolean));
  const signalCompanyTitles = new Set((signalsResult.data ?? []).map((item) => `${normalizeCommercialValue(item.contact_company ?? "")}|${normalizeCommercialValue(item.title ?? "")}`));
  const signalSourceTitles = new Set((signalsResult.data ?? []).map((item) => `${normalizeCommercialValue(item.source ?? "")}|${normalizeCommercialValue(item.title ?? "")}`));
  const signalSourceReferences = new Set((signalsResult.data ?? []).map((item) => normalizeCommercialValue(item.source_reference ?? "")).filter(Boolean));
  const signalTextSignatures = new Set((signalsResult.data ?? []).map((item) => normalizeCommercialValue(item.raw_message ?? "").slice(0, 180)).filter((value) => value.length >= 48));
  const organizationNames = new Set((organizationsResult.data ?? []).map((item) => item.normalized_name));
  const contactEmails = new Set((contactsResult.data ?? []).map((item) => item.normalized_email).filter(Boolean));
  const opportunityTitles = new Set((opportunitiesResult.data ?? []).map((item) => normalizeCommercialValue(item.title ?? "")));
  const opportunityEmails = new Set((opportunitiesResult.data ?? []).map((item) => normalizeCommercialValue(item.contact_email ?? "")).filter(Boolean));
  const owners = new Map<string, string>((ownersResult.data ?? []).map((item: { profile_id: string; full_name: string }) => [normalizeCommercialValue(item.full_name), item.profile_id]));
  const accepted: CommercialImportPreviewRow[] = [];

  for (const row of initiallyAccepted) {
    const ownerId = row.owner_label ? owners.get(normalizeCommercialValue(row.owner_label)) : undefined;
    if (row.owner_label && !ownerId) {
      rejected.push({ row_number: row.row_number, row_fingerprint: row.row_fingerprint, status: "rejected", error_code: "unknown_owner", error_message: "Responsabilul nu corespunde exact unui membru activ al workspace-ului." });
      continue;
    }
    const email = normalizeCommercialValue(row.email);
    const company = normalizeCommercialValue(row.company);
    const title = normalizeCommercialValue(row.title);
    const sourceReference = normalizeCommercialValue(row.source_reference);
    const textSignature = normalizeCommercialValue(row.context).slice(0, 180);
    accepted.push({
      ...row,
      owner_profile_id: ownerId ?? "",
      probable_signal_match: Boolean(
        (email && signalEmails.has(email))
        || (sourceReference && signalSourceReferences.has(sourceReference))
        || (company && signalCompanyTitles.has(`${company}|${title}`))
        || signalSourceTitles.has(`${row.source_type}|${title}`)
        || (textSignature.length >= 48 && signalTextSignatures.has(textSignature))
      ),
      probable_company_match: Boolean(company && organizationNames.has(company)),
      probable_contact_match: Boolean(email && contactEmails.has(email)),
      probable_opportunity_match: Boolean(opportunityTitles.has(title) || (email && opportunityEmails.has(email))),
      exact_duplicate: exactFingerprints.has(row.row_fingerprint)
    });
  }
  const fingerprintRows = [...accepted, ...rejected.filter((row): row is CommercialImportRowIssue & { row_fingerprint: string } => Boolean(row.row_fingerprint))];
  return { ok: true, fileName, batchFingerprint: batchFingerprint(fileName, fingerprintRows), accepted, rejected };
}

export async function confirmCommercialSignalImport(fileName: string, rawRows: CommercialMappedRow[], selectedFingerprints?: string[]): Promise<CommercialImportResult> {
  const preview = await previewCommercialSignalImport(fileName, rawRows);
  if (!preview.ok) return { ok: false, created: 0, rejected: preview.rejected.length, duplicates: 0, failed: 0, duplicateBatch: false, notSelected: 0, error: preview.error };
  if (selectedFingerprints && (selectedFingerprints.length > 1000 || selectedFingerprints.some((value) => !/^[a-f0-9]{64}$/.test(value)))) {
    return { ok: false, created: 0, rejected: preview.rejected.length, duplicates: 0, failed: 0, duplicateBatch: false, notSelected: 0, error: "Selecția pentru import nu este validă." };
  }
  const selection = selectedFingerprints ?? preview.accepted.filter((row) => !row.exact_duplicate).map((row) => row.row_fingerprint);
  const { selectedRows, exactDuplicates, notSelected, confirmedRows } = selectConfirmedCommercialRows(preview.accepted, selection);
  if (!selectedRows.length) {
    return { ok: false, created: 0, rejected: preview.rejected.length, duplicates: exactDuplicates.length, failed: 0, duplicateBatch: false, notSelected, error: "Selectează cel puțin un semnal valid pentru import." };
  }
  const confirmedFingerprint = batchFingerprint(preview.fileName, [
    ...confirmedRows,
    ...preview.rejected.filter((row): row is CommercialImportRowIssue & { row_fingerprint: string } => Boolean(row.row_fingerprint))
  ]);
  const { business, supabase } = await ingestionContext();
  const { data, error } = await supabase.rpc("import_commercial_signal_batch", {
    target_business_id: business.id,
    source_file_name: preview.fileName,
    batch_fingerprint: confirmedFingerprint,
    accepted_rows: confirmedRows.map(({ exact_duplicate: _exactDuplicate, ...row }) => row),
    rejected_rows: preview.rejected
  });
  if (error) {
    console.warn("commercial_signal_import_failed", { code: error.code, rowCount: rawRows.length });
    return { ok: false, created: 0, rejected: preview.rejected.length, duplicates: 0, failed: confirmedRows.length, duplicateBatch: false, notSelected, error: "Importul nu a putut fi finalizat. Nicio oportunitate nu a fost creată automat." };
  }
  const result = data as Record<string, unknown>;
  revalidatePath("/inbox"); revalidatePath("/inbox/import"); revalidatePath("/dashboard"); revalidatePath("/reports");
  return {
    ok: true,
    batchId: String(result.batch_id ?? ""),
    created: Number(result.created ?? 0),
    rejected: Number(result.rejected ?? 0),
    duplicates: Number(result.duplicates ?? 0) + exactDuplicates.length,
    failed: Number(result.failed ?? 0),
    duplicateBatch: Boolean(result.duplicate_batch),
    notSelected
  };
}

export async function getCommercialImportHistory(): Promise<CommercialImportHistoryItem[]> {
  const { business, supabase } = await ingestionContext();
  const { data, error } = await supabase.from("data_import_batches")
    .select("id,source_type,file_name,created_at,total_rows,created_rows,rejected_rows,duplicate_rows,failed_rows,status")
    .eq("business_id", business.id).eq("entity_type", "commercial_signals")
    .order("created_at", { ascending: false }).limit(30);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id, sourceType: row.source_type, fileName: row.file_name, createdAt: row.created_at,
    totalRows: row.total_rows, createdRows: row.created_rows, rejectedRows: row.rejected_rows,
    duplicateRows: row.duplicate_rows, failedRows: row.failed_rows, status: row.status
  }));
}

export async function detectStaleCommercialSignals(): Promise<CommercialImportResult> {
  const [{ business, supabase }, opportunities] = await Promise.all([ingestionContext(), getOpportunitiesForCurrentBusiness()]);
  const candidates = opportunities.filter((opportunity) => {
    const assessment = assessOpportunityAttention(opportunity);
    return assessment.state !== "closed" && assessment.reasons.some((reason) => [
      "missing_next_action", "stale_activity", "unassigned_owner", "missing_primary_contact", "proposal_without_follow_up"
    ].includes(reason.code));
  }).slice(0, 200);
  if (!candidates.length) return { ok: true, created: 0, rejected: 0, duplicates: 0, failed: 0, duplicateBatch: false, notSelected: 0 };
  const ids = candidates.map((item) => item.id).sort();
  const fingerprint = createHash("sha256").update(JSON.stringify(ids)).digest("hex");
  const { data, error } = await supabase.rpc("detect_stale_commercial_signals", {
    target_business_id: business.id,
    detection_fingerprint: fingerprint,
    candidate_opportunity_ids: ids
  });
  if (error) {
    console.warn("stale_opportunity_detection_failed", { code: error.code, candidateCount: ids.length });
    return { ok: false, created: 0, rejected: 0, duplicates: 0, failed: ids.length, duplicateBatch: false, notSelected: 0, error: "Detectarea nu a putut fi finalizată." };
  }
  const result = data as Record<string, unknown>;
  revalidatePath("/inbox"); revalidatePath("/inbox/import"); revalidatePath("/dashboard"); revalidatePath("/reports");
  return {
    ok: true, batchId: String(result.batch_id ?? ""), created: Number(result.created ?? 0), rejected: 0,
    duplicates: Number(result.duplicates ?? 0), failed: 0, duplicateBatch: Boolean(result.duplicate_batch), notSelected: 0
  };
}

export async function getCommercialIngestionSummary() {
  const { business, supabase } = await ingestionContext();
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [batches, signals] = await Promise.all([
    supabase.from("data_import_batches").select("source_type,total_rows,created_rows,rejected_rows,duplicate_rows,created_at")
      .eq("business_id", business.id).eq("entity_type", "commercial_signals").gte("created_at", monthStart.toISOString()).limit(200),
    supabase.from("commercial_signals").select("ingestion_origin,status,review_status,currency,estimated_recoverable_value,estimated_value_max,converted_opportunity_id")
      .eq("business_id", business.id).in("ingestion_origin", ["csv_import", "stale_detection"]).limit(2000)
  ]);
  const batchRows = batches.data ?? []; const signalRows = signals.data ?? [];
  const imported = signalRows.filter((row) => row.ingestion_origin === "csv_import");
  const detected = signalRows.filter((row) => row.ingestion_origin === "stale_detection");
  const totalRows = batchRows.reduce((sum, row) => sum + row.total_rows, 0);
  const duplicateRows = batchRows.reduce((sum, row) => sum + row.duplicate_rows, 0);
  return {
    batchesThisMonth: batchRows.length,
    acceptedRows: batchRows.reduce((sum, row) => sum + row.created_rows, 0),
    rejectedRows: batchRows.reduce((sum, row) => sum + row.rejected_rows, 0),
    duplicateRows,
    duplicateRate: totalRows ? Math.round((duplicateRows / totalRows) * 100) : 0,
    importedSignals: imported.length,
    detectedSignals: detected.length,
    awaitingImportedReview: imported.filter((row) => ["new", "ready_for_review", "postponed"].includes(row.review_status)).length,
    convertedImportedSignals: imported.filter((row) => Boolean(row.converted_opportunity_id)).length,
    estimatedImportedRecoverableValue: imported.filter((row) => row.currency === "RON" && !["dismissed", "duplicate"].includes(row.review_status))
      .reduce((sum, row) => sum + Number(row.estimated_recoverable_value ?? row.estimated_value_max ?? 0), 0)
  };
}
