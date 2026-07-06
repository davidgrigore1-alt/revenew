import "server-only";
import { randomUUID } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getFeatureLimit, getUsagePlan } from "@/lib/usage/plan-catalog";
import { getCurrentUsagePeriod } from "@/lib/usage/period";
import { calculateEstimatedCostMicros } from "@/lib/usage/cost-calculator";
import { getUsageFeature, usageFeatures } from "@/lib/usage/feature-registry";
import { getModelPricing } from "@/lib/usage/pricing-registry";
import { getUsageMode } from "@/lib/usage/usage-mode";
import { UsageLimitError, UsageUnavailableError } from "@/lib/usage/usage-errors";
import { redactForLog } from "@/lib/usage/usage-redaction";
import type { ProviderUsage, UsageFeatureId, UsagePlanId, UsageReservation, UsageSnapshot } from "@/lib/usage/usage-types";

type ReserveArgs = {
  businessId: string;
  profileId: string;
  featureId: UsageFeatureId;
  planId: UsagePlanId;
  idempotencyKey: string;
  units?: number;
  requestId?: string;
  operationType?: string;
  expectedCostMicros?: number;
};

function unavailableSnapshot(planId: UsagePlanId): UsageSnapshot {
  const period = getCurrentUsagePeriod();
  return {
    mode: getUsageMode(),
    planId,
    unavailable: true,
    ...period,
    features: Object.values(usageFeatures).map((feature) => ({
      featureId: feature.id,
      label: feature.label,
      used: 0,
      limit: getFeatureLimit(planId, feature.id)
    }))
  };
}

export function resolveUsagePlanId(accessPlanId: string | null | undefined): UsagePlanId {
  if (accessPlanId === "audit" || accessPlanId === "managed" || accessPlanId === "growth" || accessPlanId === "custom") {
    return accessPlanId;
  }
  return "audit";
}

export async function reserveUsage(args: ReserveArgs): Promise<UsageReservation> {
  const mode = getUsageMode();
  const units = Math.max(1, Math.round(args.units ?? 1));
  const reservation: UsageReservation = {
    id: randomUUID(),
    businessId: args.businessId,
    profileId: args.profileId,
    featureId: args.featureId,
    idempotencyKey: args.idempotencyKey,
    reservedUnits: units,
    mode,
    enforceable: mode === "enforce",
    reservedAt: Date.now(),
    requestId: args.requestId ?? randomUUID()
  };

  if (mode === "off") {
    return { ...reservation, enforceable: false };
  }

  const limit = getFeatureLimit(args.planId, args.featureId);
  if (limit !== null && limit < units) {
    throw new UsageLimitError();
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    if (mode === "enforce") {
      throw new UsageUnavailableError();
    }
    return { ...reservation, enforceable: false };
  }

  const period = getCurrentUsagePeriod();
  const { data, error } = await supabase.rpc("reserve_revenew_usage", {
    p_business_id: args.businessId,
    p_profile_id: args.profileId,
    p_feature_id: args.featureId,
    p_plan_id: args.planId,
    p_idempotency_key: args.idempotencyKey,
    p_units: units,
    p_limit: limit,
    p_period_start: period.periodStart,
    p_period_end: period.periodEnd,
    p_request_id: reservation.requestId,
    p_operation_type: args.operationType ?? args.featureId,
    p_expected_cost_micros: Math.max(0, Math.round(args.expectedCostMicros ?? 0)),
    p_budget_micros: getUsagePlan(args.planId).internalMonthlyBudgetMicros
  });

  if (error) {
    console.error("Usage reservation error", redactForLog({ code: error.code, message: error.message, featureId: args.featureId }));
    if (mode === "enforce") {
      if (error.message.includes("quota_exceeded")) {
        throw new UsageLimitError();
      }
      throw new UsageUnavailableError();
    }
    return { ...reservation, enforceable: false };
  }

  return {
    ...reservation,
    id: typeof data === "string" ? data : reservation.id,
    enforceable: true
  };
}

