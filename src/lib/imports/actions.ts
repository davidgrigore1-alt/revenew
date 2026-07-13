"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { recordProductEvent } from "@/lib/product-events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ImportEntityType = "organizations" | "contacts" | "opportunities";
export type ImportRow = Record<string, string>;
export type ImportResult = { ok: boolean; batchId?: string; created: number; skipped: number; rejected: number; errors: Array<{ row: number; message: string }>; duplicate?: boolean; error?: string };

const maxRows = 1000;
const safeText = /^[^<>\u0000-\u001f]*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const e164Pattern = /^\+[1-9]\d{7,14}$/;

function clean(value: unknown, max = 240) {
  const text = String(value ?? "").normalize("NFKC").trim();
  return text.length <= max && safeText.test(text) ? text : "";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro-RO").replace(/\s+/g, " ").trim();
}

function normalizeDomain(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return ""; }
}

function validMoney(value: string) {
  return /^\d{1,10}([.,]\d{1,2})?$/.test(value);
}

export async function importCsvBatch(entityType: ImportEntityType, rawRows: ImportRow[], duplicateMode: "skip" | "update" | "create"): Promise<ImportResult> {
  await requirePermission(entityType === "opportunities" ? "opportunities.create" : "opportunities.update");
  if (!["organizations", "contacts", "opportunities"].includes(entityType) || !Array.isArray(rawRows) || rawRows.length < 1 || rawRows.length > maxRows) {
    return { ok: false, created: 0, skipped: 0, rejected: 0, errors: [], error: `Importul trebuie să conțină între 1 și ${maxRows} de rânduri.` };
  }
  const rows = rawRows.map((row) => Object.fromEntries(Object.entries(row).slice(0, 30).map(([key, value]) => [clean(key, 80), clean(value, 1200)])));
  const fingerprint = createHash("sha256").update(JSON.stringify({ entityType, rows })).digest("hex");
  const [authorization, current, supabase] = await Promise.all([getAuthorizationContext(), getCurrentBusinessForUser({ redirectIfMissing: true }), Promise.resolve(createSupabaseServerClient())]);
  if (!authorization.profileId || !current || !supabase) return { ok: false, created: 0, skipped: 0, rejected: 0, errors: [], error: "Importul nu este disponibil momentan." };
  const businessId = current.business.id;

  const { data: existingBatch } = await supabase.from("data_import_batches").select("id,created_rows,skipped_rows,rejected_rows,summary,status").eq("business_id", businessId).eq("profile_id", authorization.profileId).eq("entity_type", entityType).eq("source_fingerprint", fingerprint).maybeSingle();
  if (existingBatch) return { ok: true, batchId: existingBatch.id, created: existingBatch.created_rows, skipped: existingBatch.skipped_rows, rejected: existingBatch.rejected_rows, errors: Array.isArray(existingBatch.summary?.errors) ? existingBatch.summary.errors : [], duplicate: true };

  const { data: batch, error: batchError } = await supabase.from("data_import_batches").insert({ business_id: businessId, profile_id: authorization.profileId, entity_type: entityType, source_fingerprint: fingerprint, total_rows: rows.length }).select("id").single();
  if (batchError || !batch) return { ok: false, created: 0, skipped: 0, rejected: 0, errors: [], error: "Importul nu a putut fi inițializat." };
  void recordProductEvent("csv_import_started", { businessId, metadata: { entity_type: entityType } });

  let result: ImportResult;
  try {
    result = entityType === "organizations"
      ? await importOrganizations(rows, duplicateMode, businessId, supabase)
      : entityType === "contacts"
        ? await importContacts(rows, duplicateMode, businessId, supabase)
        : await importOpportunities(rows, duplicateMode, businessId, supabase);
  } catch (error) {
    console.warn("csv_import_failed", { entityType, batchId: batch.id, kind: error instanceof Error ? error.name : "unknown" });
    result = { ok: false, created: 0, skipped: 0, rejected: rows.length, errors: [], error: "Importul a întâmpinat o eroare internă. Niciun identificator extern nu a fost expus." };
  }

  const status = result.ok ? (result.rejected ? "partial" : "completed") : "failed";
  await supabase.from("data_import_batches").update({ status, created_rows: result.created, skipped_rows: result.skipped, rejected_rows: result.rejected, summary: { errors: result.errors.slice(0, 100) }, completed_at: new Date().toISOString() }).eq("id", batch.id).eq("business_id", businessId).eq("profile_id", authorization.profileId);
  if (result.ok) {
    void recordProductEvent("csv_import_completed", { businessId, metadata: { entity_type: entityType, created: result.created, skipped: result.skipped, rejected: result.rejected } });
    revalidatePath("/companies"); revalidatePath("/contacts"); revalidatePath("/opportunities"); revalidatePath("/dashboard");
  }
  return { ...result, batchId: batch.id };
}

