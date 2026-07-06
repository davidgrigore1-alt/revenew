import "server-only";
import { isMissingRelationError } from "@/lib/supabase/database-errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { usageFeatures } from "@/lib/usage/feature-registry";
import { usagePlanCatalog } from "@/lib/usage/plan-catalog";

export type AdminRangeKey = "today" | "7d" | "30d" | "current_month" | "last_month" | "90d";

export type AdminDateRange = {
  key: AdminRangeKey;
  label: string;
  start: Date;
  end: Date;
};

export type AdminUsageEvent = {
  id: string;
  businessId: string | null;
  profileId: string | null;
  featureId: string;
  provider: string | null;
  model: string | null;
  status: string;
  units: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostMicros: number;
  confirmedCostMicros: number;
  costStatus: string;
  currency: string;
  pricingVersion: string;
  requestId: string | null;
  operationType: string | null;
  reservationStatus: string;
  executionStatus: string;
  retryCount: number;
  latencyMs: number | null;
  errorCategory: string | null;
  providerStatusCategory: string | null;
  billableFailure: boolean;
  errorReason: string | null;
  createdAt: string;
};

export type AdminBusinessSummary = {
  id: string;
  name: string;
  legalName: string | null;
  ownerProfileId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  planId: string | null;
  accessStatus: string;
  configuredMonthlyValueMicros: number | null;
  providerCostMicros: number | null;
  reservedCostMicros: number | null;
  forecastCostMicros: number | null;
  requestCount: number | null;
  failedRequestCount: number | null;
  averageLatencyMs: number | null;
  totalUnits: number | null;
  lastUsageAt: string | null;
  marginStatus: MarginStatus;
  warnings: string[];
};

type BusinessRow = {
  id: string;
  name: string;
  legal_name: string | null;
  owner_profile_id: string | null;
  industry?: string | null;
  city?: string | null;
  county?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export type MarginStatus = "healthy" | "watch" | "warning" | "critical" | "insufficient_data";

export type AdminInsights = {
  range: AdminDateRange;
  usageAvailable: boolean;
  businessesAvailable: boolean;
  subscriptionsAvailable: boolean;
  auditAvailable: boolean;
  systemStatus: Array<{ label: string; status: string; detail: string }>;
  businesses: AdminBusinessSummary[];
  usageEvents: AdminUsageEvent[];
  totals: {
    configuredMonthlyValueMicros: number | null;
    providerCostMicros: number | null;
    reservedCostMicros: number | null;
    forecastCostMicros: number | null;
    postApiContributionMicros: number | null;
    postApiMargin: number | null;
    activeBusinesses: number;
    requestCount: number | null;
    failedRequestCount: number | null;
    averageLatencyMs: number | null;
  };
  featureCosts: Array<{
    featureId: string;
    label: string;
    requestCount: number;
    successRate: number | null;
    costMicros: number;
    confirmedCostMicros: number;
    averageCostMicros: number | null;
    averageLatencyMs: number | null;
    share: number | null;
  }>;
  modelCosts: Array<{
    provider: string;
    model: string;
    requestCount: number;
    totalUnits: number;
    costMicros: number;
    confirmedCostMicros: number;
    failedRequestCount: number;
    averageLatencyMs: number | null;
  }>;
  providerIssues: Array<{
    provider: string;
    model: string;
    featureId: string;
    businessName: string;
    errorCategory: string;
    count: number;
    lastOccurrence: string;
  }>;
  alerts: Array<{
    severity: "watch" | "warning" | "critical";
    title: string;
    detail: string;
    action: string;
  }>;
  auditEvents: Array<{
    role: string;
    action: string;
    changedAt: string;
    actor: string | null;
  }>;
};

type AdminAlert = AdminInsights["alerts"][number];

const rangeLabels: Record<AdminRangeKey, string> = {
  today: "Astăzi",
  "7d": "Ultimele 7 zile",
  "30d": "Ultimele 30 de zile",
  current_month: "Luna curentă",
  last_month: "Luna trecută",
  "90d": "Ultimele 90 de zile"
};

export const adminRangeOptions: Array<{ key: AdminRangeKey; label: string }> = Object.entries(rangeLabels).map(([key, label]) => ({
  key: key as AdminRangeKey,
  label
}));

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function resolveAdminDateRange(value: string | string[] | undefined): AdminDateRange {
  const key = typeof value === "string" && value in rangeLabels ? (value as AdminRangeKey) : "30d";
  const now = new Date();
  let start: Date;
  let end = now;

  if (key === "today") {
    start = startOfDay(now);
  } else if (key === "7d") {
    start = new Date(now.getTime() - 7 * 86400000);
  } else if (key === "90d") {
    start = new Date(now.getTime() - 90 * 86400000);
  } else if (key === "current_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (key === "last_month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getTime() - 30 * 86400000);
  }

  return { key, label: rangeLabels[key], start, end };
}