export async function settleUsage(reservation: UsageReservation, providerUsage: ProviderUsage) {
  if (reservation.mode === "off" || !reservation.enforceable) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    if (reservation.mode === "enforce") throw new UsageUnavailableError();
    return;
  }

  const estimatedCostMicros = calculateEstimatedCostMicros(providerUsage);
  const pricing = getModelPricing(providerUsage.model);
  const { error } = await supabase.rpc("settle_revenew_usage", {
    p_event_id: reservation.id,
    p_provider: providerUsage.provider,
    p_model: providerUsage.model,
    p_prompt_tokens: providerUsage.promptTokens,
    p_completion_tokens: providerUsage.completionTokens,
    p_total_tokens: providerUsage.totalTokens,
    p_estimated_cost_micros: estimatedCostMicros,
    p_confirmed_cost_micros: estimatedCostMicros,
    p_cost_status: providerUsage.costStatus ?? "estimated",
    p_currency: pricing.currency,
    p_pricing_version: pricing.version,
    p_retry_count: Math.max(0, Math.round(providerUsage.retryCount ?? 0)),
    p_latency_ms: Math.max(0, Math.round(providerUsage.latencyMs ?? Date.now() - reservation.reservedAt)),
    p_request_id: providerUsage.requestId ?? reservation.requestId,
    p_operation_type: providerUsage.operationType ?? reservation.featureId,
    p_provider_status_category: providerUsage.providerStatusCategory ?? "success",
    p_error_category: providerUsage.errorCategory ?? "none",
    p_billable_failure: providerUsage.billableFailure ?? false
  });

  if (error) {
    console.error("Usage settlement error", redactForLog({ code: error.code, message: error.message, featureId: reservation.featureId }));
    if (reservation.mode === "enforce") throw new UsageUnavailableError("Utilizarea nu a putut fi înregistrată.");
  }
}

export async function releaseUsage(
  reservation: UsageReservation,
  reason: string,
  metadata: {
    errorCategory?: string;
    providerStatusCategory?: string;
    billableFailure?: boolean;
    retryCount?: number;
    latencyMs?: number;
  } = {}
) {
  if (reservation.mode === "off" || !reservation.enforceable) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc("release_revenew_usage", {
    p_event_id: reservation.id,
    p_reason: reason.slice(0, 120),
    p_error_category: (metadata.errorCategory ?? "provider_error").slice(0, 80),
    p_provider_status_category: (metadata.providerStatusCategory ?? "failure").slice(0, 80),
    p_billable_failure: metadata.billableFailure ?? false,
    p_retry_count: Math.max(0, Math.round(metadata.retryCount ?? 0)),
    p_latency_ms: Math.max(0, Math.round(metadata.latencyMs ?? Date.now() - reservation.reservedAt))
  });

  if (error) {
    console.error("Usage release error", redactForLog({ code: error.code, message: error.message, featureId: reservation.featureId }));
  }
}

export async function getUsageSnapshotForBusiness(businessId: string, planId: UsagePlanId): Promise<UsageSnapshot> {
  const mode = getUsageMode();
  const period = getCurrentUsagePeriod();
  const supabase = createSupabaseAdminClient();

  if (!supabase || mode === "off") {
    return unavailableSnapshot(planId);
  }

  const { data, error } = await supabase
    .from("usage_counters")
    .select("feature_id,used_units")
    .eq("business_id", businessId)
    .eq("period_start", period.periodStart);

  if (error) {
    console.error("Usage snapshot error", redactForLog({ code: error.code, message: error.message }));
    return unavailableSnapshot(planId);
  }

  const usedByFeature = new Map<string, number>((data ?? []).map((row) => [String(row.feature_id), Number(row.used_units ?? 0)]));
  const plan = getUsagePlan(planId);

  return {
    mode,
    planId: plan.id,
    unavailable: false,
    ...period,
    features: Object.values(usageFeatures).map((feature) => ({
      featureId: feature.id,
      label: getUsageFeature(feature.id).label,
      used: usedByFeature.get(feature.id) ?? 0,
      limit: getFeatureLimit(plan.id, feature.id)
    }))
  };
}
