import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
function compile(relativePath, aliases = {}) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(filename), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => aliases[specifier] ?? {};
  vm.runInNewContext(output, { exports: module.exports, module, require: localRequire, Date, Set, Map, Number, String }, { filename });
  return module.exports;
}
const foundation = compile("src/lib/workflow-foundation.ts");
const runtime = compile("src/lib/workflow-runtime-core.ts", { "@/lib/workflow-foundation": foundation });
const registry = compile("src/lib/workflow-trigger-registry.ts");
const presentation = compile("src/lib/workflow-presentation.ts", { "@/lib/workflow-trigger-registry": registry });
const preflight = compile("src/lib/workflow-preflight.ts", { "@/lib/workflow-foundation": foundation, "@/lib/workflow-trigger-registry": registry, "@/lib/workflow-presentation": presentation });
const playbooks = compile("src/lib/workflow-playbooks.ts");
const trace = compile("src/lib/workflow-trace.ts", { "@/lib/workflow-presentation": presentation, "@/lib/workflow-trigger-registry": registry });

const definition = (overrides = {}) => ({
  id: "workflow-1", name: "Follow-up restant", status: "active", trigger: "next_action_overdue",
  conditions: [], actions: [{ type: "prepare_email", description: "Pregătește răspunsul.", requiresHumanApproval: true }],
  createdBy: "profile-1", createdAt: "2026-08-25T12:00:00.000Z", source: "manual", ...overrides
});
const context = (overrides = {}) => ({
  owner: "profile-1", stage: "proposal", execution_state: "overdue", severity: "attention",
  company: "Meridian", estimated_value: 42000, currency: "RON", waiting_state: null,
  lifecycleOpen: true, recentInboundReply: false, meetingUpcoming: false, ...overrides
});
const event = (trigger = "next_action_overdue") => ({ trigger, eventKey: "opportunity:1:overdue:2026-08-25", targetType: "opportunity", targetId: "opportunity-1" });

test("runtime matches active triggers and ignores draft or paused definitions", () => {
  assert.equal(runtime.evaluateWorkflow(definition(), event(), context()).triggerMatched, true);
  assert.equal(runtime.evaluateWorkflow(definition({ status: "draft" }), event(), context()).decision, "conditions_not_met");
  assert.equal(runtime.evaluateWorkflow(definition({ status: "paused" }), event(), context()).decision, "conditions_not_met");
  assert.equal(runtime.evaluateWorkflow(definition(), event("email_received"), context()).triggerMatched, false);
});

test("bounded conditions support equality, numeric comparisons and empty values", () => {
  const result = runtime.evaluateWorkflow(definition({ conditions: [
    { field: "currency", operator: "equals", value: "RON" },
    { field: "estimated_value", operator: "greater_than", value: 40000 },
    { field: "owner", operator: "is_not_empty", value: null }
  ] }), event(), context());
  assert.equal(result.conditionsMatched, true);
  const mismatch = runtime.evaluateWorkflow(definition({ conditions: [{ field: "company", operator: "not_equals", value: "Meridian" }] }), event(), context());
  assert.equal(mismatch.decision, "conditions_not_met");
  assert.match(mismatch.reason, /Omis/);
});

test("numeric comparisons preserve unknown values and distinguish zero", () => {
  const numeric = definition({ conditions: [{ field: "estimated_value", operator: "greater_than", value: 0 }] });
  assert.equal(runtime.evaluateWorkflow(numeric, event(), context({ estimated_value: null })).conditionsMatched, false);
  assert.equal(runtime.evaluateWorkflow(numeric, event(), context({ estimated_value: 0 })).conditionsMatched, false);
  assert.equal(runtime.evaluateWorkflow(numeric, event(), context({ estimated_value: 1 })).conditionsMatched, true);
  const empty = definition({ conditions: [{ field: "estimated_value", operator: "is_empty", value: null }] });
  assert.equal(runtime.evaluateWorkflow(empty, event(), context({ estimated_value: null })).conditionsMatched, true);
  assert.equal(runtime.evaluateWorkflow(empty, event(), context({ estimated_value: 0 })).conditionsMatched, false);
});

test("commercial guards stop, wait or narrow actions using current state", () => {
  assert.equal(runtime.evaluateWorkflow(definition(), event(), context({ execution_state: "waiting_for_client", waiting_state: "waiting_for_client" })).decision, "waiting");
  assert.match(runtime.evaluateWorkflow(definition(), event(), context({ recentInboundReply: true })).reason, /răspuns deja/);
  assert.match(runtime.evaluateWorkflow(definition({ trigger: "reply_received" }), event("reply_received"), context()).reason, /răspuns deja/);
  assert.match(runtime.evaluateWorkflow(definition(), event(), context({ lifecycleOpen: false, execution_state: "resolved" })).reason, /închisă/);
  const meeting = runtime.evaluateWorkflow(definition({ actions: [
    { type: "prepare_email", description: "Email", requiresHumanApproval: true },
    { type: "create_internal_task", description: "Task", requiresHumanApproval: true }
  ] }), event(), context({ meetingUpcoming: true }));
  assert.equal(meeting.decision, "proceed");
  assert.equal(meeting.actions[0].decision, "skip");
  assert.equal(meeting.actions[1].decision, "prepare");
});

test("approval and owner guards only prepare review-safe work", () => {
  const approval = runtime.evaluateWorkflow(definition({ actions: [
    { type: "prepare_email", description: "Email", requiresHumanApproval: true },
    { type: "request_approval", description: "Aprobare", requiresHumanApproval: true }
  ] }), event(), context({ execution_state: "approval_required" }));
  assert.equal(approval.actions[0].decision, "skip");
  assert.equal(approval.actions[1].decision, "prepare");
  const owner = runtime.evaluateWorkflow(definition({ actions: [
    { type: "create_internal_task", description: "Task", requiresHumanApproval: true },
    { type: "assign_review", description: "Review", requiresHumanApproval: true }
  ] }), event(), context({ owner: null, execution_state: "owner_missing" }));
  assert.equal(owner.actions[0].decision, "skip");
  assert.equal(owner.actions[1].decision, "prepare");
  assert.match(owner.reason, /Ownership/);
});

test("approval workflow action remains a prepared review task, not a fabricated approval request", () => {
  const source = read("src/lib/workflow-runtime.ts");
  const presentation = read("src/lib/workflow-presentation.ts");
  assert.match(source, /Revizuire pentru aprobare/);
  assert.match(presentation, /nu creează singur o cerere de aprobare/);
});

