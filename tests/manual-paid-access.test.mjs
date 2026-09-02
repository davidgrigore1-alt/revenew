import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

function runCli({ target, environment, secret, extra = [] }) {
  return spawnSync(process.execPath, [
    "scripts/billing/manual-paid-access.mjs",
    "--business-id", "11111111-1111-4111-8111-111111111111",
    "--plan", "starter",
    "--status", "active",
    "--until", "2099-01-01T00:00:00.000Z",
    "--reference", "INV-TEST-001",
    "--environment", environment,
    ...extra
  ], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: target, SUPABASE_SERVICE_ROLE_KEY: secret }
  });
}

async function loadPaidAccess({ nodeEnv, accessMode, supabaseConfigured, businessSource }) {
  const source = await read("../src/lib/billing/paid-access.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const currentBusiness = {
    business: { id: "business-1" },
    source: businessSource,
    profileId: "",
    authUserId: "",
    authUserEmail: "",
    profileName: "Test",
    servicesCount: 0,
    targetsCount: 0
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    process: { env: { NODE_ENV: nodeEnv, REVENEW_ACCESS_MODE: accessMode } },
    Date,
    console,
    require: (id) => ({
      "server-only": {},
      react: { cache: (fn) => fn },
      "next/headers": { cookies: async () => ({ get: () => undefined }) },
      "next/navigation": { redirect: () => {} },
      "@/lib/business/current-business": { getCurrentBusinessForUser: async () => currentBusiness },
      "@/lib/billing/plans": { getPreviewPlanById: () => null, isPreviewPlanId: () => false },
      "@/lib/supabase/server": { createSupabaseServerClient: async () => null },
      "@/lib/supabase/status": { isSupabaseConfigured: supabaseConfigured }
    })[id] ?? {}
  });
  return module.exports;
}

test("manual paid access migration is service-role-only and preserves subscription read-only client access", async () => {
  const migration = await read("../supabase/migrations/20260902004041_manual_paid_access_operator_control.sql");
  const hardening = await read("../supabase/migrations/20260828201121_staging_security_hardening.sql");
  assert.match(migration, /security definer\s+set search_path = pg_catalog, public/i);
  assert.match(migration, /revoke execute on function public\.set_manual_subscription_access\(uuid, text, text, timestamptz, text\)\s+from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.set_manual_subscription_access\(uuid, text, text, timestamptz, text\)\s+to service_role/i);
  assert.match(hardening, /revoke all\s+on table public\.subscriptions\s+from anon, authenticated/i);
  assert.match(hardening, /grant select\s+on table public\.subscriptions\s+to authenticated/i);
});

test("manual paid access migration bounds input, protects active periods, audits changes, and is idempotent", async () => {
  const migration = await read("../supabase/migrations/20260902004041_manual_paid_access_operator_control.sql");
  assert.match(migration, /p_plan not in \('starter', 'growth', 'agency', 'enterprise'\)/i);
  assert.match(migration, /p_status not in \('active', 'past_due', 'cancelled'\)/i);
  assert.match(migration, /char_length\(v_reference\) > 160/i);
  assert.match(migration, /p_status = 'active' and \(p_current_period_end is null or p_current_period_end <= now\(\)\)/i);
  assert.match(migration, /from public\.businesses[\s\S]*for update/i);
  assert.match(migration, /order by updated_at desc, created_at desc, id desc[\s\S]*for update/i);
  assert.match(migration, /set plan = p_plan,[\s\S]*updated_at = now\(\)/i);
  assert.match(migration, /subscription\.manual_access_changed/);
  assert.match(migration, /'method', 'manual_operator'/);
  assert.match(migration, /current_period_end is not distinct from p_current_period_end/i);
  assert.match(migration, /return query select v_subscription\.id, v_subscription\.plan, v_subscription\.status, v_subscription\.current_period_end, false/i);
});

test("manual paid access CLI defaults to dry run and keeps target and credential controls explicit", async () => {
  const cli = await read("../scripts/billing/manual-paid-access.mjs");
  assert.match(cli, /mode: apply \? "apply" : "dry-run"/);
  assert.match(cli, /if \(!values\.apply\) \{[\s\S]*console\.log\(JSON\.stringify\(summary\)\)/);
  assert.match(cli, /if \(environment === "production" && loopback\)/);
  assert.match(cli, /production mode requires an https: Supabase URL/);
  assert.match(cli, /Supabase URL must use http: or https:/);
  assert.match(cli, /if \(environment === "local" && !loopback\)/);
  assert.match(cli, /target: validatedUrl\.origin/);
  assert.match(cli, /active access requires a future --until timestamp/);
  assert.match(cli, /SUPABASE_SERVICE_ROLE_KEY is required/);
  assert.doesNotMatch(cli, /console\.(?:log|error).*SUPABASE_SERVICE_ROLE_KEY/);
});

test("manual paid access CLI validates environment targets before any mutation", () => {
  const productionHttp = runCli({ target: "http://project.supabase.co", environment: "production" });
  assert.notEqual(productionHttp.status, 0);
  assert.match(productionHttp.stderr, /requires an https:/);

  const productionHttps = runCli({ target: "https://project.supabase.co", environment: "production" });
  assert.equal(productionHttps.status, 0, productionHttps.stderr);
  assert.match(productionHttps.stdout, /"target":"https:\/\/project\.supabase\.co"/);

  const localLoopback = runCli({ target: "http://127.0.0.1:54321", environment: "local" });
  assert.equal(localLoopback.status, 0, localLoopback.stderr);

  const localRemote = runCli({ target: "https://project.supabase.co", environment: "local" });
  assert.notEqual(localRemote.status, 0);
  assert.match(localRemote.stderr, /local mode requires a loopback/);
});

test("manual paid access CLI dry run needs no secret, performs no RPC, and never echoes a supplied key", () => {
  const secret = "service-role-test-secret-that-must-not-appear";
  const noSecret = runCli({ target: "http://127.0.0.1:54321", environment: "local" });
  assert.equal(noSecret.status, 0, noSecret.stderr);
  assert.match(noSecret.stdout, /"target":"http:\/\/127\.0\.0\.1:54321"/);

  const result = runCli({ target: "http://127.0.0.1:54321", environment: "local", secret });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"mode":"dry-run"/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(secret));
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /set_manual_subscription_access|RPC failed/);
});

