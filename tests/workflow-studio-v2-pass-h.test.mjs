import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

test("Workflow Studio exposes one editor shell with Editor, Runs and Settings", () => {
  const page = read("src/app/(protected)/workflows/[workflowId]/page.tsx");
  assert.match(page, /Editor[\s\S]*Rulări[\s\S]*Setări/);
  assert.match(page, /Trigger[\s\S]*Condiții[\s\S]*Verificări[\s\S]*Efecte[\s\S]*Rezultat[\s\S]*Audit/);
  assert.match(page, /Nicio acțiune nu a fost executată în acest test/);
  assert.match(page, /\?view=runs&run=/);
});

test("canvas editor keeps the canonical G2 definition and explicit save semantics", () => {
  const builder = read("src/components/workflows/WorkflowBuilder.tsx");
  assert.match(builder, /aria-label="Canvas workflow"/);
  assert.match(builder, /Inspector/);
  assert.match(builder, /FlowConnector/);
  assert.match(builder, /beforeunload/);
  assert.match(builder, /Salvează modificările/);
  assert.match(builder, /Testează fără mutații/);
  assert.match(builder, /name="conditions"[\s\S]*name="actions"/);
  assert.match(builder, /Când[\s\S]*Dacă[\s\S]*ReveNew verifică[\s\S]*Atunci/);
});

test("activation is truthful and only a wired automatic trigger can go live", () => {
  const presentation = read("src/lib/workflow-trigger-registry.ts");
  const runtime = read("src/lib/workflow-runtime.ts");
  assert.match(presentation, /opportunity_created:[\s\S]*automatic: true/);
  assert.match(presentation, /next_action_overdue: \{ \.\.\.later/);
  assert.match(runtime, /workflowTriggerCapability/);
  assert.match(runtime, /workflow_trigger_runner_unavailable/);
});

test("golden opportunity-created workflow is wired to the real CRM creation boundary", () => {
  const crm = read("src/lib/crm/workspace-actions.ts");
  assert.match(crm, /processCommercialWorkflowEvent/);
  assert.match(crm, /trigger: "opportunity_created"/);
  assert.match(crm, /eventKey: `opportunity:\$\{data\.id\}:created`/);
  assert.doesNotMatch(crm, /send_email|gmail\.send/);
});

test("new workflow starts from governed playbooks or a manual draft", () => {
  const page = read("src/app/(protected)/workflows/new/page.tsx");
  const library = read("src/components/workflows/WorkflowPlaybooks.tsx");
  assert.match(page, /WorkflowPlaybooks/);
  assert.match(library, /Creează draft → revizuiește → testează → activează explicit/);
  assert.match(page, /Creează draft/);
  assert.match(page, /Începe manual/);
  assert.doesNotMatch(page, /form action="\/ai"|send_email|gmail\.send/);
});

test("G3 missing-next-action selection excludes resolved records unless explicitly requested", () => {
  const core = read("src/lib/ai/multi-record-planning-core.ts");
  assert.match(core, /executionState === "resolved" && !filters\.executionStates\?\.includes\("resolved"\)/);
});
