import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadRegistry() {
  const filename = path.resolve("src/lib/ai-capabilities.ts");
  const output = ts.transpileModule(read("src/lib/ai-capabilities.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module }, { filename });
  return module.exports;
}

const roadmap = read("docs/ai-expansion-roadmap.md");
const registrySource = read("src/lib/ai-capabilities.ts");
const registry = loadRegistry();

function capability(id) {
  const result = registry.aiCapabilities.find((item) => item.id === id);
  assert.ok(result, `Missing capability ${id}`);
  return result;
}

test("AI expansion roadmap is practical and does not claim live integrations", () => {
  assert.match(roadmap, /Rezumat executiv/);
  assert.match(roadmap, /Maturitatea AI actuală/);
  assert.match(roadmap, /Principiile controlului acțiunilor AI/);
  assert.match(roadmap, /Gmail nu este conectat/);
  assert.match(roadmap, /Google Calendar nu este conectat/);
  assert.match(roadmap, /Nu există recepționer voice/);
  assert.match(roadmap, /nu activează Gmail, Google Calendar, telefonie sau agenți autonomi/i);
  assert.doesNotMatch(roadmap, /\b(?:garantăm|garantează)\s+(?:venit|ROI)\b/i);
  assert.doesNotMatch(roadmap, /\bROI garantat\b|\bvenit garantat\b/i);
});

test("roadmap requires evidence, audit and approval for external side effects", () => {
  assert.match(roadmap, /Dovezi înainte de afirmație/);
  assert.match(roadmap, /Aprobare explicită pentru efecte externe/);
  assert.match(roadmap, /jurnal de audit/i);
  assert.match(roadmap, /Fail closed/);
  assert.match(roadmap, /Tenant derivat pe server/);
  assert.match(roadmap, /fără acces implicit la inboxul complet/i);
});

test("Calendar starts with sandbox and free-busy before write access", () => {
  assert.match(roadmap, /Etapa B — Asistent Calendar în sandbox/);
  assert.match(roadmap, /Citire `free\/busy` înainte de acces la detaliile evenimentelor/);
  assert.match(roadmap, /Citirea `free\/busy` trebuie validată înaintea oricărui acces de scriere/);
  assert.match(roadmap, /Nu folosește Google Calendar, nu creează evenimente și nu apelează un API extern/);
});

test("voice starts in text mode and includes disclosure, consent and human handoff", () => {
  assert.match(roadmap, /Prima versiune este text-mode/);
  assert.match(roadmap, /disclosure că interlocutorul interacționează cu un asistent AI/i);
  assert.match(roadmap, /consimțământ/i);
  assert.match(roadmap, /handoff către o persoană/i);
  assert.match(roadmap, /ReveNew AI Receptionist for Salons/);
  assert.match(roadmap, /unu până la trei intervale/);
  assert.match(roadmap, /sandbox-ul inițial folosește `în așteptare`/);
});

test("OAuth and token storage are explicit future gates, not current implementation", () => {
  assert.match(roadmap, /Tokenurile OAuth și stocarea lor sunt cerințe viitoare\. Nu sunt implementate/);
  assert.match(roadmap, /scope-uri minime/i);
  assert.match(roadmap, /tokenuri criptate la rest/i);
  assert.match(roadmap, /protecție CSRF\/state/i);
  assert.match(roadmap, /teste pentru acces cross-tenant/i);
});

test("capability registry classifies live Gmail, Calendar and voice as blocked", () => {
  const liveIds = [
    "calendar.googleFreeBusyPlanned",
    "calendar.createEventAfterApproval",
    "gmail.createDraftAfterApproval",
    "gmail.sendAfterApproval",
    "voice.realPhoneReceptionistPlanned"
  ];
  for (const id of liveIds) {
    const item = capability(id);
    assert.equal(item.status, "blocked_until_security_review");
    assert.equal(item.allowedExecutionMode, "blocked");
    assert.equal(item.requiresAuditLog, true);
  }
});

test("external side effects are high or critical, approval-gated and never automatically executable", () => {
  const external = registry.aiCapabilities.filter((item) => item.externalSideEffect);
  assert.ok(external.length >= 4);
  for (const item of external) {
    assert.ok(["high", "critical"].includes(item.riskLevel), item.id);
    assert.equal(item.requiresHumanApproval, true, item.id);
    assert.equal(item.requiresEvidence, true, item.id);
    assert.equal(item.requiresAuditLog, true, item.id);
    assert.ok(["execute_after_approval", "blocked"].includes(item.allowedExecutionMode), item.id);
    assert.notEqual(item.allowedExecutionMode, "approval_required", `${item.id} must not blur approval and execution`);
  }
});

test("control plane fails closed when a required gate is missing", () => {
  const internal = capability("opportunity.prepareFollowUpDraft");
  const denied = registry.evaluateAiCapabilityExecution(internal, {
    humanApprovalGranted: false,
    evidenceAvailable: true,
    auditLogAvailable: true,
    oauthConnectionAvailable: false,
    secureTokenStorageAvailable: false
  });
  assert.equal(denied.allowed, false);
  assert.ok(Array.from(denied.reasons).some((reason) => /aprobarea umană/i.test(reason)));

  const blocked = registry.evaluateAiCapabilityExecution(capability("gmail.sendAfterApproval"), {
    humanApprovalGranted: true,
    evidenceAvailable: true,
    auditLogAvailable: true,
    oauthConnectionAvailable: true,
    secureTokenStorageAvailable: true
  });
  assert.equal(blocked.allowed, false);
  assert.ok(Array.from(blocked.reasons).some((reason) => /nu este activată/i.test(reason)));
});

test("registry contains no secrets, tokens or provider credentials", () => {
  assert.doesNotMatch(registrySource, /OPENAI_API_KEY|RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|client_secret|access_token|refresh_token/i);
  assert.doesNotMatch(registrySource, /https?:\/\/|fetch\s*\(|createClient\s*\(/i);
});