async function importOrganizations(rows: ImportRow[], mode: string, businessId: string, supabase: ReturnType<typeof createSupabaseServerClient> extends infer T ? Exclude<T, null> : never): Promise<ImportResult> {
  const { data: existing, error } = await supabase.from("crm_organizations").select("id,normalized_name,website").eq("business_id", businessId).eq("is_archived", false).limit(2000);
  if (error) throw error;
  const organizationByName = new Map((existing ?? []).map((item) => [item.normalized_name, item.id]));
  const organizationByDomain = new Map<string, string>(
    (existing ?? []).flatMap((item) => {
      const domain = normalizeDomain(item.website ?? "");
      return domain ? [[domain, item.id] as const] : [];
    })
  );
  const inserts: Record<string, unknown>[] = []; const updates: Array<{ id: string; payload: Record<string, unknown> }> = []; const errors: Array<{ row: number; message: string }> = []; let skipped = 0;
  rows.forEach((row, index) => {
    const name = clean(row.name || row.company || row.organization, 180); const website = clean(row.website || row.domain, 300); const domain = normalizeDomain(website);
    if (!name) { errors.push({ row: index + 2, message: "Numele companiei este obligatoriu." }); return; }
    const existingId = organizationByName.get(normalize(name)) ?? (domain ? organizationByDomain.get(domain) : undefined);
    const payload = { business_id: businessId, name, normalized_name: normalize(name), website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null, industry: clean(row.industry, 120) || null, phone: clean(row.phone, 60) || null, city: clean(row.city, 120) || null, county: clean(row.county, 120) || null, country: clean(row.country, 120) || null, relationship_status: "prospect", is_archived: false };
    if (existingId) { if (mode === "update") updates.push({ id: existingId, payload }); else skipped += 1; return; }
    inserts.push(payload);
  });
  if (inserts.length) {
    const { error: insertError } = await supabase.from("crm_organizations").insert(inserts); if (insertError) throw insertError;
  }
  for (const update of updates) { const { error: updateError } = await supabase.from("crm_organizations").update(update.payload).eq("id", update.id).eq("business_id", businessId); if (updateError) throw updateError; }
  return { ok: true, created: inserts.length + updates.length, skipped, rejected: errors.length, errors };
}

async function importContacts(rows: ImportRow[], mode: string, businessId: string, supabase: Exclude<ReturnType<typeof createSupabaseServerClient>, null>): Promise<ImportResult> {
  const [{ data: organizations, error: orgError }, { data: contacts, error: contactError }] = await Promise.all([
    supabase.from("crm_organizations").select("id,normalized_name").eq("business_id", businessId).eq("is_archived", false).limit(2000),
    supabase.from("crm_contacts").select("id,normalized_email").eq("business_id", businessId).eq("is_active", true).not("normalized_email", "is", null).limit(2000)
  ]);
  if (orgError || contactError) throw orgError ?? contactError;
  const orgByName = new Map((organizations ?? []).map((item) => [item.normalized_name, item.id]));
  const contactByEmail = new Map((contacts ?? []).map((item) => [item.normalized_email, item.id]));
  const inserts: Record<string, unknown>[] = []; const updates: Array<{ id: string; payload: Record<string, unknown> }> = []; const errors: Array<{ row: number; message: string }> = []; let skipped = 0;
  rows.forEach((row, index) => {
    const fullName = clean(row.full_name || row.name, 180); const email = clean(row.email, 254).toLowerCase(); const phone = clean(row.phone, 60); const organizationName = clean(row.organization || row.company, 180); const organizationId = organizationName ? orgByName.get(normalize(organizationName)) : null;
    if (!fullName) { errors.push({ row: index + 2, message: "Numele contactului este obligatoriu." }); return; }
    if (email && !emailPattern.test(email)) { errors.push({ row: index + 2, message: "Adresa de email nu este validă." }); return; }
    if (phone && !e164Pattern.test(phone)) { errors.push({ row: index + 2, message: "Telefonul trebuie să fie în format internațional E.164." }); return; }
    if (organizationName && !organizationId) { errors.push({ row: index + 2, message: "Compania indicată nu există în workspace-ul curent." }); return; }
    const payload = { business_id: businessId, organization_id: organizationId, full_name: fullName, normalized_name: normalize(fullName), email: email || null, normalized_email: email || null, phone: phone || null, job_title: clean(row.job_title || row.role, 140) || null, decision_role: clean(row.decision_role, 80) || null, is_active: true };
    const existingId = email ? contactByEmail.get(email) : undefined;
    if (existingId) { if (mode === "update") updates.push({ id: existingId, payload }); else skipped += 1; return; }
    inserts.push(payload);
  });
  if (inserts.length) {
    const { error: insertError } = await supabase.from("crm_contacts").insert(inserts); if (insertError) throw insertError;
  }
  for (const update of updates) { const { error: updateError } = await supabase.from("crm_contacts").update(update.payload).eq("id", update.id).eq("business_id", businessId); if (updateError) throw updateError; }
  return { ok: true, created: inserts.length + updates.length, skipped, rejected: errors.length, errors };
}

