import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readLocalSupabaseStatus, runLocalSql } from "../demo/local-supabase.mjs";

if (process.argv.length !== 2) {
  throw new Error("Acest verificator local nu acceptă argumente.");
}

function checkpoint(message) {
  console.log(message);
}

function fail(message) {
  throw new Error(`Verificarea locală paid access a eșuat: ${message}`);
}

function sqlState(businessId) {
  return runLocalSql(`select json_build_object(
    'business_count', (select count(*) from public.businesses where id = '${businessId}'),
    'subscription_count', (select count(*) from public.subscriptions where business_id = '${businessId}'),
    'subscription', coalesce((select json_build_object(
      'id', id::text,
      'plan', plan,
      'status', status,
      'current_period_end', current_period_end,
      'updated_at', updated_at
    ) from public.subscriptions where business_id = '${businessId}' order by updated_at desc, created_at desc, id desc limit 1), '{}'::json),
    'audit_count', (select count(*) from public.audit_logs where business_id = '${businessId}' and action = 'subscription.manual_access_changed'),
    'audit', coalesce((select json_build_object(
      'action', action,
      'method', metadata ->> 'method'
    ) from public.audit_logs where business_id = '${businessId}' and action = 'subscription.manual_access_changed' order by created_at desc, id desc limit 1), '{}'::json)
  )`, { json: true });
}

function runOperatorCli(local, args, { apply = false } = {}) {
  const result = spawnSync(process.execPath, [
    "scripts/billing/manual-paid-access.mjs",
    ...args,
    "--environment", "local",
    ...(apply ? ["--apply"] : [])
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: local.apiUrl,
      SUPABASE_SERVICE_ROLE_KEY: apply ? local.serviceRoleKey : undefined
    }
  });
  if (result.status !== 0) fail("operator CLI a returnat un cod diferit de zero.");
  let output;
  try {
    output = JSON.parse(result.stdout.trim());
  } catch {
    fail("operator CLI nu a returnat JSON valid.");
  }
  if (`${result.stdout}\n${result.stderr}`.includes(local.serviceRoleKey)) fail("operator CLI a expus o cheie locală.");
  return output;
}

function assertPrivilegeContract() {
  const privileges = runLocalSql(`select json_build_object(
    'function_exists', to_regprocedure('public.set_manual_subscription_access(uuid,text,text,timestamptz,text)') is not null,
    'public_execute', coalesce((
      select bool_or(acl.grantee = 0 and acl.privilege_type = 'EXECUTE')
      from pg_proc p
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      where p.oid = 'public.set_manual_subscription_access(uuid,text,text,timestamptz,text)'::regprocedure
    ), false),
    'anon_execute', has_function_privilege('anon', 'public.set_manual_subscription_access(uuid,text,text,timestamptz,text)'::regprocedure, 'EXECUTE'),
    'authenticated_execute', has_function_privilege('authenticated', 'public.set_manual_subscription_access(uuid,text,text,timestamptz,text)'::regprocedure, 'EXECUTE'),
    'service_role_execute', has_function_privilege('service_role', 'public.set_manual_subscription_access(uuid,text,text,timestamptz,text)'::regprocedure, 'EXECUTE'),
    'authenticated_select', has_table_privilege('authenticated', 'public.subscriptions', 'SELECT'),
    'authenticated_insert', has_table_privilege('authenticated', 'public.subscriptions', 'INSERT'),
    'authenticated_update', has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE'),
    'authenticated_delete', has_table_privilege('authenticated', 'public.subscriptions', 'DELETE')
  )`, { json: true });
  assert.deepEqual(privileges, {
    function_exists: true,
    public_execute: false,
    anon_execute: false,
    authenticated_execute: false,
    service_role_execute: true,
    authenticated_select: true,
    authenticated_insert: false,
    authenticated_update: false,
    authenticated_delete: false
  });
}