test("CRM creation observes returned workflow failures without rolling back its primary write", () => {
  const source = read("src/lib/crm/workspace-actions.ts");
  assert.match(source, /const workflowResults = await processCommercialWorkflowEvent/);
  assert.match(source, /workflowResults\.some\(\(result\) => result\.status === "failed"\)/);
  assert.match(source, /Oportunitatea a fost creată\. Automatizările nu au putut fi evaluate/);
});

test("Ask-assisted workflow generation produces an inactive bounded draft", () => {
  const draft = foundation.draftWorkflowFromQuestion({ id: "wf-ai", question: "Creează un workflow pentru follow-up-urile restante", createdBy: "profile-1", createdAt: "2026-08-25T12:00:00.000Z" });
  assert.equal(draft.status, "draft");
  assert.equal(draft.source, "ai_assisted");
  assert.equal(draft.actions.some((action) => action.type === "prepare_email"), true);
  assert.equal(draft.actions.every((action) => action.requiresHumanApproval), true);
});

test("schema enforces tenant scope, RLS, server-only writes and deduplicated event creation", () => {
  const migration = read("supabase/migrations/20260825172929_commercial_workflow_runtime_core.sql");
  assert.match(migration, /unique \(workflow_id, event_key, target_id\)/);
  assert.match(migration, /workflow\.business_id = new\.business_id/);
  assert.match(migration, /opportunity\.business_id = new\.business_id/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /revoke all on table public\.commercial_workflows from public, anon, authenticated/);
  assert.match(migration, /grant select on table public\.commercial_workflow_runs to authenticated/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete).*authenticated/i);
  assert.match(migration, /attempt_count between 1 and 3/);
});

test("hardening migration snapshots declarative definitions and only stores safe effect receipts", () => {
  const migration = read("supabase/migrations/20260827103000_commercial_workflow_runtime_hardening.sql");
  assert.match(migration, /definition_snapshot jsonb/);
  assert.match(migration, /definition_hash text/);
  assert.match(migration, /effect_records jsonb/);
  assert.match(migration, /retry_count smallint/);
  assert.doesNotMatch(migration, /external_email_messages|external_calendar_events|refresh_token|body_text/i);
});

test("server runtime scopes every record and private Google context to actor and tenant", () => {
  const source = read("src/lib/workflow-runtime.ts");
  assert.match(source, /\.eq\("business_id", input\.businessId\)\.eq\("status", "active"\)\.eq\("trigger_type", input\.trigger\)/);
  assert.match(source, /\.eq\("business_id", businessId\)\.eq\("owner_profile_id", profileId\)\.eq\("linked_opportunity_id", targetId\)/);
  assert.match(source, /\.eq\("id", targetId\)\.eq\("business_id", businessId\)/);
  assert.match(source, /createStoredActionPlanForActor/);
  assert.match(source, /deterministicUuid\(`\$\{run\.id\}:\$\{index\}:\$\{decision\.type\}`\)/);
  assert.match(source, /autonomous_external_send: false/);
  assert.doesNotMatch(source, /sendGmailMessage|gmail\.send|calendar\.events\.insert/);
});

test("test runs persist explainability without creating plans or internal effects", () => {
  const source = read("src/lib/workflow-runtime.ts");
  const testFunction = source.slice(source.indexOf("export async function testCommercialWorkflow"), source.indexOf("export async function getCommercialWorkflowWorkspace"));
  assert.match(testFunction, /is_test_run: true/);
  assert.match(testFunction, /actionExecuted: false/);
  assert.doesNotMatch(testFunction, /createStoredActionPlanForActor|communication_notifications/);
  assert.match(source, /status: "failed", failure_category: category/);
  assert.match(source, /Evaluarea nu a putut fi finalizată în siguranță/);
});

test("workflow product surface exposes activation, safe tests and human-readable history", () => {
  const page = read("src/app/(protected)/workflows/page.tsx");
  const navigation = read("src/lib/navigation.ts");
  assert.match(page, /Activează explicit/);
  assert.match(page, /Fără mutații/);
  assert.match(page, /presentWorkflowRunState/);
  assert.match(page, /Istoric de evaluare/);
  assert.match(navigation, /href: "\/workflows"[\s\S]*permission: "settings\.update"/);
});

