import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const demo = read("src/app/(protected)/demo/page.tsx");
const fixtures = read("scripts/demo/fixtures.mjs");
const seed = read("scripts/demo/seed-local-demo.mjs");
const reports = read("src/app/(protected)/reports/page.tsx");
const audit = read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx");
const pilot = read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx");
const pilotModel = read("src/lib/enterprise-pilot-pack.ts");
const opportunity = read("src/components/opportunities/OpportunityWorkflow.tsx");
const auditPrint = read("src/components/reports/PrintAuditButton.tsx");
const pilotPrint = read("src/components/reports/PrintPilotPackButton.tsx");

test("internal demo uses a five-minute evidence-to-pilot route through existing surfaces", () => {
  for (const route of [
    "/dashboard",
    "/opportunities",
    "/reports/revenue-recovery-audit",
    "/reports/enterprise-pilot-pack"
  ]) {
    assert.match(demo, new RegExp(route.replaceAll("/", "\\/")));
  }

  for (const path of [
    "src/app/(protected)/dashboard/page.tsx",
    "src/app/(protected)/opportunities/[id]/page.tsx",
    "src/app/(protected)/reports/revenue-recovery-audit/page.tsx",
    "src/app/(protected)/reports/enterprise-pilot-pack/page.tsx"
  ]) {
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} must exist`);
  }

  assert.match(demo, /Traseu demonstrație–pilot · 5 minute/);
  assert.match(demo, /buildWorkspaceDecisionQueue\(\{ opportunities, signals: inbox\.signals \}\)/);
  assert.match(demo, /decisionQueue\.items\.find\(\(item\) => item\.relatedOpportunityId\)/);
  assert.match(demo, /demoDecision\.actionHref/);
  assert.match(demo, /Bazat pe:/);
  assert.match(demo, /Pilotul validează în 14 zile/);
});

test("demo language is executive, cautious and free of outdated recovery hype", () => {
  for (const prohibited of [
    "sistem AI care găsește și recuperează",
    "ca să faci bani",
    "bani recuperabili",
    "AI magic",
    "venit garantat",
    "ROI garantat",
    "hidden opportunity",
    "recuperare automată"
  ]) {
    assert.doesNotMatch(demo, new RegExp(prohibited, "i"));
  }

  assert.match(demo, /controlat/);
  assert.match(demo, /dovezi/);
  assert.match(demo, /Valoare estimată/);
  assert.match(demo, /nu este venit confirmat/);
  assert.match(demo, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(demo, /oamenii autorizați verifică, aprobă și decid/i);
  assert.doesNotMatch(`${demo}\n${audit}\n${pilot}`, /ROI garantat|venit garantat|succes garantat|recuperare automată/i);
});

test("demo identity is neutral, fictional and contains no personal mailbox or founder identity", () => {
  assert.match(fixtures, /operator@demo\.invalid/);
  assert.match(fixtures, /\[DEMO\] Meridian Commercial Operations/);
  assert.match(fixtures, /Meridian Logistics SRL/);
  assert.match(fixtures, /Delta Construct Solutions SRL/);
  assert.match(fixtures, /Nova Medical Systems SRL/);
  assert.match(seed, /Operator Demo ReveNew/);
  assert.doesNotMatch(`${fixtures}\n${seed}`, /gmail\.com|David Pohoata|david\.grigore|Auto Management Revenue Lab/i);
});

test("reports, audit and pilot preserve two-way demo wayfinding and print controls", () => {
  assert.match(reports, /href="\/reports\/revenue-recovery-audit"/);
  assert.match(reports, /href="\/reports\/enterprise-pilot-pack"/);
  assert.match(audit, /href="\/reports\/enterprise-pilot-pack"/);
  assert.match(audit, /Transformă auditul într-o validare controlată pe 14 zile/);
  assert.match(pilot, /href=\{pack\.auditHref\}/);
  assert.match(pilotModel, /auditHref:\s*"\/reports\/revenue-recovery-audit"/);
  assert.match(auditPrint, /window\.print\(\)/);
  assert.match(auditPrint, /Printează auditul/);
  assert.match(pilotPrint, /window\.print\(\)/);
  assert.match(pilotPrint, /Printează propunerea/);
});

test("demo opportunity keeps safe actions, Romanian priority labels and financial separation", () => {
  assert.match(opportunity, /Prioritate redusă/);
  assert.match(opportunity, /Prioritate normală/);
  assert.match(opportunity, /Prioritate ridicată/);
  assert.doesNotMatch(opportunity, /<option value="(?:low|medium|high)">(?:low|medium|high)<\/option>/);
  assert.match(opportunity, /Trimiterea din aplicație nu este activă/);
  assert.match(demo, /Documentele sunt pregătite pentru revizuire, nu considerate trimise/);
  assert.match(audit, /Valoare estimată, nu venit confirmat/);
  assert.match(pilot, /Fiecare oportunitate este numărată o singură dată în total/);
  assert.match(pilot, /Valoare estimată, nu venit confirmat; pilotul nu garantează recuperarea ei/);
  assert.match(pilot, /Decizia de continuare rămâne controlată/);
  assert.match(pilotModel, /Stabilește un ciclu lunar de audit/);
});