async function importOpportunities(rows: ImportRow[], mode: string, businessId: string, supabase: Exclude<ReturnType<typeof createSupabaseServerClient>, null>): Promise<ImportResult> {
  const [{ data: existing, error }, { data: assignable, error: assignableError }] = await Promise.all([
    supabase.from("opportunities").select("id,title").eq("business_id", businessId).limit(2000),
    supabase.rpc("business_assignable_profiles", { target_business_id: businessId })
  ]);
  if (error || assignableError) throw error ?? assignableError;
  const opportunityByTitle = new Map((existing ?? []).map((item) => [normalize(item.title), item.id]));
  const eligibleOwners = new Set((assignable ?? []).map((item: { profile_id: string }) => item.profile_id));
  const inserts: Record<string, unknown>[] = []; const updates: Array<{ id: string; payload: Record<string, unknown> }> = []; const errors: Array<{ row: number; message: string }> = []; let skipped = 0;
  rows.forEach((row, index) => {
    const title = clean(row.title || row.opportunity, 200); const amount = clean(row.estimated_value || row.value, 24); const currency = clean(row.currency || "RON", 3).toUpperCase(); const ownerId = clean(row.owner_profile_id, 36);
    if (!title) { errors.push({ row: index + 2, message: "Titlul oportunității este obligatoriu." }); return; }
    if (amount && !validMoney(amount)) { errors.push({ row: index + 2, message: "Valoarea estimată nu este validă." }); return; }
    if (!/^[A-Z]{3}$/.test(currency)) { errors.push({ row: index + 2, message: "Moneda trebuie să fie un cod ISO din trei litere." }); return; }
    if (ownerId && !eligibleOwners.has(ownerId)) { errors.push({ row: index + 2, message: "Responsabilul nu este disponibil în workspace-ul curent." }); return; }
    const payload = { business_id: businessId, title, type: "manual", status: "reviewed", lifecycle_status: "open", commercial_type: "commercial_recovery", owner_profile_id: ownerId || null, estimated_value_low: amount ? Number(amount.replace(",", ".")) : 0, estimated_value_high: amount ? Number(amount.replace(",", ".")) : 0, currency, summary: clean(row.summary, 1000) || "Oportunitate importată pentru verificare comercială.", relevance: [], risks: [], recommended_action: clean(row.next_action, 500) || "Revizuiește oportunitatea și stabilește următoarea acțiune.", fit_score: 0, urgency_score: 0, money_score: 0, confidence_score: 0 };
    const existingId = opportunityByTitle.get(normalize(title));
    if (existingId && mode !== "create") { if (mode === "update") updates.push({ id: existingId, payload }); else skipped += 1; return; }
    inserts.push(payload);
  });
  if (inserts.length) { const { error: insertError } = await supabase.from("opportunities").insert(inserts); if (insertError) throw insertError; }
  for (const update of updates) { const { error: updateError } = await supabase.from("opportunities").update(update.payload).eq("id", update.id).eq("business_id", businessId); if (updateError) throw updateError; }
  return { ok: true, created: inserts.length + updates.length, skipped, rejected: errors.length, errors };
}