// Execute the real server runtime and G1 planner against an atomic query fake.
// SQL enforcement is separately exercised by the opt-in local Postgres test below.
const ids = { business: crypto.randomUUID(), profile: crypto.randomUUID(), workflow: crypto.randomUUID(), target: crypto.randomUUID() };
function serverHarness({ actions, conditions = [] } = {}) {
  const now = new Date().toISOString();
  const tables = {
    businesses: [{ id: ids.business, owner_profile_id: ids.profile, response_window_business_days: 3 }],
    business_members: [], commercial_workflow_runs: [], ask_action_plans: [], communication_notifications: [], audit_logs: [],
    commercial_workflows: [{ id: ids.workflow, business_id: ids.business, name: "Workflow original", description: "Original",
      status: "active", trigger_type: "opportunity_created", conditions,
      actions: actions ?? [{ type: "create_internal_task", description: "Primul task", requiresHumanApproval: true }, { type: "create_notification", description: "Notificarea originală", requiresHumanApproval: false }],
      created_by_profile_id: ids.profile, created_at: now, updated_at: now }],
    opportunities: [{ id: ids.target, business_id: ids.business, owner_profile_id: ids.profile, title: "Oportunitate autorizată", status: "new", lifecycle_status: "open", updated_at: now }],
    opportunity_actions: [], opportunity_events: [], opportunity_documents: [], business_audit_events: [], business_approval_requests: [], external_email_messages: [], external_calendar_events: [], organizations: []
  };
  const h = { tables, queries: [], failures: [], permissions: ["settings.update", "actions.create", "documents.generate"], creatorPermissions: ["actions.create", "documents.generate"], authorized: true, currentBusiness: ids.business, before: null };
  h.failNext = (table, operation, predicate = () => true) => h.failures.push({ table, operation, predicate });
  class Query {
    constructor(table) { this.table = table; this.operation = "select"; this.filters = []; this.one = false; this.columns = "*"; }
    select(columns = "*") { this.columns = columns; return this; }
    insert(payload) { this.operation = "insert"; this.payload = payload; return this; }
    update(payload) { this.operation = "update"; this.payload = payload; return this; }
    eq(key, value) { this.filters.push((row) => row[key] === value); return this; }
    neq(key, value) { this.filters.push((row) => row[key] !== value); return this; }
    in(key, values) { this.filters.push((row) => values.includes(row[key])); return this; }
    lt(key, value) { this.filters.push((row) => row[key] < value); return this; }
    gte(key, value) { this.filters.push((row) => row[key] >= value); return this; }
    lte(key, value) { this.filters.push((row) => row[key] <= value); return this; }
    order() { return this; }
    limit(count) { this.count = count; return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
    async execute() {
      h.queries.push(this);
      if (h.before) await h.before(this);
      const failureIndex = h.failures.findIndex((f) => f.table === this.table && f.operation === this.operation && f.predicate(this.payload));
      if (failureIndex >= 0) { h.failures.splice(failureIndex, 1); return { data: null, error: { message: "private database detail", code: "XX000" } }; }
      const rows = tables[this.table];
      let selected;
      if (this.operation === "insert") {
        const row = { id: crypto.randomUUID(), ...(this.table === "ask_action_plans" ? { status: "prepared" } : {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(this.table === "opportunity_events" ? { occurred_at: new Date().toISOString() } : {}), ...structuredClone(this.payload) };
        if (this.table === "commercial_workflow_runs") Object.assign(row, { retry_count: 0, attempt_count: 1, is_test_run: false, effects_idempotent: false,
          evaluation_action_indexes: null, condition_results: [], effect_records: [], updated_at: new Date().toISOString(), ...row });
        const duplicate = rows.some((existing) => this.table === "commercial_workflow_runs" ? existing.workflow_id === row.workflow_id && existing.event_key === row.event_key && existing.target_id === row.target_id
          : this.table === "ask_action_plans" ? existing.business_id === row.business_id && existing.idempotency_key === row.idempotency_key
          : this.table === "communication_notifications" && row.workflow_effect_key != null && existing.business_id === row.business_id && existing.workflow_effect_key === row.workflow_effect_key);
        if (duplicate) return { data: null, error: { code: "23505", message: "unique violation" } };
        rows.push(row); selected = [row];
      } else {
        selected = rows.filter((row) => this.filters.every((matches) => matches(row)));
        if (this.count) selected = selected.slice(0, this.count);
        // Predicates and mutations execute without yielding: persisted CAS analogue.
        if (this.operation === "update") selected.forEach((row) => Object.assign(row, structuredClone(this.payload)));
      }
      const projected = selected.map((row) => this.columns === "*" ? row : Object.fromEntries(this.columns.split(",").map((key) => [key, row[key]])));
      return { data: structuredClone(this.one ? projected[0] ?? null : projected), error: null };
    }
  }
  const client = { from: (table) => new Query(table) };
  const planner = compile("src/lib/ai/action-planner.ts", {
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => client },
    "@/lib/authz/get-authorization-context": { getAuthorizationContext: async () => ({ profileId: h.authorized ? ids.profile : null, permissions: h.permissions }) },
    "@/lib/business/current-business": { getCurrentBusinessForUser: async () => ({ business: { id: h.currentBusiness } }) },
    "@/lib/opportunity-domain": { assertFutureActionDueAt: () => {} },
    "@/lib/workflow-trace": trace
  });
  h.runtime = compile("src/lib/workflow-runtime.ts", {
    "node:crypto": crypto, "@/lib/supabase/admin": { createSupabaseAdminClient: () => client },
    "@/lib/authz/get-authorization-context": { getAuthorizationContext: async () => ({ profileId: h.authorized ? ids.profile : null, permissions: h.permissions }) },
    "@/lib/business/current-business": { getCurrentBusinessForUser: async () => ({ business: { id: h.currentBusiness } }) },
    "@/lib/authz/role-permissions": { businessRolePermissions: { get business_owner() { return h.creatorPermissions; } } },
    "@/lib/authz/roles": { mapDatabaseBusinessRole: () => null },
    "@/lib/commercial-execution": { assessCommercialExecution: (input) => ({ state: !input.lifecycleOpen ? "resolved" : input.preparedWorkState === "prepared" ? "prepared" : "next_action_missing", severity: "attention", recentInboundReply: false }) },
    "@/lib/ai/action-planner": planner,
    "@/lib/workflow-foundation": foundation, "@/lib/workflow-runtime-core": runtime,
    "@/lib/workflow-trigger-registry": registry, "@/lib/workflow-preflight": preflight,
    "@/lib/workflow-playbooks": playbooks, "@/lib/workflow-trace": trace
  });
  h.client = client;
  h.planner = planner;
  h.events = compile("src/lib/workflow-events.ts", { "@/lib/supabase/admin": { createSupabaseAdminClient: () => client }, "@/lib/workflow-runtime": h.runtime, "@/lib/workflow-trigger-registry": registry });
  const authorization = { requirePermission: async () => { if (!h.authorized) throw new Error("forbidden"); return { profileId: ids.profile, permissions: h.permissions }; } };
  const data = { getCurrentBusinessOrDemo: async () => ({ id: h.currentBusiness }), getOpportunityForCurrentBusiness: async () => {
    const row = tables.opportunities.find((item) => item.id === ids.target && item.business_id === h.currentBusiness);
    return row ? { ...structuredClone(row), lifecycleStatus: row.lifecycle_status } : null;
  } };
  h.mutations = compile("src/lib/revenue-workspace/actions.ts", {
    "next/cache": { revalidatePath: () => {} }, "@/lib/workflow-events": h.events,
    "@/lib/authz/require-permission": authorization, "@/lib/billing/paid-access": { requireActivePaidAccess: async () => {} },
    "@/lib/supabase/data": data, "@/lib/supabase/server": { createSupabaseServerClient: () => client },
    "@/lib/supabase/status": { isSupabaseConfigured: true }, "@/lib/opportunity-domain": compile("src/lib/opportunity-domain.ts")
  });
  h.approvals = compile("src/lib/enterprise-governance-internal.ts", {
    "next/cache": { revalidatePath: () => {} }, "@/lib/workflow-events": h.events,
    "@/lib/authz/require-permission": authorization, "@/lib/supabase/admin": { createSupabaseAdminClient: () => client },
    "@/lib/business/current-business": { getCurrentBusinessForUser: async () => ({ business: { id: h.currentBusiness } }) }
  });
  h.start = () => h.runtime.processCommercialWorkflowEvent({ businessId: ids.business, targetId: ids.target, trigger: "opportunity_created", eventKey: "event-original" });
  h.recover = () => h.runtime.recoverCommercialWorkflowRun(tables.commercial_workflow_runs[0].id);
  h.run = () => tables.commercial_workflow_runs[0];
  return h;
}

for (const status of ["completed", "prepared", "blocked", "cancelled", "pending"]) {
  test(`recovery refuses ${status} runs without changing attempts or effects`, async () => {
    const h = serverHarness(); await h.start(); h.run().status = status;
    const before = JSON.stringify(h.tables);
    assert.equal((await h.recover()).recovered, false);
    assert.equal(JSON.stringify(h.tables), before);
  });
}

test("failed run is claimed once, reuses its ID, G1 plan and original definition after edit", async () => {
  const h = serverHarness({ conditions: [{ field: "execution_state", operator: "equals", value: "next_action_missing" }] });
  h.failNext("communication_notifications", "insert");
  assert.equal((await h.start())[0].status, "failed");
  const id = h.run().id; const planId = h.tables.ask_action_plans[0].id;
  assert.equal(h.run().effect_records.length, 1);
  h.tables.commercial_workflows[0].actions = [{ type: "create_internal_task", description: "EDITED", requiresHumanApproval: true }];
  h.tables.commercial_workflows[0].status = "paused";
  const retried = await h.recover();
  assert.equal(retried.status, "prepared"); assert.equal(retried.runId, id);
  assert.equal(h.tables.commercial_workflow_runs.length, 1);
  assert.equal(h.tables.ask_action_plans.length, 1); assert.equal(h.tables.ask_action_plans[0].id, planId);
  assert.equal(h.tables.communication_notifications[0].body, "Notificarea originală");
  assert.equal(h.run().effect_records[0].status, "replayed");
  assert.equal(h.run().retry_count, 1); assert.equal(h.run().attempt_count, 2);
  assert.equal(h.run().failure_category, null);
});

test("fresh evaluating cannot be stolen, stale evaluating is claimed", async () => {
  const h = serverHarness(); await h.start(); h.run().status = "evaluating";
  assert.equal((await h.recover()).recovered, false);
  h.run().updated_at = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  assert.equal((await h.recover()).recovered, true);
  assert.equal(h.run().status, "prepared");
  assert.equal(h.tables.communication_notifications.length, 1);
  assert.equal(h.tables.ask_action_plans.length, 1);
});

test("competing claims cannot both own the same run", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
  const results = await Promise.all([h.recover(), h.recover()]);
  assert.equal(results.filter((result) => result.recovered).length, 1);
  assert.equal(h.run().retry_count, 1);
  assert.equal(h.tables.communication_notifications.length, 1);
});

test("a heartbeat between reading and claiming a stale run defeats the claim", async () => {
  const h = serverHarness(); await h.start(); h.run().status = "evaluating";
  h.run().updated_at = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  h.before = async (query) => {
    if (query.table === "commercial_workflow_runs" && query.payload?.recovery_started_at) h.run().updated_at = new Date().toISOString();
  };
  assert.equal((await h.recover()).recovered, false); assert.equal(h.run().retry_count, 0);
});

test("notification committed without receipt is replayed by DB identity", async () => {
  const h = serverHarness();
  // Simulate process death after both effects committed but before receipts persisted.
  await h.start(); h.run().effect_records = []; h.run().status = "evaluating";
  h.run().updated_at = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const notificationId = h.tables.communication_notifications[0].id;
  await h.recover();
  assert.equal(h.tables.communication_notifications.length, 1);
  assert.equal(h.tables.communication_notifications[0].id, notificationId);
  assert.equal(h.tables.ask_action_plans.length, 1);
  assert.ok(h.run().effect_records.every((receipt) => receipt.status === "replayed"));
});

test("recovery failure preserves successful receipts and bounded retry metadata", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
  const receiptId = h.run().effect_records[0].id;
  h.failNext("communication_notifications", "insert");
  assert.equal((await h.recover()).status, "failed");
  assert.equal(h.run().effect_records[0].id, receiptId);
  assert.equal(h.run().retry_count, 1); assert.equal(h.run().failure_category, "internal_failure");
  assert.equal((await h.recover()).status, "prepared");
  assert.equal(h.run().retry_count, 2);
  h.run().status = "failed";
  assert.equal((await h.recover()).recovered, false);
  assert.equal(h.run().retry_count, 2);
});

