import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

const plans = new Set(["starter", "growth", "agency", "enterprise"]);
const statuses = new Set(["active", "past_due", "cancelled"]);
const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message) {
  console.error(`manual paid access: ${message}`);
  process.exitCode = 1;
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") {
      values.apply = true;
      continue;
    }
    if (!value.startsWith("--")) throw new Error(`Unknown argument: ${value}`);
    const key = value.slice(2);
    if (!new Set(["business-id", "plan", "status", "until", "reference", "environment"]).has(key)) {
      throw new Error(`Unknown argument: ${value}`);
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
    values[key] = next;
    index += 1;
  }
  return values;
}

function validatedInput(values, environment) {
  if (!uuidPattern.test(values["business-id"] ?? "")) throw new Error("--business-id must be a UUID");
  if (!plans.has(values.plan)) throw new Error("--plan must be starter, growth, agency, or enterprise");
  if (!statuses.has(values.status)) throw new Error("--status must be active, past_due, or cancelled");
  if (environment !== "local" && environment !== "production") throw new Error("--environment must be local or production");
  const reference = (values.reference ?? "").trim();
  if (!reference || reference.length > 160 || /[\u0000-\u001f\u007f]/.test(reference)) throw new Error("--reference must be 1–160 printable characters");

  const until = values.until ? new Date(values.until) : null;
  if (values.until && Number.isNaN(until.getTime())) throw new Error("--until must be an ISO timestamp");
  if (values.status === "active" && (!until || until.getTime() <= Date.now())) throw new Error("active access requires a future --until timestamp");

  return {
    businessId: values["business-id"],
    plan: values.plan,
    status: values.status,
    until: until?.toISOString() ?? null,
    reference
  };
}

function validateTarget(urlValue, environment) {
  if (!urlValue) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  const url = new URL(urlValue);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Supabase URL must use http: or https:");
  }
  const loopback = loopbackHosts.has(url.hostname);
  if (environment === "production" && loopback) throw new Error("production mode rejects loopback Supabase URLs");
  if (environment === "production" && url.protocol !== "https:") throw new Error("production mode requires an https: Supabase URL");
  if (environment === "local" && !loopback) throw new Error("local mode requires a loopback Supabase URL");
  return url;
}

function safeSummary(input, environment, apply, validatedUrl) {
  return {
    mode: apply ? "apply" : "dry-run",
    environment,
    target: validatedUrl.origin,
    businessId: input.businessId,
    plan: input.plan,
    status: input.status,
    currentPeriodEnd: input.until,
    reference: input.reference
  };
}

export function main(argv = process.argv.slice(2), environmentVariables = process.env) {
  let values;
  let environment;
  let input;
  try {
    values = parseArguments(argv);
    environment = values.environment;
    input = validatedInput(values, environment);
    const validatedUrl = validateTarget(environmentVariables.NEXT_PUBLIC_SUPABASE_URL, environment);
    const summary = safeSummary(input, environment, values.apply === true, validatedUrl);
    if (!values.apply) {
      console.log(JSON.stringify(summary));
      return;
    }

    if (!environmentVariables.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

    return applyManualPaidAccess(input, environmentVariables, summary);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Invalid input");
  }
}

function applyManualPaidAccess(input, environmentVariables, summary) {
  const client = createClient(environmentVariables.NEXT_PUBLIC_SUPABASE_URL, environmentVariables.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return client.rpc("set_manual_subscription_access", {
    p_business_id: input.businessId,
    p_plan: input.plan,
    p_status: input.status,
    p_current_period_end: input.until,
    p_reference: input.reference
  }).then(({ data, error }) => {
    if (error) {
      fail("RPC failed; no credentials or provider diagnostics were printed");
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    console.log(JSON.stringify({ ...summary, subscriptionId: result?.subscription_id ?? null, changed: result?.changed ?? null }));
  }).catch(() => fail("RPC failed; no credentials or provider diagnostics were printed"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
