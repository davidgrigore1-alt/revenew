import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const scriptPath = "docs/sales/full-buyer-demo-script.md";
const checklistPath = "docs/sales/demo-readiness-checklist.md";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("full buyer demo script and readiness checklist exist", () => {
  for (const relativePath of [scriptPath, checklistPath]) {
    assert.equal(fs.existsSync(path.resolve(relativePath)), true, relativePath);
    assert.ok(read(relativePath).length > 2_000, relativePath);
  }
});

test("script preserves the required buyer-demo route order", () => {
  const script = read(scriptPath);
  const routes = [
    "/dashboard",
    "/opportunities/de300006-0000-4000-8000-000000000006",
    "/crm/organizations/de100001-0000-4000-8000-000000000001",
    "/ai",
    "/inbox?signal=de800001-0000-4000-8000-000000000001",
    "/approvals",
    "/reports/revenue-recovery-audit",
    "/reports/enterprise-pilot-pack",
    "/reports/pilot-proof-of-value"
  ];

  let previousIndex = -1;
  for (const route of routes) {
    const index = script.indexOf(`\`${route}\``, previousIndex + 1);
    assert.ok(index > previousIndex, `${route} must appear in the required order`);
    previousIndex = index;
  }

  assert.match(script, /aproximativ 9 minute/i);
  assert.match(script, /7–10 minute/i);
});

test("script explains operational intelligence, evidence and human control honestly", () => {
  const script = read(scriptPath);
  assert.match(script, /nu este un agent autonom/i);
  assert.match(script, /căutarea, prioritatea și descoperirea folosesc aceeași bază de dovezi/i);
  assert.match(script, /dovada și informațiile care trebuie confirmate/i);
  assert.match(script, /decizie umană/i);
  assert.match(script, /persoană autorizată/i);
  assert.match(script, /Nicio comunicare externă.+nu sunt executate autonom/is);
});

test("script separates estimated value from user-declared confirmed revenue", () => {
  const script = read(scriptPath);
  assert.match(script, /Valoare estimată în pipeline/);
  assert.match(script, /Valoare estimată expusă/);
  assert.match(script, /Venit confirmat/);
  assert.match(script, /rezultatul câștigat declarat explicit de un utilizator autorizat/i);
  assert.match(script, /deduplicată pe oportunitate/i);
  assert.match(script, /Monedele rămân separate/i);
});

test("sales materials make no positive ROI, revenue or live-integration promise", () => {
  const materials = `${read(scriptPath)}\n${read(checklistPath)}`;
  const unsafeLines = materials
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /garantează (?:venit|ROI)|ROI-ul este garantat|recuperează bani automat|Gmail este conectat|Google Calendar este conectat|telefonia (?:este|e) live/i.test(line))
    .filter((line) => !/\bnu\b|interzise|nu trebuie să apară/i.test(line));

  assert.deepEqual(unsafeLines, []);
  assert.match(materials, /Gmail, Google Calendar și telefonia live nu sunt capabilități active/i);
  assert.match(materials, /nu există telefonie live/i);
});

test("checklist uses CMD commands and classifies the appointment sandbox as optional", () => {
  const checklist = read(checklistPath);
  assert.match(checklist, /```cmd[\s\S]*cd \/d C:\\Projects\\ReveNew/);
  assert.match(checklist, /npx supabase start/);
  assert.match(checklist, /npm run demo:buyer-ready/);
  assert.match(checklist, /npm run demo:dev -- --port 3001/);
  assert.match(checklist, /\/demo\/appointment-control` \| Anexă opțională/);
  assert.match(checklist, /## Ce nu trebuie să apară/);
  assert.match(checklist, /## Click-uri sigure/);
  assert.match(checklist, /## Dacă Docker sau Supabase nu pornește/);
  assert.doesNotMatch(checklist, /```(?:bash|sh|powershell)|\bexport [A-Z_]+=/i);
});

test("README links the complete script and readiness checklist", () => {
  const readme = read("README.md");
  assert.match(readme, /docs\/sales\/full-buyer-demo-script\.md/);
  assert.match(readme, /docs\/sales\/demo-readiness-checklist\.md/);
});