function micros(value: unknown) {
  return Math.max(0, Number(value ?? 0));
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Math.max(0, Number(value));
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function forecastCostMicros(actualCostMicros: number | null, range: AdminDateRange, eventCount: number) {
  if (actualCostMicros === null || actualCostMicros <= 0 || eventCount < 3) return null;
  const elapsedDays = Math.max(1, (Date.now() - range.start.getTime()) / 86400000);
  const totalDays = Math.max(elapsedDays, (range.end.getTime() - range.start.getTime()) / 86400000);
  return Math.round((actualCostMicros / elapsedDays) * totalDays);
}

export function formatMicros(value: number | null) {
  if (value === null) return "Indisponibil";
  return `${(value / 1_000_000).toLocaleString("ro-RO", { maximumFractionDigits: 2 })} EUR`;
}

export function marginStatus(ratio: number | null): MarginStatus {
  if (ratio === null) return "insufficient_data";
  if (ratio < 0.2) return "healthy";
  if (ratio < 0.3) return "watch";
  if (ratio < 0.4) return "warning";
  return "critical";
}

export function marginStatusLabel(status: MarginStatus) {
  if (status === "healthy") return "Sănătos";
  if (status === "watch") return "De urmărit";
  if (status === "warning") return "Avertizare";
  if (status === "critical") return "Critic";
  return "Date insuficiente";
}

function getConfiguredMonthlyValueMicros(planId: string | null) {
  if (!planId || !(planId in usagePlanCatalog)) return null;
  return null;
}

function mapUsageEvent(row: Record<string, unknown>): AdminUsageEvent {
  return {
    id: String(row.id ?? ""),
    businessId: typeof row.business_id === "string" ? row.business_id : null,
    profileId: typeof row.profile_id === "string" ? row.profile_id : null,
    featureId: String(row.feature_id ?? "unknown"),
    provider: typeof row.provider === "string" ? row.provider : null,
    model: typeof row.model === "string" ? row.model : null,
    status: String(row.status ?? "unknown"),
    units: Number(row.units ?? 0),
    promptTokens: Number(row.prompt_tokens ?? 0),
    completionTokens: Number(row.completion_tokens ?? 0),
    totalTokens: Number(row.total_tokens ?? 0),
    estimatedCostMicros: micros(row.estimated_cost_micros),
    confirmedCostMicros: micros(row.confirmed_cost_micros ?? row.estimated_cost_micros),
    costStatus: String(row.cost_status ?? "estimated"),
    currency: String(row.currency ?? "EUR"),
    pricingVersion: String(row.pricing_version ?? "unknown"),
    requestId: typeof row.request_id === "string" ? row.request_id : null,
    operationType: typeof row.operation_type === "string" ? row.operation_type : null,
    reservationStatus: String(row.reservation_status ?? row.status ?? "unknown"),
    executionStatus: String(row.execution_status ?? row.status ?? "unknown"),
    retryCount: Number(row.retry_count ?? 0),
    latencyMs: nullableNumber(row.latency_ms),
    errorCategory: typeof row.error_category === "string" ? row.error_category : null,
    providerStatusCategory: typeof row.provider_status_category === "string" ? row.provider_status_category : null,
    billableFailure: Boolean(row.billable_failure),
    errorReason: typeof row.error_reason === "string" ? row.error_reason : null,
    createdAt: String(row.created_at ?? "")
  };
}

export async function loadAdminInsights(range: AdminDateRange): Promise<AdminInsights> {
  const supabase = createSupabaseAdminClient();
  const empty: AdminInsights = {
    range,
    usageAvailable: false,
    businessesAvailable: false,
    subscriptionsAvailable: false,
    auditAvailable: false,
    systemStatus: [
      { label: "Supabase Admin", status: supabase ? "Configurat" : "Neconfigurat", detail: "Client server-only pentru citire internă." },
      { label: "Metering", status: "Date insuficiente", detail: "Tabelele de utilizare nu au fost confirmate." },
      { label: "OpenAI", status: process.env.OPENAI_API_KEY ? "Configurat, neverificat" : "Neconfigurat", detail: "Nu sunt afișate valori de mediu." }
    ],
    businesses: [],
    usageEvents: [],
    totals: {
      configuredMonthlyValueMicros: null,
      providerCostMicros: null,
      reservedCostMicros: null,
      forecastCostMicros: null,
      postApiContributionMicros: null,
      postApiMargin: null,
      activeBusinesses: 0,
      requestCount: null,
      failedRequestCount: null,
      averageLatencyMs: null
    },
    featureCosts: [],
    modelCosts: [],
    providerIssues: [],
    alerts: [],
    auditEvents: []
  };

  if (!supabase) return empty;

  const businessesResult = await supabase
    .from("businesses")
    .select("id,name,legal_name,owner_profile_id,industry,city,county,created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const businessRows: BusinessRow[] = businessesResult.error ? [] : (businessesResult.data ?? []) as BusinessRow[];
  const businessesAvailable = !businessesResult.error;
  const ownerIds = Array.from(new Set(businessRows.map((row) => row.owner_profile_id).filter((value): value is string => typeof value === "string")));

  const ownersResult = ownerIds.length
    ? await supabase.from("profiles").select("id,email,full_name").in("id", ownerIds)
    : { data: [], error: null };
  const owners = new Map(((ownersResult.data ?? []) as ProfileRow[]).map((row) => [row.id, row]));

  const subscriptionsResult = await supabase
    .from("subscriptions")
    .select("business_id,plan,status,current_period_end,updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  const subscriptionsAvailable = !subscriptionsResult.error && Boolean(subscriptionsResult.data);
  const subscriptionsByBusiness = new Map<string, Record<string, unknown>>();
  for (const row of subscriptionsResult.data ?? []) {
    if (!subscriptionsByBusiness.has(row.business_id)) subscriptionsByBusiness.set(row.business_id, row);
  }

  const usageResult = await supabase
    .from("usage_events")
    .select("id,business_id,profile_id,feature_id,provider,model,status,reservation_status,execution_status,units,operation_type,request_id,prompt_tokens,completion_tokens,total_tokens,estimated_cost_micros,confirmed_cost_micros,cost_status,currency,pricing_version,retry_count,latency_ms,error_category,provider_status_category,billable_failure,error_reason,created_at")
    .gte("created_at", range.start.toISOString())
    .lt("created_at", range.end.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);

  const usageMissing = usageResult.error && isMissingRelationError(usageResult.error, "usage_events");
  if (usageResult.error && !usageMissing) {
    console.error("admin_usage_events_load_failed", { code: usageResult.error.code });
  }

  const usageAvailable = !usageResult.error;
  const usageEvents = usageAvailable ? (usageResult.data ?? []).map((row) => mapUsageEvent(row)) : [];
  const usageByBusiness = new Map<string, AdminUsageEvent[]>();
  for (const event of usageEvents) {
    if (!event.businessId) continue;
    usageByBusiness.set(event.businessId, [...(usageByBusiness.get(event.businessId) ?? []), event]);
  }

  const businessNameById = new Map<string, string>();
  const businesses: AdminBusinessSummary[] = businessRows.map((row) => {
    const businessEvents = usageByBusiness.get(row.id) ?? [];
    const subscription = subscriptionsByBusiness.get(row.id);
    const planId = typeof subscription?.plan === "string" ? subscription.plan : null;
    const configuredValue = getConfiguredMonthlyValueMicros(planId);
    const providerCost = usageAvailable ? businessEvents.reduce((sum, event) => sum + event.estimatedCostMicros, 0) : null;
    const reservedCost = usageAvailable ? businessEvents.filter((event) => event.status === "reserved").reduce((sum, event) => sum + event.estimatedCostMicros, 0) : null;
    const requestCount = usageAvailable ? businessEvents.length : null;
    const failedRequestCount = usageAvailable ? businessEvents.filter((event) => event.status === "failed").length : null;
    const averageLatencyMs = usageAvailable ? average(businessEvents.map((event) => event.latencyMs).filter((value): value is number => value !== null)) : null;
    const totalUnits = usageAvailable ? businessEvents.reduce((sum, event) => sum + event.totalTokens + event.units, 0) : null;
    const lastUsageAt = businessEvents[0]?.createdAt ?? null;
    const owner = owners.get(row.owner_profile_id ?? "");
    const ratio = configuredValue && providerCost !== null ? providerCost / configuredValue : null;
    const status = marginStatus(ratio);
    const warnings: string[] = [];
    if (status === "warning" || status === "critical") warnings.push("Cost API ridicat față de valoarea planului");
    if (failedRequestCount && requestCount && failedRequestCount / requestCount >= 0.15) warnings.push("Rată mare de erori provider");
    if (usageAvailable && requestCount === 0) warnings.push("Fără activitate în perioada selectată");

    businessNameById.set(row.id, row.name);
    return {
      id: row.id,
      name: row.name,
      legalName: row.legal_name ?? null,
      ownerProfileId: row.owner_profile_id ?? null,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.full_name ?? null,
      planId,
      accessStatus: subscription ? String(subscription.status ?? "necunoscut") : "Fără plan confirmat",
      configuredMonthlyValueMicros: configuredValue,
      providerCostMicros: providerCost,
      reservedCostMicros: reservedCost,
      forecastCostMicros: forecastCostMicros(providerCost, range, businessEvents.length),
      requestCount,
      failedRequestCount,
      averageLatencyMs,
      totalUnits,
      lastUsageAt,
      marginStatus: status,
      warnings
    } satisfies AdminBusinessSummary;
  });

  const providerCostMicros = usageAvailable ? usageEvents.reduce((sum, event) => sum + event.estimatedCostMicros, 0) : null;
  const reservedCostMicros = usageAvailable ? usageEvents.filter((event) => event.status === "reserved").reduce((sum, event) => sum + event.estimatedCostMicros, 0) : null;
  const averageLatencyMs = usageAvailable ? average(usageEvents.map((event) => event.latencyMs).filter((value): value is number => value !== null)) : null;
  const totalForecastCostMicros = forecastCostMicros(providerCostMicros, range, usageEvents.length);
  const totalConfiguredMonthlyValueMicros = businesses.some((business) => business.configuredMonthlyValueMicros !== null)
    ? businesses.reduce((sum, business) => sum + (business.configuredMonthlyValueMicros ?? 0), 0)
    : null;
  const postApiContributionMicros = totalConfiguredMonthlyValueMicros !== null && providerCostMicros !== null ? totalConfiguredMonthlyValueMicros - providerCostMicros : null;
  const postApiMargin = totalConfiguredMonthlyValueMicros && postApiContributionMicros !== null ? postApiContributionMicros / totalConfiguredMonthlyValueMicros : null;

  const featureMap = new Map<string, { requestCount: number; success: number; cost: number; confirmedCost: number; latencies: number[] }>();
  for (const event of usageEvents) {
    const current = featureMap.get(event.featureId) ?? { requestCount: 0, success: 0, cost: 0, confirmedCost: 0, latencies: [] };
    current.requestCount += 1;
    if (event.status === "settled") current.success += 1;
    current.cost += event.estimatedCostMicros;
    current.confirmedCost += event.confirmedCostMicros;
    if (event.latencyMs !== null) current.latencies.push(event.latencyMs);
    featureMap.set(event.featureId, current);
  }
  const totalCost = providerCostMicros ?? 0;
  const featureCosts = Array.from(featureMap.entries())
    .map(([featureId, value]) => ({
      featureId,
      label: usageFeatures[featureId as keyof typeof usageFeatures]?.label ?? featureId,
      requestCount: value.requestCount,
      successRate: value.requestCount ? value.success / value.requestCount : null,
      costMicros: value.cost,
      confirmedCostMicros: value.confirmedCost,
      averageCostMicros: value.requestCount ? Math.round(value.cost / value.requestCount) : null,
      averageLatencyMs: average(value.latencies),
      share: totalCost > 0 ? value.cost / totalCost : null
    }))
    .sort((a, b) => b.costMicros - a.costMicros);

  const modelMap = new Map<string, { provider: string; model: string; requestCount: number; totalUnits: number; cost: number; confirmedCost: number; failed: number; latencies: number[] }>();
  for (const event of usageEvents) {
    const provider = event.provider ?? "necunoscut";
    const model = event.model ?? "necunoscut";
    const key = `${provider}:${model}`;
    const current = modelMap.get(key) ?? { provider, model, requestCount: 0, totalUnits: 0, cost: 0, confirmedCost: 0, failed: 0, latencies: [] };
    current.requestCount += 1;
    current.totalUnits += event.totalTokens + event.units;
    current.cost += event.estimatedCostMicros;
    current.confirmedCost += event.confirmedCostMicros;
    if (event.latencyMs !== null) current.latencies.push(event.latencyMs);
    if (event.status === "failed") current.failed += 1;
    modelMap.set(key, current);
  }
  const modelCosts = Array.from(modelMap.values())
    .map((value) => ({
      provider: value.provider,
      model: value.model,
      requestCount: value.requestCount,
      totalUnits: value.totalUnits,
      costMicros: value.cost,
      confirmedCostMicros: value.confirmedCost,
      failedRequestCount: value.failed,
      averageLatencyMs: average(value.latencies)
    }))
    .sort((a, b) => b.costMicros - a.costMicros);

  const issueMap = new Map<string, { count: number; last: string; event: AdminUsageEvent }>();
  for (const event of usageEvents.filter((item) => item.status === "failed" || item.errorReason)) {
    const key = `${event.provider}:${event.model}:${event.featureId}:${event.businessId}:${event.errorReason ?? event.status}`;
    const current = issueMap.get(key);
    if (!current) {
      issueMap.set(key, { count: 1, last: event.createdAt, event });
    } else {
      current.count += 1;
      if (event.createdAt > current.last) current.last = event.createdAt;
    }
  }
  const providerIssues = Array.from(issueMap.values()).map(({ count, last, event }) => ({
    provider: event.provider ?? "necunoscut",
    model: event.model ?? "necunoscut",
    featureId: event.featureId,
    businessName: event.businessId ? businessNameById.get(event.businessId) ?? "Business necunoscut" : "Fără business_id",
    errorCategory: event.errorReason ?? event.status,
    count,
    lastOccurrence: last
  }));

  const alerts: AdminAlert[] = businesses.flatMap((business) => business.warnings.map((warning) => ({
    severity: business.marginStatus === "critical" ? "critical" as const : "warning" as const,
    title: warning,
    detail: `${business.name}: ${business.requestCount ?? 0} cereri, cost API ${formatMicros(business.providerCostMicros)}.`,
    action: "Verifică business-ul și consumul pe funcții înainte de următoarea perioadă."
  }))).slice(0, 8);

  if (!usageAvailable) {
    alerts.unshift({
      severity: "watch",
      title: "Metering indisponibil",
      detail: "Tabelele de utilizare nu sunt disponibile sau nu pot fi citite.",
      action: "Verifică migrarea usage metering înainte de a interpreta costurile."
    });
  }

  const auditResult = await supabase
    .from("role_audit_log")
    .select("role,action,changed_at,changed_by_database_user")
    .order("changed_at", { ascending: false })
    .limit(20);
  const auditAvailable = !auditResult.error;
  const auditEvents = (auditResult.data ?? []).map((row) => ({
    role: String(row.role ?? ""),
    action: String(row.action ?? ""),
    changedAt: String(row.changed_at ?? ""),
    actor: typeof row.changed_by_database_user === "string" ? row.changed_by_database_user : null
  }));

  return {
    range,
    usageAvailable,
    businessesAvailable,
    subscriptionsAvailable,
    auditAvailable,
    systemStatus: [
      { label: "Supabase Admin", status: "Configurat", detail: "Client server-only disponibil." },
      { label: "Metering", status: usageAvailable ? "Operațional" : "Date insuficiente", detail: usageAvailable ? "Evenimentele de utilizare pot fi citite." : "Tabelele lipsesc sau nu sunt accesibile." },
      { label: "OpenAI", status: process.env.OPENAI_API_KEY ? "Configurat, neverificat" : "Neconfigurat", detail: "Cheia nu este afișată niciodată în interfață." },
      { label: "Audit roluri", status: auditAvailable ? "Operațional" : "Date insuficiente", detail: auditAvailable ? "Auditul rolurilor poate fi citit." : "Tabela de audit lipsește sau nu este accesibilă." }
    ],
    businesses,
    usageEvents,
    totals: {
      configuredMonthlyValueMicros: totalConfiguredMonthlyValueMicros,
      providerCostMicros,
      reservedCostMicros,
      forecastCostMicros: totalForecastCostMicros,
      postApiContributionMicros,
      postApiMargin,
      activeBusinesses: businesses.length,
      requestCount: usageAvailable ? usageEvents.length : null,
      failedRequestCount: usageAvailable ? usageEvents.filter((event) => event.status === "failed").length : null,
      averageLatencyMs
    },
    featureCosts,
    modelCosts,
    providerIssues,
    alerts,
    auditEvents
  };
}
