import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadJourney() {
  const filename = path.resolve("src/lib/first-value-journey.ts");
  const compiled = ts.transpileModule(read(filename), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module }, { filename });
  return module.exports;
}

function signal(overrides = {}) {
  return {
    id: "signal-1",
    status: "new",
    reviewStatus: "new",
    analysisStatus: "not_started",
    recommendedAction: null,
    reviewedDraft: null,
    events: [],
    ...overrides
  };
}

test("first-value journey starts from a real signal route and invents no completion", () => {
  const { deriveFirstValueJourney } = loadJourney();
  const empty = deriveFirstValueJourney([]);
  assert.equal(empty.nextHref, "/inbox?create=1");
  assert.equal(empty.steps.every((step) => step.state !== "complete"), true);

  const created = deriveFirstValueJourney([signal()]);
  assert.equal(created.steps[0].state, "complete");
  assert.equal(created.steps[1].state, "current");
  assert.equal(created.steps[3].state, "action");
  assert.equal(created.nextHref, "/inbox?signal=signal-1");
});

test("analysis availability does not pretend that human review happened", () => {
  const { deriveFirstValueJourney } = loadJourney();
  const journey = deriveFirstValueJourney([signal({
    status: "ready_for_review",
    reviewStatus: "ready_for_review",
    analysisStatus: "completed",
    recommendedAction: "Confirmă termenul"
  })]);
  assert.notEqual(journey.steps[1].state, "complete");
  assert.notEqual(journey.steps[3].state, "complete");
  assert.equal(journey.nextAction, "Revizuiește riscul comercial");
});

test("recorded human review connects the existing approval flow", () => {
  const { deriveFirstValueJourney } = loadJourney();
  const journey = deriveFirstValueJourney([signal({
    status: "ready_for_review",
    reviewStatus: "ready_for_review",
    analysisStatus: "completed",
    recommendedAction: "Confirmă termenul",
    events: [{ eventType: "analysis_review_edited" }]
  })]);
  assert.equal(journey.complete, true);
  assert.equal(journey.steps.every((step) => step.state === "complete"), true);
  assert.equal(journey.nextHref, "/approvals?signal=signal-1");
  assert.equal(journey.nextAction, "Revizuiește aprobarea");
});

test("first-value surfaces preserve onboarding and human approval boundaries", () => {
  const onboarding = read("src/components/onboarding/OnboardingForm.tsx");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const inboxPage = read("src/app/(protected)/inbox/page.tsx");
  const inboxClient = read("src/components/inbox/CommercialInboxClient.tsx");
  const approvals = read("src/components/approvals/ApprovalCenterClient.tsx");
  const recovery = read("src/app/(protected)/recoverable/page.tsx");

  assert.match(onboarding, /router\.push\(`\/activation\?mode=\$\{entryMode\}`\)/);
  assert.match(dashboard, /deriveFirstValueJourney\(summary\.signals\)/);
  assert.match(inboxPage, /initialCreateOpen=\{searchParams\?\.create === "1"\}/);
  assert.match(inboxClient, /Nicio acțiune externă nu este trimisă/);
  assert.match(approvals, /Aprobă și aplică/);
  assert.match(approvals, /Nimic nu este trimis extern/);
  assert.match(recovery, /\/inbox\?create=1/);
});
