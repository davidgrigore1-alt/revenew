import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

async function loadCaptureValidation() {
  const source = await read("../src/lib/commercial-signal-capture.ts");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(module,exports){${output}\n})(module,module.exports)`, { module, exports: module.exports });
  return module.exports;
}

test("manual signal capture uses Romanian deterministic validation", async () => {
  const validation = await loadCaptureValidation();
  assert.match(validation.validateCommercialSignalCapture({ source: "manual", rawMessage: "Notă" }), /Titlul semnalului/);
  assert.match(validation.validateCommercialSignalCapture({ title: "Cerere", source: "manual" }), /textul semnalului/);
  assert.match(validation.validateCommercialSignalCapture({ title: "Cerere", source: "email", rawMessage: "Text", contactEmail: "invalid" }), /Emailul contactului/);
  assert.match(validation.validateCommercialSignalCapture({ title: "Cerere", source: "ai_receptionist", rawMessage: "Text" }), /sursă validă/);
  assert.equal(validation.validateCommercialSignalCapture({ title: "Cerere", source: "whatsapp", rawMessage: "Mesaj copiat manual" }), null);
});

test("signal operations remain tenant-scoped, explicit and deterministic", async () => {
  const inbox = await read("../src/lib/commercial-inbox.ts");
  const actions = await read("../src/lib/commercial-inbox-actions.ts");
  assert.match(inbox, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.match(inbox, /validateWorkspaceLinks/);
  assert.match(inbox, /\.eq\("business_id", business\.id\)/);
  assert.match(inbox, /buildDeterministicRecoverabilityAnalysis/);
  assert.doesNotMatch(inbox, /runRecoverabilityAnalysis|createOpenAIClient|fetch\(/);
  assert.match(actions, /requirePermission\("signals\.create"\)/);
  assert.match(actions, /requirePermission\("signals\.convert"\)/);
  assert.match(actions, /requirePermission\("signals\.archive"\)/);
});

test("inbox supports linking, conversion, next action and reasoned archive without external execution", async () => {
  const client = await read("../src/components/inbox/CommercialInboxClient.tsx");
  const inbox = await read("../src/lib/commercial-inbox.ts");
  const migration = await read("../supabase/migrations/20260714234600_data_ingestion_continuous_recovery_v1.sql");
  assert.match(client, /Companie CRM/);
  assert.match(client, /Oportunitate existentă/);
  assert.match(client, /Aprobă și creează acțiunea/);
  assert.match(client, /Semnal .*Revizuire .*Decizie .*Oportunitate/);
  assert.match(client, /Revizuiește semnalul/);
  assert.match(client, /acțiunea internă a fost creată în oportunitatea selectată/);
  assert.match(client, /oportunitatea și prima acțiune internă au fost create/);
  assert.match(client, /estimatedRecoverableValue === null/);
  assert.match(client, /Arhivează/);
  assert.match(inbox, /detected_from_opportunity_id/);
  assert.match(inbox, /signal_archived/);
  assert.match(migration, /insert into public\.opportunity_actions/);
  assert.doesNotMatch(client + inbox, /sendEmail|sendMessage|webhook|twilio|gmail/i);
});

test("signals are visible in Company 360 and opportunity context with inbox wayfinding", async () => {
  const company = await read("../src/app/(protected)/crm/organizations/[id]/page.tsx");
  const opportunity = await read("../src/app/(protected)/opportunities/[id]/page.tsx");
  const navigation = await read("../src/lib/navigation.ts");
  assert.match(company, /Semnale recente/);
  assert.match(company, /getCommercialSignalsForOrganization/);
  assert.match(company, /Următor pas propus:/);
  assert.match(opportunity, /Semnale asociate/);
  assert.match(opportunity, /getCommercialSignalsForOpportunity/);
  assert.match(opportunity, /Context pentru execuție:/);
  assert.match(navigation, /href: "\/inbox"/);
  assert.match(navigation, /matchesRoutePrefix\(pathname, item\.href\)/);
});

test("demo fixtures cover review, links, conversion and no external connector", async () => {
  const fixtures = await read("../scripts/demo/fixtures.mjs");
  const verify = await read("../scripts/demo/verify-local-demo.mjs");
  assert.match(fixtures, /const signals = \[/);
  assert.match(fixtures, /Text WhatsApp copiat manual/);
  assert.match(fixtures, /converted_opportunity_id/);
  assert.match(fixtures, /detected_from_opportunity_id/);
  assert.match(verify, /signal_count/);
  assert.match(verify, /foreignSignal/);
  assert.match(verify, /external_signal_source_count/);
});