test("production paid access fails closed without verification while local demo fallback remains available", async () => {
  const unavailable = await loadPaidAccess({ nodeEnv: "production", accessMode: "paid", supabaseConfigured: false, businessSource: "demo" });
  const unavailableContext = await unavailable.getCurrentPaidAccessContext();
  assert.equal(unavailableContext.hasAccess, false);
  assert.equal(unavailableContext.accessStatus, "verification_unavailable");
  assert.equal(unavailableContext.reason, "subscription_verification_unavailable");
  assert.equal(unavailable.getPaidAccessStatusLabel("verification_unavailable"), "Verificare abonament indisponibilă");

  const demoBusiness = await loadPaidAccess({ nodeEnv: "production", accessMode: "paid", supabaseConfigured: true, businessSource: "demo" });
  assert.equal((await demoBusiness.getCurrentPaidAccessContext()).hasAccess, false);

  const localDemo = await loadPaidAccess({ nodeEnv: "development", accessMode: "paid", supabaseConfigured: false, businessSource: "demo" });
  const localContext = await localDemo.getCurrentPaidAccessContext();
  assert.equal(localContext.hasAccess, true);
  assert.equal(localContext.accessStatus, "demo_unconfigured");
});

test("paid subscription access semantics remain unchanged", async () => {
  const paidAccess = await loadPaidAccess({ nodeEnv: "test", accessMode: "paid", supabaseConfigured: true, businessSource: "supabase" });
  const subscription = (status, currentPeriodEnd) => ({ id: "sub-1", businessId: "business-1", plan: "starter", status, currentPeriodEnd, createdAt: null, updatedAt: null });
  assert.equal(paidAccess.evaluateSubscription(subscription("active", null)).hasAccess, true);
  assert.equal(paidAccess.evaluateSubscription(subscription("active", "2099-01-01T00:00:00.000Z")).hasAccess, true);
  assert.equal(paidAccess.evaluateSubscription(subscription("active", "2000-01-01T00:00:00.000Z")).accessStatus, "expired");
  assert.equal(paidAccess.evaluateSubscription(subscription("past_due", "2099-01-01T00:00:00.000Z")).hasAccess, false);
  assert.equal(paidAccess.evaluateSubscription(subscription("trialing", "2099-01-01T00:00:00.000Z")).hasAccess, false);
  assert.equal(paidAccess.evaluateSubscription(subscription("cancelled", "2099-01-01T00:00:00.000Z")).hasAccess, true);
  assert.equal(paidAccess.evaluateSubscription(subscription("cancelled", null)).hasAccess, false);
  assert.equal(paidAccess.evaluateSubscription(null).hasAccess, false);
});

test("paid plan labels are canonical across customer access and billing pages", async () => {
  const plans = await read("../src/lib/billing/plans.ts");
  const access = await read("../src/app/(account)/access/page.tsx");
  const billing = await read("../src/app/(account)/billing/page.tsx");
  for (const label of ["demo: \"Demo\"", "starter: \"Start\"", "growth: \"Growth\"", "agency: \"Scale\"", "enterprise: \"Enterprise\""]) assert.ok(plans.includes(label));
  assert.match(plans, /export function getPaidPlanLabel/);
  assert.match(access, /getPaidPlanLabel\(context\.subscription\?\.plan\)/);
  assert.match(billing, /getPaidPlanLabel\(context\.subscription\?\.plan\)/);
});

test("manual paid access operator runbook covers the first-pilot lifecycle", async () => {
  const runbook = await read("../docs/operations/manual-paid-access.md");
  for (const heading of ["## Activation", "## Past due", "## Cancellation", "## Reactivation", "## Rollback", "## Security"]) assert.ok(runbook.includes(heading));
  assert.match(runbook, /--apply/);
  assert.match(runbook, /printed `target` origin/);
  assert.match(runbook, /browser users have read-only subscription access/i);
});

test("local paid access verification is isolated, local-only, and cleans its temporary business", async () => {
  const verifier = await read("../scripts/billing/verify-manual-paid-access-local.mjs");
  const packageJson = await read("../package.json");
  assert.match(packageJson, /"billing:verify-local": "node scripts\/billing\/verify-manual-paid-access-local\.mjs"/);
  assert.match(verifier, /readLocalSupabaseStatus, runLocalSql/);
  assert.match(verifier, /LOCAL TARGET VERIFIED/);
  assert.match(verifier, /RPC PRIVILEGES VERIFIED/);
  assert.match(verifier, /IDEMPOTENT REPLAY VERIFIED/);
  assert.match(verifier, /PAID ACCESS LOCAL INTEGRATION: PASS/);
  assert.match(verifier, /insert into public\.businesses/);
  assert.match(verifier, /delete from public\.businesses where id/);
  assert.doesNotMatch(verifier, /environment", "production"|--linked|db push|console\.log\([^\n]*serviceRoleKey/);
});