test("an expired original owner cannot overwrite a recovered terminal state", async () => {
  const h = serverHarness();
  let release; let reached;
  const waitForEffect = new Promise((resolve) => { reached = resolve; });
  const paused = new Promise((resolve) => { release = resolve; });
  let pauseOnce = true;
  h.before = async (query) => {
    if (pauseOnce && query.table === "communication_notifications" && query.operation === "insert") {
      pauseOnce = false; reached(); await paused;
    }
  };
  const original = h.start(); await waitForEffect;
  h.run().updated_at = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  assert.equal((await h.recover()).status, "prepared");
  const terminal = JSON.stringify(h.run());
  release(); assert.equal((await original)[0].status, "ownership_lost");
  assert.equal(JSON.stringify(h.run()), terminal);
  assert.equal(h.tables.communication_notifications.length, 1);
  assert.equal(h.tables.ask_action_plans.length, 1);
});

test("snapshot/hash corruption fails closed before claiming or creating effects", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
  h.run().definition_snapshot.actions[0].description = "Changed snapshot";
  await assert.rejects(h.recover(), /workflow_snapshot_invalid/);
  assert.equal(h.run().retry_count, 0); assert.equal(h.tables.communication_notifications.length, 0);
});

test("tenant and requester authority are derived on server, not from the run ID", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
  h.currentBusiness = crypto.randomUUID(); await assert.rejects(h.recover(), /workflow_run_not_found/);
  h.currentBusiness = ids.business; h.authorized = false; await assert.rejects(h.recover(), /workflow_forbidden/);
  h.authorized = true; h.permissions = ["settings.update"]; await assert.rejects(h.recover(), /workflow_forbidden/);
  assert.equal(h.run().retry_count, 0);
});

test("creator permission revocation and lookup errors fail without further effects", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
  h.creatorPermissions = [];
  assert.equal((await h.recover()).status, "failed");
  assert.equal(h.run().failure_category, "permission_changed");
  assert.equal(h.run().effect_records.length, 1); assert.equal(h.tables.communication_notifications.length, 0);
  h.creatorPermissions = ["actions.create"];
  h.failNext("businesses", "select");
  assert.equal((await h.recover()).status, "failed");
  assert.equal(h.tables.communication_notifications.length, 0);
});

