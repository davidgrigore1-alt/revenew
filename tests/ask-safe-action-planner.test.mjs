import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
function compilePlanner(aliases = {}, Clock = Date) {
  const filename = path.resolve("src/lib/ai/action-planner.ts");
  const output = ts.transpileModule(read(filename), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const domainModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(read("src/lib/opportunity-domain.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: domainModule.exports, module: domainModule, Date: Clock, Intl });
  vm.runInNewContext(output, { exports: module.exports, module, require: (name) => aliases[name] ?? (name === "@/lib/opportunity-domain" ? domainModule.exports : {}), Date: Clock }, { filename });
  return module.exports;
}

const planner = compilePlanner();

test("PASS I explicit deadlines use Bucharest time, including DST", () => {
  const winter = planner.proposalForIntent("create_task", "Creează task pe 2027-01-12 la 14:30");
  const summer = planner.proposalForIntent("update_next_action", "Mută următoarea acțiune pe 2027-08-12 la 14:30");
  assert.equal(winter.dueAt, "2027-01-12T12:30:00.000Z");
  assert.equal(summer.dueAt, "2027-08-12T11:30:00.000Z");
});

test("PASS I G1 rejects a past deadline before any claim or mutation", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const writes = [];
  const plan = { id, action_type: "create_task", status: "prepared", evidence: [], target_type: "opportunity", target_id: id, business_id: id };
  const client = { from() { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: plan }), update(value) { writes.push(value); return this; } }; } };
  const isolated = compilePlanner({
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => client },
    "@/lib/authz/get-authorization-context": { getAuthorizationContext: async () => ({ profileId: id, permissions: ["actions.create"] }) },
    "@/lib/business/current-business": { getCurrentBusinessForUser: async () => ({ business: { id } }) }
  });
  await assert.rejects(isolated.approveAskActionPlan(id, { title: "Revizuiește agenda", dueAt: "2020-01-01T12:00:00Z" }), /ask_action_due_future_required/);
  assert.equal(writes.length, 0);
});

test("Ask action intents are bounded to the supported safe families", () => {
  assert.equal(planner.classifyAskActionIntent("Creează un task să sun clientul joi"), "create_task");
  assert.equal(planner.classifyAskActionIntent("Mută următoarea acțiune pe vineri"), "update_next_action");
  assert.equal(planner.classifyAskActionIntent("Atribuie responsabilul lui Andrei Pop"), "assign_owner");
  assert.equal(planner.classifyAskActionIntent("Adaugă o notă că bugetul este confirmat"), "add_note");
  assert.equal(planner.classifyAskActionIntent("Pregătește un email de follow-up"), "prepare_email");
  assert.equal(planner.classifyAskActionIntent("Actualizează statusul la revizuit"), "update_opportunity_field");
  assert.equal(planner.classifyAskActionIntent("Șterge baza de date"), null);
  assert.equal(planner.riskFor("create_task"), "low");
  assert.equal(planner.riskFor("prepare_email"), "review");
  assert.equal(planner.riskFor("update_opportunity_field"), "review");
});

test("create_notification remains a canonical typed internal action", () => {
  const types = read("src/lib/ai/copilot-types.ts");
  const source = read("src/lib/ai/action-planner.ts");
  assert.match(types, /actionType\?:[^;]+create_notification/);
  assert.match(types, /notification_draft/);
  assert.match(source, /type === "create_notification" \? "notification_draft"/);
  assert.match(source, /actionType: type/);
  assert.doesNotMatch(source, /actionType: type === "create_notification" \? undefined/);
});
test("task and note proposals are bounded editable contracts", () => {
  const task = planner.proposalForIntent("create_task", "Creează un task să sun clientul joi");
  assert.match(task.title, /sun clientul/i);
  assert.equal(task.priority, "medium");
  assert.ok(Date.parse(task.dueAt));
  const note = planner.proposalForIntent("add_note", "Adaugă o notă că bugetul este confirmat");
  assert.match(note.note, /bugetul este confirmat/i);
  assert.equal("sql" in note, false);
});

test("planner persistence is tenant-owned, non-client-writable and replay safe", () => {
  const migration = read("supabase/migrations/20260825120000_ask_safe_action_plans.sql");
  const source = read("src/lib/ai/action-planner.ts");
  assert.match(migration, /created_by_profile_id = public\.current_profile_id\(\)/);
  assert.match(migration, /revoke all on table public\.ask_action_plans from authenticated/);
  assert.match(migration, /grant select on table public\.ask_action_plans to authenticated/);
  assert.match(source, /\.eq\("business_id", current\.business\.id\)\.eq\("created_by_profile_id", authorization\.profileId\)/);
  assert.match(source, /\.eq\("status", "prepared"\)\.select\("id"\)\.maybeSingle\(\)/);
  assert.match(source, /if \(plan\.status === "executed"\).*replay: true/);
});

test("execution revalidates stale targets, workspace owners and safe fields", () => {
  const source = read("src/lib/ai/action-planner.ts");
  assert.match(source, /expected_target_updated_at/);
  assert.match(source, /ask_action_stale/);
  assert.match(source, /validMember\(plan\.business_id, proposal\.ownerProfileId\)/);
  assert.match(source, /\["status","recommended_action","deadline"\]/);
  assert.match(source, /statusValues\.has/);
  assert.doesNotMatch(source, /from\(proposal|rpc\(proposal|eval\(|new Function/);
});

test("approval UI is explicit, editable and never sends email autonomously", () => {
  const ui = read("src/components/intelligence/CopilotConversation.tsx");
  const route = read("src/app/api/ai/action-plans/[planId]/approve/route.ts");
  assert.match(ui, /Aprobă și aplică/);
  assert.match(ui, /Pregătit · neexecutat/);
  assert.match(ui, /ownerResolutionRequired/);
  assert.match(route, /approveAskActionPlan/);
  assert.doesNotMatch(route, /sendGmailMessage|gmail\.send|calendar/);
});

test("successful actions write bounded audit metadata", () => {
  const source = read("src/lib/ai/action-planner.ts");
  assert.match(source, /action: "ask_action_executed"/);
  assert.match(source, /human_approved: true/);
  assert.match(source, /ai_involved: true/);
  assert.doesNotMatch(source, /metadata: \{[^}]*body|metadata: \{[^}]*note/);
});
