import assert from "node:assert/strict";
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
  vm.runInNewContext(output, { exports: module.exports, module, require: localRequire, Array, Set, String }, { filename });
  return module.exports;
}
const registry = compile("src/lib/workflow-trigger-registry.ts");
const presentation = compile("src/lib/workflow-presentation.ts", { "@/lib/workflow-trigger-registry": registry });

test("workflow catalogs expose human Romanian labels for every G2A trigger and safe action", () => {
  assert.equal(presentation.workflowTriggerCatalog.length, 8);
  assert.equal(presentation.workflowActionCatalog.length, 6);
  assert.equal(presentation.presentWorkflowTrigger("next_action_overdue"), "Acțiune următoare restantă");
  assert.equal(presentation.presentWorkflowAction("prepare_email"), "Pregătește email");
  for (const item of [...presentation.workflowTriggerCatalog, ...presentation.workflowActionCatalog]) {
    assert.notEqual(item.label, item.value);
    assert.doesNotMatch(item.label, /_/);
  }
});
test("typed condition presentation restricts numeric operators to estimated exposure", () => {
  assert.deepEqual(Array.from(presentation.workflowOperatorsForField("company")), ["equals", "not_equals", "is_empty", "is_not_empty"]);
  assert.equal(Array.from(presentation.workflowOperatorsForField("estimated_value")).includes("greater_than"), true);
  assert.equal(Array.from(presentation.workflowOperatorsForField("estimated_value")).includes("less_than"), true);
});
test("workflow list is a compact operating table with human states and intentional actions", () => {
  const page = read("src/app/(protected)/workflows/page.tsx");
  assert.match(page, /Nume[\s\S]*Stare[\s\S]*Declanșator[\s\S]*Ultima evaluare[\s\S]*Rezultat[\s\S]*Acțiuni/);
  assert.match(page, /presentWorkflowTrigger/);
  assert.match(page, /Workflow nou/);
  assert.match(page, /Deschide/);
  assert.match(page, /Pauză/);
  assert.doesNotMatch(page, /triggerLabels|actionLabels|operatorLabels/);
});
test("visual builder uses the single canonical G2A definition with four connected blocks", () => {
  const builder = read("src/components/workflows/WorkflowBuilder.tsx");
  assert.match(builder, /Când[\s\S]*Dacă[\s\S]*ReveNew verifică[\s\S]*Atunci/);
  assert.match(builder, /name="conditions" value=\{JSON\.stringify\(payload\.conditions\)\}/);
  assert.match(builder, /name="actions" value=\{JSON\.stringify\(payload\.actions\)\}/);
  assert.match(builder, /workflowOperatorsForField/);
  assert.match(builder, /Niciun email nu va fi trimis automat/);
  assert.match(builder, /Salvează modificările înainte de activare/);
  assert.match(builder, /beforeunload/);
  assert.match(builder, /Mută acțiunea/);
});
test("server actions validate allowlisted definitions and never accept activation through save", () => {
  const actions = read("src/lib/workflow-actions.ts");
  assert.match(actions, /safeWorkflowActions\.includes\(type\)/);
  assert.match(actions, /workflowOperatorsForField\(field\)\.includes\(operator\)/);
  assert.match(actions, /const allowed = type === "prepare_email" \? \["subject", "body"\] : \["title"\]/);
  const save = actions.slice(actions.indexOf("export async function saveWorkflowDefinition"), actions.indexOf("export async function createWorkflowDefinition"));
  assert.doesNotMatch(save, /setCommercialWorkflowStatus|active/);
  assert.match(actions, /createCommercialWorkflowDraftFromQuestion/);
});
test("runtime editing remains tenant scoped, pause-gated and AI drafts remain inactive", () => {
  const runtime = read("src/lib/workflow-runtime.ts");
  const update = runtime.slice(runtime.indexOf("export async function updateCommercialWorkflowDefinition"), runtime.indexOf("export async function getCommercialWorkflowEditor"));
  assert.match(update, /\.eq\("id", workflowId\)\.eq\("business_id", actor\.businessId\)/);
  assert.match(update, /\["draft", "paused"\]/);
  assert.match(update, /external_send: false/);
  const aiDraft = runtime.slice(runtime.indexOf("export async function createCommercialWorkflowDraftFromQuestion"), runtime.indexOf("export async function updateCommercialWorkflowDefinition"));
  assert.match(aiDraft, /status: "draft"/);
  assert.doesNotMatch(aiDraft, /setCommercialWorkflowStatus|activated_at/);
});
test("test and history UX explain decisions without executing actions", () => {
  const builder = read("src/components/workflows/WorkflowBuilder.tsx");
  const editor = read("src/app/(protected)/workflows/[workflowId]/page.tsx");
  const runtime = read("src/lib/workflow-runtime.ts");
  assert.match(builder, /Testează fără mutații/);
  assert.match(editor, /Istoric de rulare/);
  assert.match(editor, /Detaliul deciziei/);
  assert.match(editor, /Nicio acțiune nu a fost executată în acest test/);
  const testRun = runtime.slice(runtime.indexOf("export async function testCommercialWorkflow"), runtime.indexOf("export async function getCommercialWorkflowWorkspace"));
  assert.match(testRun, /is_test_run: true/);
  assert.match(testRun, /actionExecuted: false/);
  assert.doesNotMatch(testRun, /createStoredActionPlanForActor|communication_notifications/);
});
test("nested workflow routes require the existing privileged workflow permission", () => {
  const policies = read("src/lib/authz/route-policies.ts");
  assert.match(policies, /prefix: "\/workflows", permission: "settings\.update"/);
});