test("current safety guards narrow recovery without deleting successful effects", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
  h.tables.opportunities[0].lifecycle_status = "closed";
  assert.equal((await h.recover()).status, "blocked");
  assert.equal(h.run().effect_records.length, 1);
  assert.equal(h.tables.communication_notifications.length, 0);
});

test("audit or finalization failure is recoverable without recreating effects", async () => {
  for (const failure of ["audit", "finalization"]) {
    const h = serverHarness();
    if (failure === "audit") h.failNext("audit_logs", "insert");
    else h.failNext("commercial_workflow_runs", "update", (patch) => patch.status === "prepared");
    assert.equal((await h.start())[0].status, "failed");
    assert.equal(h.run().effect_records.length, 2);
    assert.equal((await h.recover()).status, "prepared");
    assert.equal(h.tables.ask_action_plans.length, 1); assert.equal(h.tables.communication_notifications.length, 1);
  }
});

test("legacy unreceipted notifications are refused, legacy G1-only runs remain recoverable", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start(); h.run().effects_idempotent = false;
  assert.equal((await h.recover()).recovered, false); assert.equal(h.run().retry_count, 0);
  const g1 = serverHarness({ actions: [{ type: "create_internal_task", description: "Task", requiresHumanApproval: true }] });
  g1.failNext("audit_logs", "insert"); await g1.start(); g1.run().effects_idempotent = false;
  assert.equal((await g1.recover()).status, "prepared"); assert.equal(g1.tables.ask_action_plans.length, 1);
});

test("recovery action accepts only the run ID and does not expose raw errors", async () => {
  const source = read("src/lib/workflow-actions.ts");
  const actions = compile("src/lib/workflow-actions.ts", { "@/lib/workflow-runtime": { recoverCommercialWorkflowRun: async (id) => { assert.equal(id, ids.workflow); throw new Error("secret database error"); } } });
  const form = new FormData(); form.set("runId", ids.workflow); form.set("status", "completed"); form.set("businessId", crypto.randomUUID());
  const result = await actions.recoverWorkflowRun(form);
  assert.equal(result.recovered, false); assert.doesNotMatch(JSON.stringify(result), /secret database error/);
  assert.match(source, /recoverCommercialWorkflowRun\(text\(formData, "runId", 80\)\)/);
});

test("recovery migration enforces nullable notification identity and protects server metadata", () => {
  const sql = read("supabase/migrations/20260827233324_commercial_workflow_recovery.sql");
  assert.match(sql, /create unique index[\s\S]*\(business_id, workflow_effect_key\)[\s\S]*where workflow_effect_key is not null/);
  assert.match(sql, /new\.workflow_effect_key is distinct from old\.workflow_effect_key/);
  assert.match(sql, /new\.business_id is distinct from old\.business_id/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete).*authenticated|disable row level security/i);
});