async function main() {
  const local = readLocalSupabaseStatus();
  checkpoint("LOCAL TARGET VERIFIED");
  assertPrivilegeContract();
  checkpoint("RPC PRIVILEGES VERIFIED");

  const businessId = randomUUID();
  const runId = randomUUID().slice(0, 8);
  const name = `ReveNew Paid Access Local Verification ${runId}`;
  let created = false;

  try {
    // The reviewed client contract intentionally keeps service_role read-only on businesses.
    // Seed only this isolated local fixture through the PostgreSQL helper, then exercise the real operator CLI with service_role.
    runLocalSql(`insert into public.businesses (id, name, legal_name) values ('${businessId}', '${name}', '${name}');`);
    created = true;

    const activeEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const dryRun = runOperatorCli(local, [
      "--business-id", businessId, "--plan", "growth", "--status", "active", "--until", activeEnd, "--reference", `LOCAL-${runId}-DRY`
    ]);
    assert.equal(dryRun.mode, "dry-run");
    assert.equal(dryRun.target, new URL(local.apiUrl).origin);
    let state = sqlState(businessId);
    assert.equal(Number(state.subscription_count), 0);
    assert.equal(Number(state.audit_count), 0);
    checkpoint("DRY RUN VERIFIED");

    const activeArgs = [
      "--business-id", businessId, "--plan", "growth", "--status", "active", "--until", activeEnd, "--reference", `LOCAL-${runId}-ACTIVE`
    ];
    const active = runOperatorCli(local, activeArgs, { apply: true });
    assert.equal(active.changed, true);
    state = sqlState(businessId);
    const subscriptionId = state.subscription.id;
    assert.equal(Number(state.subscription_count), 1);
    assert.equal(state.subscription.plan, "growth");
    assert.equal(state.subscription.status, "active");
    assert.ok(new Date(state.subscription.current_period_end).getTime() > Date.now());
    assert.ok(state.subscription.updated_at);
    assert.equal(Number(state.audit_count), 1);
    assert.equal(state.audit.action, "subscription.manual_access_changed");
    assert.equal(state.audit.method, "manual_operator");
    checkpoint("ACTIVE VERIFIED");

    const replay = runOperatorCli(local, activeArgs, { apply: true });
    assert.equal(replay.changed, false);
    state = sqlState(businessId);
    assert.equal(state.subscription.id, subscriptionId);
    assert.equal(Number(state.subscription_count), 1);
    assert.equal(Number(state.audit_count), 1);
    checkpoint("IDEMPOTENT REPLAY VERIFIED");

    const pastDue = runOperatorCli(local, [
      "--business-id", businessId, "--plan", "growth", "--status", "past_due", "--until", activeEnd, "--reference", `LOCAL-${runId}-PASTDUE`
    ], { apply: true });
    assert.equal(pastDue.changed, true);
    state = sqlState(businessId);
    assert.equal(state.subscription.id, subscriptionId);
    assert.equal(state.subscription.status, "past_due");
    assert.equal(Number(state.subscription_count), 1);
    assert.equal(Number(state.audit_count), 2);
    checkpoint("PAST DUE VERIFIED");

    const reactivatedEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const reactivated = runOperatorCli(local, [
      "--business-id", businessId, "--plan", "growth", "--status", "active", "--until", reactivatedEnd, "--reference", `LOCAL-${runId}-REACTIVATE`
    ], { apply: true });
    assert.equal(reactivated.changed, true);
    state = sqlState(businessId);
    assert.equal(state.subscription.id, subscriptionId);
    assert.equal(state.subscription.status, "active");
    assert.ok(new Date(state.subscription.current_period_end).getTime() > Date.now());
    assert.equal(Number(state.subscription_count), 1);
    assert.equal(Number(state.audit_count), 3);
    checkpoint("REACTIVATION VERIFIED");

    const cancelledFuture = runOperatorCli(local, [
      "--business-id", businessId, "--plan", "growth", "--status", "cancelled", "--until", reactivatedEnd, "--reference", `LOCAL-${runId}-CANCEL-FUTURE`
    ], { apply: true });
    assert.equal(cancelledFuture.changed, true);
    state = sqlState(businessId);
    assert.equal(state.subscription.id, subscriptionId);
    assert.equal(state.subscription.status, "cancelled");
    assert.ok(new Date(state.subscription.current_period_end).getTime() > Date.now());
    assert.equal(Number(state.subscription_count), 1);
    assert.equal(Number(state.audit_count), 4);
    checkpoint("CANCEL FUTURE VERIFIED");

    const expiredEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const cancelledExpired = runOperatorCli(local, [
      "--business-id", businessId, "--plan", "growth", "--status", "cancelled", "--until", expiredEnd, "--reference", `LOCAL-${runId}-CANCEL-EXPIRED`
    ], { apply: true });
    assert.equal(cancelledExpired.changed, true);
    state = sqlState(businessId);
    assert.equal(state.subscription.id, subscriptionId);
    assert.equal(state.subscription.status, "cancelled");
    assert.ok(new Date(state.subscription.current_period_end).getTime() <= Date.now());
    assert.equal(Number(state.subscription_count), 1);
    assert.equal(Number(state.audit_count), 5);
    checkpoint("CANCEL EXPIRED VERIFIED");
  } finally {
    if (created) {
      runLocalSql(`delete from public.businesses where id = '${businessId}';`);
      const after = sqlState(businessId);
      if (Number(after.business_count) !== 0 || Number(after.subscription_count) !== 0 || Number(after.audit_count) !== 0) {
        fail(`cleanup-ul firmei temporare a lăsat date pentru ${businessId}.`);
      }
      checkpoint("CLEANUP VERIFIED");
    }
  }

  checkpoint("PAID ACCESS LOCAL INTEGRATION: PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Verificarea locală a eșuat.");
  process.exitCode = 1;
});
