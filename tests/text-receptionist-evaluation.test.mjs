import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTypeScript(relativePath, requireMap = {}) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: (specifier) => requireMap[specifier] ?? {}
  }, { filename });
  return module.exports;
}

const appointment = loadTypeScript("src/lib/appointment-sandbox.ts");
const fixtures = loadTypeScript("src/lib/appointment-sandbox-fixtures.ts");
const receptionist = loadTypeScript("src/lib/text-receptionist-sandbox.ts", {
  "@/lib/appointment-sandbox": appointment
});
const evaluation = loadTypeScript("src/lib/text-receptionist-evaluation.ts", {
  "@/lib/appointment-sandbox": appointment,
  "@/lib/appointment-sandbox-fixtures": fixtures,
  "@/lib/text-receptionist-sandbox": receptionist
});

const results = evaluation.runTextReceptionistEvaluation();
const resultByCategory = new Map(evaluation.textReceptionistEvaluationScenarios.map((scenario, index) => [
  scenario.category,
  results[index]
]));

test("evaluation defines every required deterministic scenario category", () => {
  const categories = evaluation.textReceptionistEvaluationScenarios.map((scenario) => scenario.category);
  assert.deepEqual(Array.from(categories), [
    "happy_path",
    "missing_information",
    "invalid_service",
    "inactive_service",
    "incompatible_staff",
    "staff_unavailable_fallback",
    "no_slots_available",
    "preference_change",
    "pending_approval",
    "handoff_required"
  ]);
  assert.equal(new Set(categories).size, 10);
  assert.equal(results.length, 10);
});

test("happy path completes with a clear pending handoff", () => {
  const result = resultByCategory.get("happy_path");
  assert.equal(result.passed, true, result.issues.join("\n"));
  assert.equal(result.completionState, "handoff");
  assert.ok(result.proposedSlotCount >= 1 && result.proposedSlotCount <= 3);
  assert.equal(result.pendingApprovalCreated, true);
  assert.equal(result.handoffSummaryPresent, true);
});

test("missing information is reported before any slot proposal", () => {
  const scenario = evaluation.textReceptionistEvaluationScenarios.find((item) => item.category === "missing_information");
  const result = resultByCategory.get("missing_information");
  assert.deepEqual(Array.from(scenario.expectedMissingFields), ["service", "preferred_date", "preferred_time_window"]);
  assert.equal(result.passed, true, result.issues.join("\n"));
  assert.equal(result.completionState, "collect_service");
  assert.equal(result.proposedSlotCount, 0);
});

test("invalid and inactive services fail safely", () => {
  for (const category of ["invalid_service", "inactive_service"]) {
    const result = resultByCategory.get(category);
    assert.equal(result.passed, true, `${category}: ${result.issues.join("\n")}`);
    assert.equal(result.safeRefusal, true);
    assert.equal(result.completionState, "collect_service");
    assert.equal(result.pendingApprovalCreated, false);
  }
});

test("incompatible staff cannot produce an invalid slot", () => {
  const result = resultByCategory.get("incompatible_staff");
  assert.equal(result.passed, true, result.issues.join("\n"));
  assert.equal(result.safeRefusal, true);
  assert.equal(result.completionState, "collect_staff_preference");
  assert.equal(result.proposedSlotCount, 0);
});

test("unavailable preferred staff falls back only to qualified alternatives", () => {
  const result = resultByCategory.get("staff_unavailable_fallback");
  assert.equal(result.passed, true, result.issues.join("\n"));
  assert.equal(result.completionState, "create_pending_booking");
  assert.ok(result.proposedSlotCount >= 1);
  assert.equal(result.pendingApprovalCreated, false);
});

test("no-slot scenario explains unavailability without a booking", () => {
  const result = resultByCategory.get("no_slots_available");
  assert.equal(result.passed, true, result.issues.join("\n"));
  assert.equal(result.safeRefusal, true);
  assert.equal(result.completionState, "no_slots_available");
  assert.equal(result.proposedSlotCount, 0);
  assert.equal(result.pendingApprovalCreated, false);
});

test("preference change clears old proposals and recalculates safely", () => {
  const result = resultByCategory.get("preference_change");
  assert.equal(result.passed, true, result.issues.join("\n"));
  assert.equal(result.completionState, "create_pending_booking");
  assert.ok(result.proposedSlotCount >= 1);
  assert.equal(result.pendingApprovalCreated, false);
});

test("pending approval and handoff invariants remain enforced", () => {
  for (const category of ["pending_approval", "handoff_required"]) {
    const result = resultByCategory.get(category);
    assert.equal(result.passed, true, `${category}: ${result.issues.join("\n")}`);
    assert.equal(result.pendingApprovalCreated, true);
    assert.equal(result.externalSideEffect, false);
    assert.equal(result.confirmationSent, false);
    assert.equal(result.handoffSummaryPresent, true);
  }
});

test("every evaluation preserves zero external effects and zero confirmations", () => {
  for (const result of results) {
    assert.equal(result.externalSideEffect, false, result.scenarioId);
    assert.equal(result.confirmationSent, false, result.scenarioId);
  }
});

test("evaluation and fixture are local-only and contain no private-looking demo identity", () => {
  const source = [
    read("src/lib/text-receptionist-evaluation.ts"),
    read("src/lib/text-receptionist-sandbox.ts"),
    read("src/lib/appointment-sandbox-fixtures.ts")
  ].join("\n");
  assert.doesNotMatch(source, /fetch\s*\(|https?:\/\/|googleapis|twilio|openai|realtime|oauth|access_token|refresh_token|createClient\s*\(/i);
  assert.doesNotMatch(source, /@gmail\.com|testdavid|davidtest|TEST DATA|\bE2E\b/i);
  assert.doesNotMatch(source, /\b(?:\+?40)?7\d{8}\b|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|RESEND_API_KEY/i);
});

test("live Calendar, Gmail and voice capabilities remain blocked", () => {
  const registry = read("src/lib/ai-capabilities.ts");
  for (const id of [
    "calendar.googleFreeBusyPlanned",
    "calendar.createEventAfterApproval",
    "gmail.sendAfterApproval",
    "voice.realPhoneReceptionistPlanned"
  ]) {
    const start = registry.indexOf(`id: "${id}"`);
    const end = registry.indexOf("\n  },", start);
    const definition = registry.slice(start, end);
    assert.match(definition, /status: "blocked_until_security_review"/);
    assert.match(definition, /allowedExecutionMode: "blocked"/);
  }
});

test("demo UI keeps the local sandbox and human-control boundaries visible", () => {
  const client = read("src/components/demo/AppointmentControlSandbox.tsx");
  assert.match(client, /Sandbox local/);
  assert.match(client, /Google Calendar[\s\S]*Neconectat/);
  assert.match(client, /Programare reală[\s\S]*Nu este creată/);
  assert.match(client, /Aprobare[\s\S]*Obligatorie/);
  assert.match(client, /Schimbă data sau preferința/);
  assert.match(client, /Nu a fost trimisă nicio confirmare|deliveryStatus/);
  assert.doesNotMatch(client, /fetch\s*\(|server action|\.from\(|googleapis|twilio|openai|oauth/i);
});