// Opt-in only: an isolated, disposable Postgres container, never the app database.
// REVENEW_WORKFLOW_TEST_CONTAINER=revenew-g2ah2-postgres node --test <this file>
test("Postgres enforces notification uniqueness, CAS ownership, fencing and ACLs", { skip: !process.env.REVENEW_WORKFLOW_TEST_CONTAINER }, async () => {
  const container = process.env.REVENEW_WORKFLOW_TEST_CONTAINER;
  assert.equal(container, "revenew-g2ah2-postgres");
  const execute = promisify(execFile);
  const dbName = "workflow_test_" + crypto.randomUUID().replaceAll("-", "");
  const psql = async (sql, database = dbName) => {
    const { stdout } = await execute("docker", ["exec", "-i", container, "psql", "-X", "-h", "/tmp", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], { maxBuffer: 1024 * 1024 });
    return stdout.trim();
  };
  await psql(`create database ${dbName}`, "postgres");
  const business = crypto.randomUUID(), profile = crypto.randomUUID(), target = crypto.randomUUID(), workflow = crypto.randomUUID(), run = crypto.randomUUID(), key = crypto.randomUUID();
  const sqlString = (value) => "'" + value.replaceAll("'", "''") + "'";
  const oldNotifications = read("supabase/migrations/20260824122213_communication_os_v1.sql");
  try {
    await psql(`
      do $$ begin
        if not exists (select from pg_roles where rolname='anon') then create role anon; end if;
        if not exists (select from pg_roles where rolname='authenticated') then create role authenticated; end if;
        if not exists (select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
      end $$;
      grant usage on schema public to authenticated, service_role;
      create table public.profiles(id uuid primary key);
      create table public.businesses(id uuid primary key, owner_profile_id uuid references profiles);
      create table public.opportunities(id uuid primary key, business_id uuid references businesses);
      create function public.current_profile_id() returns uuid language sql stable as $$ select nullif(current_setting('app.profile_id', true),'')::uuid $$;
      create function public.is_business_member(uuid) returns boolean language sql stable as $$ select $1 = nullif(current_setting('app.business_id', true),'')::uuid $$;
      create function public.is_business_owner(uuid) returns boolean language sql stable as $$ select public.is_business_member($1) $$;
      grant select on public.businesses, public.opportunities to service_role;
    `);
    await psql(oldNotifications.slice(oldNotifications.indexOf("create table if not exists public.communication_notifications"), oldNotifications.indexOf("create or replace function public.validate_communication_os_scope")));
    await psql(`alter table public.communication_notifications enable row level security;
      grant select, update on public.communication_notifications to authenticated;
      grant select, insert, update, delete on public.communication_notifications to service_role;
      ${oldNotifications.slice(oldNotifications.indexOf('create policy "communication_notifications_owner_select"'), oldNotifications.indexOf("comment on table public.communication_drafts"))}`);
    for (const name of ["20260825172929_commercial_workflow_runtime_core.sql", "20260826113000_workflow_service_role_acl.sql", "20260827103000_commercial_workflow_runtime_hardening.sql", "20260827233324_commercial_workflow_recovery.sql", "20260827235327_commercial_workflow_source_event.sql"]) await psql(read("supabase/migrations/" + name));
    await psql(`insert into public.profiles values ('${profile}');
      insert into public.businesses values ('${business}', '${profile}');
      insert into public.opportunities values ('${target}', '${business}');
      insert into public.commercial_workflows(id,business_id,name,status,trigger_type,actions,created_by_profile_id)
      values ('${workflow}','${business}','SQL recovery','active','opportunity_created','[{"type":"create_notification"}]','${profile}');
      insert into public.commercial_workflow_runs(id,workflow_id,business_id,trigger_type,event_key,target_id,status)
      values ('${run}','${workflow}','${business}','opportunity_created','event-sql','${target}','failed');`);
    const insertNotification = `insert into public.communication_notifications(business_id,recipient_profile_id,kind,title,workflow_effect_key) values ('${business}','${profile}','approval_needed','Internal','${key}') returning id`;
    const racingNotifications = await Promise.allSettled([psql(`begin; ${insertNotification}; select pg_sleep(0.15); commit;`), psql(insertNotification)]);
    assert.equal(racingNotifications.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(await psql(`select count(*) from public.communication_notifications where workflow_effect_key='${key}'`), "1");
    await psql(`insert into public.communication_notifications(business_id,recipient_profile_id,kind,title) values
      ('${business}','${profile}','approval_needed','Ordinary'), ('${business}','${profile}','approval_needed','Ordinary');`);
    assert.equal(await psql("select count(*) from public.communication_notifications where workflow_effect_key is null"), "2");
    const updated = await psql(`select updated_at from public.commercial_workflow_runs where id='${run}'`);
    const claim = `update public.commercial_workflow_runs set status='evaluating',retry_count=retry_count+1,attempt_count=attempt_count+1,recovery_started_at=now(),updated_at=now(),completed_at=null
      where id='${run}' and business_id='${business}' and status='failed' and retry_count=0 and attempt_count=1 and updated_at=${sqlString(updated)}::timestamptz returning 'claimed'`;
    const claims = await Promise.all([psql(`begin; ${claim}; select pg_sleep(0.15); commit;`), psql(claim)]);
    assert.equal(claims.filter((output) => output.includes("claimed")).length, 1);
    assert.equal(await psql(`update public.commercial_workflow_runs set status='failed' where id='${run}' and business_id='${business}' and status='evaluating' and retry_count=0 returning id`), "UPDATE 0");
    assert.equal(await psql(`update public.commercial_workflow_runs set retry_count=2 where id='${run}' and business_id='${business}' and status='evaluating' and retry_count=1 and updated_at < now()-interval '15 minutes' returning id`), "UPDATE 0");
    await psql(`update public.commercial_workflow_runs set updated_at=now()-interval '16 minutes' where id='${run}'`);
    assert.match(await psql(`update public.commercial_workflow_runs set retry_count=2,attempt_count=3,status='evaluating',updated_at=now() where id='${run}' and business_id='${business}' and status='evaluating' and retry_count=1 and updated_at < now()-interval '15 minutes' returning id`), new RegExp(run));
    const tenantSession = `set app.business_id='${business}'; set app.profile_id='${profile}'; set role authenticated;`;
    assert.equal((await psql(`${tenantSession} select count(*) from public.communication_notifications;`)).split("\n").at(-1), "3");
    await psql(`${tenantSession} update public.communication_notifications set read_at=now();`);
    await assert.rejects(psql(`${tenantSession} update public.communication_notifications set workflow_effect_key=null where workflow_effect_key='${key}'`));
    await assert.rejects(psql(`${tenantSession} update public.communication_notifications set workflow_effect_key='${crypto.randomUUID()}' where workflow_effect_key is null`));
    await assert.rejects(psql(`${tenantSession} update public.commercial_workflow_runs set retry_count=0 where id='${run}'`));
    await assert.rejects(psql(`${tenantSession} ${insertNotification}`));
    assert.equal((await psql(`set app.business_id='${crypto.randomUUID()}'; set app.profile_id='${profile}'; set role authenticated; select count(*) from public.commercial_workflow_runs;`)).split("\n").at(-1), "0");
    // PostgreSQL JSONB key ordering must not invalidate the stored definition hash.
    const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
    h.run().definition_snapshot = JSON.parse(await psql(`select ${sqlString(JSON.stringify(h.run().definition_snapshot))}::jsonb`));
    assert.equal((await h.recover()).status, "prepared");
  } finally {
    await psql(`drop database ${dbName}`, "postgres");
  }
});

test("lost receipt checkpoint and failure-write errors leave effects safe for stale recovery", async () => {
  const h = serverHarness();
  h.failNext("commercial_workflow_runs", "update", (patch) => patch.effect_records?.length === 1 && !patch.status);
  h.failNext("commercial_workflow_runs", "update", (patch) => patch.status === "failed");
  await assert.rejects(h.start(), /workflow_run_failure_persist_failed/);
  assert.equal(h.run().status, "evaluating");
  assert.equal(h.run().effect_records.length, 0);
  assert.equal(h.tables.ask_action_plans.length, 1);
  h.run().updated_at = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  assert.equal((await h.recover()).status, "prepared");
  assert.equal(h.tables.ask_action_plans.length, 1);
  assert.equal(h.run().effect_records[0].status, "replayed");
});

test("recovery revalidates target tenant and never creates effects for an unavailable target", async () => {
  const h = serverHarness(); h.failNext("communication_notifications", "insert"); await h.start();
  h.tables.opportunities[0].business_id = crypto.randomUUID();
  assert.equal((await h.recover()).status, "failed");
  assert.equal(h.run().failure_category, "record_unavailable");
  assert.equal(h.run().effect_records.length, 1);
  assert.equal(h.tables.communication_notifications.length, 0);
});

function stageHarness(options = {}) {
  const h = serverHarness(options);
  h.tables.commercial_workflows[0].trigger_type = "stage_changed";
  h.changeStage = (stage = "reviewed") => { const form = new FormData(); form.set("status", stage); return h.mutations.updatePipelineStatus(ids.target, form); };
  return h;
}
function approvalHarness(entityType = "opportunity", targetId = ids.target) {
  const h = serverHarness(); h.tables.commercial_workflows[0].trigger_type = "approval_completed";
  const approval = { id: crypto.randomUUID(), business_id: ids.business, status: "pending", requested_by_profile_id: ids.profile,
    entity_type: entityType, entity_id: targetId, safe_payload: {}, expires_at: new Date(Date.now() + 3600000).toISOString() };
  h.tables.business_approval_requests.push(approval); h.approval = approval;
  return h;
}

test("G2B registry distinguishes the contract from three authoritative wired sources", () => {
  assert.equal(Object.keys(registry.workflowTriggerRegistry).length, 8);
  assert.deepEqual(Object.values(registry.workflowTriggerRegistry).filter((entry) => entry.automatic).map((entry) => entry.value).sort(),
    ["approval_completed", "opportunity_created", "stage_changed"]);
  for (const trigger of ["reply_received", "email_received", "next_action_overdue", "meeting_upcoming", "scheduled_review"]) {
    const entry = registry.workflowTriggerCapability(trigger);
    assert.equal(entry.automatic, false); assert.equal(entry.label, "Trigger disponibil ulterior"); assert.ok(entry.explanation);
  }
  assert.match(registry.workflowTriggerCapability("reply_received").explanation, /nu dovedește un răspuns/);
});

test("G2B real stage transition persists one canonical event and duplicate delivery reuses its run", async () => {
  const h = stageHarness(); assert.equal((await h.changeStage()).ok, true);
  assert.equal(h.tables.opportunity_events.length, 1); assert.equal(h.tables.commercial_workflow_runs.length, 1);
  const event = h.tables.opportunity_events[0]; const run = h.run();
  assert.equal(event.metadata.previous_status, "new"); assert.equal(event.metadata.next_status, "reviewed");
  assert.equal(run.source_event.id, event.id); assert.equal(run.source_event.occurredAt, event.occurred_at);
  assert.equal(run.source_event.origin, "user"); assert.equal(run.source_event.actorProfileId, ids.profile);
  assert.equal(run.event_key, `opportunity-event:${event.id}:stage_changed`);
  await h.events.dispatchStageChangedEvent(ids.business, event.id); await h.events.dispatchStageChangedEvent(ids.business, event.id);
  assert.equal(h.tables.commercial_workflow_runs.length, 1); assert.equal(h.tables.ask_action_plans.length, 1);
});

test("G2B same-stage, description edits and lifecycle-only reopening never emit stage_changed", async () => {
  const h = stageHarness();
  assert.equal((await h.changeStage("new")).unchanged, true);
  h.tables.opportunities[0].summary = "Description edited";
  assert.equal((await h.changeStage("new")).unchanged, true);
  h.tables.opportunities[0].lifecycle_status = "archived";
  assert.equal((await h.changeStage("new")).ok, true);
  assert.equal(h.tables.opportunity_events.length, 0); assert.equal(h.tables.commercial_workflow_runs.length, 0);
});

test("G2B competing stage writes do not emit duplicate transitions", async () => {
  const h = stageHarness();
  const results = await Promise.all([h.changeStage(), h.changeStage()]);
  assert.ok(results.some((result) => result.ok));
  assert.equal(h.tables.opportunity_events.length, 1); assert.equal(h.tables.commercial_workflow_runs.length, 1);
});

test("G2B primary stage mutation survives event persistence or workflow failure", async () => {
  for (const table of ["opportunity_events", "ask_action_plans"]) {
    const h = stageHarness(); h.failNext(table, "insert");
    const result = await h.changeStage(); assert.equal(result.ok, true);
    assert.equal(h.tables.opportunities[0].status, "reviewed");
    assert.match(result.message, /Etapa a fost salvată/);
  }
});

test("G2B stage sources are tenant-scoped and missing target relationships fail closed", async () => {
  const h = stageHarness(); await h.changeStage(); const event = h.tables.opportunity_events[0];
  assert.equal((await h.events.dispatchStageChangedEvent(crypto.randomUUID(), event.id)).failed, true);
  h.tables.opportunities[0].business_id = crypto.randomUUID();
  assert.equal((await h.events.dispatchStageChangedEvent(ids.business, event.id)).failed, true);
  assert.equal(h.tables.commercial_workflow_runs.length, 1);
});

test("G2B workflow origins and causation suppress self- and cross-workflow chains", async () => {
  const h = stageHarness(); await h.changeStage();
  const event = h.tables.opportunity_events[0];
  event.metadata.origin = "workflow"; event.metadata.workflow_run_id = h.run().id;
  for (let index = 0; index < 5; index++) assert.equal((await h.events.dispatchStageChangedEvent(ids.business, event.id)).suppressed, true);
  const source = { ...h.run().source_event, origin: "workflow", causationRunId: h.run().id };
  assert.equal((await h.runtime.processCommercialWorkflowEvent({ businessId: ids.business, targetId: ids.target, trigger: "stage_changed", eventKey: h.run().event_key, sourceEvent: source })).length, 0);
  assert.equal(h.tables.commercial_workflow_runs.length, 1);
  assert.equal(registry.mayDispatchWorkflowEvent("stage_changed", { ...source, origin: "user" }), false);
});

test("G2B source facts are minimized and cannot be delivered with a different identity", async () => {
  const h = stageHarness();
  const source = { kind: "opportunity_event", id: crypto.randomUUID(), occurredAt: new Date().toISOString(),
    origin: "user", previousStage: "new", nextStage: "reviewed", emailBody: "private email", token: "private token" };
  const eventKey = registry.workflowEventKey("stage_changed", source);
  await h.runtime.processCommercialWorkflowEvent({ businessId: ids.business, targetId: ids.target, trigger: "stage_changed", eventKey, sourceEvent: source });
  assert.doesNotMatch(JSON.stringify(h.run().source_event), /private email|private token|emailBody|token/);
  await assert.rejects(h.runtime.processCommercialWorkflowEvent({ businessId: ids.business, targetId: ids.target, trigger: "stage_changed", eventKey: "different", sourceEvent: source }), /workflow_source_identity_invalid/);
});

test("G2B stage facts survive failure before evaluation and a newer current stage", async () => {
  const h = stageHarness({ conditions: [{ field: "stage", operator: "equals", value: "reviewed" }] });
  let failContext = true;
  h.before = async (query) => {
    if (failContext && query.table === "opportunities" && query.columns.includes("organization_id")) { failContext = false; h.failNext("opportunities", "select"); }
  };
  await h.changeStage(); assert.equal(h.run().status, "failed"); assert.equal(h.run().evaluation_action_indexes, null);
  h.tables.opportunities[0].status = "contacted";
  assert.equal((await h.recover()).status, "prepared");
  assert.equal(h.run().condition_results[0].observedValue, "reviewed");
  assert.equal(h.run().source_event.nextStage, "reviewed");
});

test("G2B approval decision emits only after approval, remains deduplicated after consumption", async () => {
  const h = approvalHarness();
  assert.equal((await h.approvals.decideGovernedApproval(h.approval.id, "approved")).ok, true);
  assert.equal(h.approval.status, "approved"); assert.equal(h.run().source_event.kind, "approval");
  assert.equal(h.run().event_key, `approval:${h.approval.id}:approved`);
  h.approval.status = "executed";
  await h.events.dispatchApprovalCompletedEvent(ids.business, h.approval.id);
  assert.equal(h.tables.commercial_workflow_runs.length, 1);
});

test("G2B rejected, expired and self-approved dual-control decisions do not dispatch", async () => {
  for (const scenario of ["rejected", "expired", "dual_control"]) {
    const h = approvalHarness();
    if (scenario === "expired") h.approval.expires_at = new Date(Date.now() - 1000).toISOString();
    if (scenario === "dual_control") h.approval.safe_payload.dual_control = true;
    await h.approvals.decideGovernedApproval(h.approval.id, scenario === "rejected" ? "rejected" : "approved");
    assert.equal(h.tables.commercial_workflow_runs.length, 0);
  }
});

test("G2B document approval resolves its opportunity within the same tenant", async () => {
  const documentId = crypto.randomUUID(); const h = approvalHarness("opportunity_document", documentId);
  h.tables.opportunity_documents.push({ id: documentId, business_id: ids.business, opportunity_id: ids.target });
  await h.approvals.decideGovernedApproval(h.approval.id, "approved");
  assert.equal(h.run().target_id, ids.target);
  h.tables.opportunity_documents[0].business_id = crypto.randomUUID();
  assert.equal((await h.events.dispatchApprovalCompletedEvent(ids.business, h.approval.id)).failed, true);
  assert.equal(h.tables.commercial_workflow_runs.length, 1);
});

test("G2B workflow failure does not roll back a valid approval", async () => {
  const h = approvalHarness(); h.failNext("ask_action_plans", "insert");
  const result = await h.approvals.decideGovernedApproval(h.approval.id, "approved");
  assert.equal(result.ok, true); assert.equal(h.approval.status, "approved"); assert.equal(h.run().status, "failed");
  assert.match(result.message, /Decizia a fost salvată/);
});

test("G2B every curated template creates an authorized inactive draft and can activate explicitly", async () => {
  for (const template of playbooks.workflowPlaybooks) {
    const h = serverHarness(); const id = await h.runtime.createCommercialWorkflowFromPlaybook(template.id);
    const draft = h.tables.commercial_workflows.find((item) => item.id === id);
    assert.equal(draft.status, "draft"); assert.equal(draft.activated_at, undefined);
    assert.equal(h.tables.commercial_workflow_runs.length, 0);
    await h.runtime.setCommercialWorkflowStatus(id, "active"); assert.equal(draft.status, "active");
    assert.equal(h.tables.commercial_workflow_runs.length, 0);
  }
});

test("G2B activation rejects unavailable triggers, invalid definitions and missing creator authority", async () => {
  for (const scenario of ["trigger", "actions", "permission", "control", "configuration"]) {
    const h = serverHarness(); const row = h.tables.commercial_workflows[0]; row.status = "draft";
    if (scenario === "trigger") row.trigger_type = "next_action_overdue";
    if (scenario === "actions") row.actions = [];
    if (scenario === "permission") h.creatorPermissions = [];
    if (scenario === "control") row.actions[0].requiresHumanApproval = false;
    if (scenario === "configuration") row.actions[0].configuration = { endpoint: "external" };
    await assert.rejects(h.runtime.setCommercialWorkflowStatus(ids.workflow, "active"));
    assert.equal(row.status, "draft");
  }
});

test("G2B activation CAS rejects a concurrent edit after preflight", async () => {
  const h = serverHarness(); h.tables.commercial_workflows[0].status = "draft";
  h.before = async (query) => { if (query.table === "commercial_workflows" && query.payload?.status === "active") h.tables.commercial_workflows[0].updated_at = "changed"; };
  await assert.rejects(h.runtime.setCommercialWorkflowStatus(ids.workflow, "active"), /workflow_status_conflict/);
  assert.equal(h.tables.commercial_workflows[0].status, "draft");
});

test("G2B preflight exposes control, conditions, target and verified permissions", () => {
  const template = playbooks.workflowPlaybooks[1];
  const draft = foundation.createWorkflowDraft({ ...template, createdBy: ids.profile });
  const summary = preflight.workflowActivationPreflight(draft, ["actions.create", "documents.generate"]);
  assert.equal(summary.canActivate, true); assert.ok(summary.target); assert.ok(summary.trigger);
  assert.equal(summary.actions.length, 2); assert.equal(summary.conditions.length, 1);
  assert.match(summary.externalEffect, /nu este modificat automat/);
  assert.match(summary.approval, /confirmare/);
});

test("G2B run trace uses original definition, source and actual receipts, never edited action labels", async () => {
  const h = stageHarness(); await h.changeStage();
  h.tables.commercial_workflows[0].name = "Edited name";
  h.tables.commercial_workflows[0].actions = [{ type: "prepare_email" }];
  const model = trace.workflowRunTrace(h.run());
  assert.equal(model.snapshotName, "Workflow original"); assert.ok(model.hash); assert.equal(model.effects.length, 2);
  assert.equal(model.source.previousStage, "new"); assert.equal(model.source.nextStage, "reviewed");
  assert.equal(model.actions.includes("Pregătește email"), false);
  h.run().status = "failed"; await h.recover();
  assert.equal(trace.workflowRunTrace(h.run()).effects[0].result, "Reutilizat");
});

test("G2B G1 execution keeps run provenance and does not cascade into another workflow", async () => {
  const h = stageHarness(); await h.changeStage();
  const plan = h.tables.ask_action_plans[0];
  const result = await h.planner.approveAskActionPlan(plan.id, plan.proposal);
  assert.equal(result.ok, true); assert.equal(h.tables.opportunity_actions.length, 1);
  const audit = h.tables.audit_logs.find((item) => item.action === "ask_action_executed");
  assert.equal(audit.metadata.origin, "workflow"); assert.equal(audit.metadata.workflow_run_id, h.run().id);
  assert.equal(h.tables.commercial_workflow_runs.length, 1);
  assert.equal(plan.result_entity_id, h.tables.opportunity_actions[0].id);
});

test("G2B workflow plan viewer preserves G1 creator privacy", async () => {
  const h = stageHarness(); await h.changeStage();
  assert.equal((await h.runtime.getCommercialWorkflowEditor(ids.workflow, h.run().id)).plans.length, 1);
  h.tables.ask_action_plans[0].created_by_profile_id = crypto.randomUUID();
  assert.equal((await h.runtime.getCommercialWorkflowEditor(ids.workflow, h.run().id)).plans.length, 0);
});

