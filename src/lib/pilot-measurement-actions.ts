"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { PILOT_DEFINITION_VERSION, type PilotMetricKey, type PilotSuccessCriterion } from "@/lib/pilot-measurement-core";
import { assembleOfficialPilotSnapshot, type PilotEngagement } from "@/lib/pilot-measurement";
import { getRecoverySummary } from "@/lib/recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

async function context() {
  const authorization = await requirePermission("reports.view_team");
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!current || current.source !== "supabase" || !authorization.profileId || !supabase) throw new Error("Administrarea pilotului nu este disponibilă în acest mediu.");
  return { current, supabase, profileId: authorization.profileId, businessId: current.business.id };
}

function criteriaFrom(formData: FormData): PilotSuccessCriterion[] {
  const definitions: Array<{ metric: PilotMetricKey; label: string; defaultTarget: number }> = [
    { metric: "owner_coverage_pp", label: "Creșterea acoperirii cu responsabil", defaultTarget: 20 },
    { metric: "next_action_coverage_pp", label: "Creșterea acoperirii cu acțiune următoare", defaultTarget: 20 },
    { metric: "overdue_followups_reduction", label: "Reducerea follow-up-urilor întârziate", defaultTarget: 3 },
    { metric: "stale_opportunities_reduction", label: "Reducerea oportunităților inactive", defaultTarget: 2 },
    { metric: "actions_completed", label: "Acțiuni finalizate înregistrate", defaultTarget: 5 }
  ];
  return definitions.filter((item) => formData.get(`criterion_${item.metric}`) === "on").map((item) => {
    const parsed = Number(formData.get(`target_${item.metric}`));
    return { id: item.metric, metric: item.metric, targetValue: Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 1000) : item.defaultTarget, explanation: item.label };
  });
}

