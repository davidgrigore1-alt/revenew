import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { forbiddenFileReason } from "../scripts/validation/check-repository-safety.mjs";

const require = createRequire(import.meta.url);
const Papa = require("papaparse");
const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const guidePath = "docs/client-audit-intake.md";
const checklistPath = "docs/client-audit-checklist.md";
const samplePath = "docs/samples/revenew-client-audit-template.csv";
const guide = read(guidePath);
const checklist = read(checklistPath);
const sample = read(samplePath);

test("client audit guide defines a controlled, anonymizable sample without broad access", () => {
  assert.equal(existsSync(new URL(`../${guidePath}`, import.meta.url)), true);
  assert.match(guide, /un eșantion controlat este suficient/i);
  assert.match(guide, /20–50/);
  assert.match(guide, /poate anonimiza numele companiilor, numele contactelor și adresele de email/i);
  assert.match(guide, /nu este necesar acces complet la inbox/i);
  assert.match(guide, /nu este necesar acces complet la calendar/i);
  assert.match(guide, /nu se solicită parole, tokenuri sau acces la conturi/i);
  assert.match(guide, /nu sunt necesare integrări Gmail, Calendar/i);
  assert.match(guide, /Valorile estimate rămân separate de venitul confirmat/i);
  assert.match(guide, /nicio comunicare externă nu este trimisă automat/i);
  assert.match(guide, /Monedele se păstrează separat/i);
  assert.match(guide, /Nu importa date reale sau anonimizate ale clientului în workspace-ul demonstrativ `Meridian Commercial Operations`/);
});

test("audit offer converts into a human-controlled 14-day pilot without financial promises", () => {
  assert.match(guide, /pilot controlat de \*\*14 zile\*\*/i);
  assert.match(guide, /continuă, ajustează sau oprește/i);
  assert.match(guide, /nu promite venit recuperat, ROI sau rezultate comerciale garantate/i);
  assert.match(guide, /Pilotul nu garantează recuperarea venitului/i);
  assert.doesNotMatch(guide, /garantăm|ROI garantat|venit garantat|recuperare automată/i);
  assert.equal(existsSync(new URL(`../${checklistPath}`, import.meta.url)), true);
  assert.match(checklist, /Previzualizează CSV-ul în `\/inbox\/import`/);
  assert.match(checklist, /aprobă uman/i);
});

test("client audit CSV is import-oriented, fictional and keeps currencies explicit", () => {
  assert.equal(existsSync(new URL(`../${samplePath}`, import.meta.url)), true);
  const parsed = Papa.parse(sample, { header: true, skipEmptyLines: "greedy" });
  assert.equal(parsed.errors.length, 0);
  const requiredColumns = [
    "opportunity_title", "company_name", "contact_name", "contact_role", "contact_email",
    "request_date", "request_source", "request_summary", "estimated_value", "currency",
    "current_status", "responsible_person", "last_action_date", "last_action_summary",
    "next_action", "next_action_due_date", "approval_required", "approval_status",
    "proposal_prepared", "proposal_sent", "outcome_confirmed", "operator_notes"
  ];
  assert.deepEqual(parsed.meta.fields, requiredColumns);
  assert.ok(parsed.data.length >= 5);
  assert.ok(parsed.data.every((row) => row.opportunity_title && row.company_name && row.request_date && row.request_summary));
  assert.ok(parsed.data.every((row) => ["RON", "EUR"].includes(row.currency)));
  assert.ok(parsed.data.some((row) => row.currency === "RON"));
  assert.ok(parsed.data.some((row) => row.currency === "EUR"));
  assert.ok(parsed.data.every((row) => !row.contact_email || /@(example|revenew-demo)\.invalid$/i.test(row.contact_email)));
  assert.doesNotMatch(sample, /gmail\.com|testdavid|davidtest|TEST DATA|E2E|Grigore David/i);
  assert.doesNotMatch(parsed.meta.fields.join(","), /total|confirmed_revenue|roi/i);
});

test("repository safety permits only the documented client CSV", () => {
  assert.equal(forbiddenFileReason(samplePath), null);
  assert.equal(forbiddenFileReason("docs/samples/another-export.csv"), "temporary log or CSV");
  assert.equal(forbiddenFileReason("logs/client-audit.log"), "temporary log or CSV");
});

test("existing signal import recognizes the client template's supported columns", () => {
  const fields = read("src/lib/commercial-ingestion-fields.ts");
  for (const alias of [
    "opportunity_title", "company_name", "contact_name", "contact_email", "request_source",
    "request_summary", "current_status", "responsible_person", "last_action_date", "next_action_due_date"
  ]) {
    assert.match(fields, new RegExp(`"${alias}"`));
  }
  assert.match(guide, /Coloanele de lucru care nu sunt mapate rămân informații pentru normalizare și revizuire/);
  assert.match(guide, /Importul creează \*\*semnale pentru revizuire\*\*, nu oportunități sau acțiuni automate/);
  assert.match(guide, /Mapează `responsible_person` numai dacă numele corespunde exact unui membru activ/);
  assert.match(guide, /pentru nume anonimizate selectează `Nu importa`/);
});