export async function createPilotEngagement(formData: FormData) {
  const ctx = await context();
  const summary = await getRecoverySummary();
  const available = new Set(summary.opportunities.map((item) => item.id));
  const cohort = Array.from(new Set(formData.getAll("cohort").map(String))).filter((id) => available.has(id)).slice(0, 200);
  const criteria = criteriaFrom(formData);
  const name = clean(formData.get("name"), 120);
  const customerFacingName = clean(formData.get("customerFacingName"), 160);
  const scopeNote = clean(formData.get("scopeNote"), 500);
  const startsOn = clean(formData.get("startsOn"), 10);
  const expectedEndsOn = clean(formData.get("expectedEndsOn"), 10);
  if (name.length < 3 || customerFacingName.length < 2 || scopeNote.length < 3 || cohort.length === 0 || criteria.length === 0) throw new Error("Completează domeniul, cohorta și cel puțin un criteriu măsurabil.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(expectedEndsOn)) throw new Error("Perioada pilotului nu este validă.");
  const start = new Date(`${startsOn}T00:00:00Z`);
  const end = new Date(`${expectedEndsOn}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start || end.getTime() - start.getTime() > 90 * 86_400_000) throw new Error("Pilotul trebuie să aibă o perioadă între 1 și 90 de zile.");
  const { data, error } = await ctx.supabase.rpc("create_pilot_engagement", {
    p_business_id: ctx.businessId,
    p_name: name,
    p_customer_facing_name: customerFacingName,
    p_scope_note: scopeNote,
    p_starts_on: startsOn,
    p_expected_ends_on: expectedEndsOn,
    p_timezone: "Europe/Bucharest",
    p_cohort_opportunity_ids: cohort,
    p_success_criteria: criteria,
    p_comparison_policy: { staleAfterDays: 14, overdueReference: "captured_at" },
    p_definition_version: PILOT_DEFINITION_VERSION,
    p_limitations: ["Perioada scurtă limitează concluziile despre efectele recurente."]
  });
  if (error || !data) throw new Error("Pilotul nu a putut fi creat.");
  revalidatePath("/reports/pilot-proof-of-value");
  redirect(`/reports/pilot-proof-of-value?pilot=${String(data)}`);
}

async function authorizedPilot(pilotId: string) {
  const ctx = await context();
  const { data, error } = await ctx.supabase.from("pilot_engagements").select("*").eq("id", pilotId).eq("business_id", ctx.businessId).single();
  if (error || !data) throw new Error("Pilotul nu este disponibil în spațiul de lucru autorizat.");
  const row = data as any;
  const pilot: PilotEngagement = {
    id: row.id, businessId: row.business_id, name: row.name, customerFacingName: row.customer_facing_name, status: row.status,
    scopeNote: row.scope_note, startsOn: row.starts_on, expectedEndsOn: row.expected_ends_on, timezone: row.timezone,
    cohortOpportunityIds: row.cohort_opportunity_ids, successCriteria: row.success_criteria, comparisonPolicy: row.comparison_policy,
    definitionVersion: row.definition_version, limitations: row.limitations, createdAt: row.created_at, updatedAt: row.updated_at,
    closedAt: row.closed_at, cancelledAt: row.cancelled_at, cancellationReason: row.cancellation_reason
  };
  return { ...ctx, pilot };
}

async function freeze(formData: FormData, snapshotKind: "baseline" | "final") {
  if (formData.get("confirm") !== "yes") throw new Error("Confirmarea umană explicită este obligatorie.");
  const pilotId = clean(formData.get("pilotId"), 64);
  const ctx = await authorizedPilot(pilotId);
  const expectedStatus = snapshotKind === "baseline" ? "draft" : "active";
  if (ctx.pilot.status !== expectedStatus) throw new Error("Snapshot-ul este deja înghețat sau pilotul nu este în starea corectă.");
  let baselineCapturedAt: string | null = null;
  if (snapshotKind === "final") {
    const baseline = await ctx.supabase.from("pilot_snapshots").select("captured_at")
      .eq("business_id", ctx.businessId).eq("pilot_id", ctx.pilot.id).eq("snapshot_kind", "baseline").maybeSingle();
    if (baseline.error || !baseline.data) throw new Error("Baseline-ul pilotului nu este disponibil pentru comparație.");
    baselineCapturedAt = String(baseline.data.captured_at);
  }
  const payload = await assembleOfficialPilotSnapshot(ctx.pilot, snapshotKind, new Date().toISOString(), baselineCapturedAt);
  const { error } = await ctx.supabase.rpc("freeze_pilot_snapshot", {
    p_pilot_id: ctx.pilot.id,
    p_snapshot_kind: snapshotKind,
    p_snapshot_payload: payload
  });
  if (error) throw new Error(snapshotKind === "baseline" ? "Baseline-ul nu a putut fi înghețat. Reîncarcă previzualizarea și încearcă din nou." : "Situația finală nu a putut fi înghețată.");
  revalidatePath("/reports/pilot-proof-of-value");
  redirect(`/reports/pilot-proof-of-value?pilot=${ctx.pilot.id}`);
}

export async function freezePilotBaseline(formData: FormData) {
  return freeze(formData, "baseline");
}

export async function freezePilotFinal(formData: FormData) {
  return freeze(formData, "final");
}

export async function closePilotEngagement(formData: FormData) {
  if (formData.get("confirm") !== "yes") throw new Error("Confirmarea umană explicită este obligatorie.");
  const ctx = await authorizedPilot(clean(formData.get("pilotId"), 64));
  if (ctx.pilot.status !== "final_frozen") throw new Error("Pilotul poate fi închis numai după înghețarea situației finale.");
  const { data, error } = await ctx.supabase.rpc("close_pilot_engagement", { p_pilot_id: ctx.pilot.id });
  if (error || !data) throw new Error("Pilotul nu a putut fi închis sau a fost modificat concurent.");
  revalidatePath("/reports/pilot-proof-of-value");
  redirect(`/reports/pilot-proof-of-value?pilot=${ctx.pilot.id}`);
}

export async function cancelPilotEngagement(formData: FormData) {
  const ctx = await authorizedPilot(clean(formData.get("pilotId"), 64));
  const reason = clean(formData.get("reason"), 500);
  if (reason.length < 3 || !["draft", "active"].includes(ctx.pilot.status)) throw new Error("Anularea necesită un motiv și un pilot neînchis.");
  const { error } = await ctx.supabase.rpc("cancel_pilot_engagement", { p_pilot_id: ctx.pilot.id, p_reason: reason });
  if (error) throw new Error("Pilotul nu a putut fi anulat.");
  revalidatePath("/reports/pilot-proof-of-value");
  redirect(`/reports/pilot-proof-of-value?pilot=${ctx.pilot.id}`);
}
