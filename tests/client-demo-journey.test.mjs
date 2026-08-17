import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const demo = read("src/app/(protected)/demo/page.tsx");
const demoModel = read("src/lib/buyer-demo.ts");
const fixtures = read("scripts/demo/fixtures.mjs");
const seed = read("scripts/demo/seed-local-demo.mjs");
const reports = read("src/app/(protected)/reports/page.tsx");
const audit = read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx");
const pilot = read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx");
const pilotModel = read("src/lib/enterprise-pilot-pack.ts");
const opportunity = read("src/components/opportunities/OpportunityWorkflow.tsx");
const dashboard = read("src/app/(protected)/dashboard/page.tsx");
const decisionQueue = read("src/lib/workspace-decision-queue.ts");
const auditPrint = read("src/components/reports/PrintAuditButton.tsx");
const pilotPrint = read("src/components/reports/PrintPilotPackButton.tsx");

test("internal demo uses a controlled evidence-to-proof route through existing surfaces", () => {
  for (const route of [
    "/dashboard",
    "/opportunities/de300006-0000-4000-8000-000000000006",
    "/crm/organizations/de100001-0000-4000-8000-000000000001",
    "/ai",
    "/inbox?signal=de800001-0000-4000-8000-000000000001",
    "/approvals",
    "/reports/revenue-recovery-audit",
    "/reports/enterprise-pilot-pack"
  ]) {
    assert.ok(demoModel.includes(route), `${route} lipsește din traseu`);
  }

  for (const path of [
    "src/app/(protected)/dashboard/page.tsx",
    "src/app/(protected)/opportunities/[id]/page.tsx",
    "src/app/(protected)/reports/revenue-recovery-audit/page.tsx",
    "src/app/(protected)/reports/enterprise-pilot-pack/page.tsx"
  ]) {
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} must exist`);
  }

  assert.match(demo, /Demo controlat ReveNew/);
  assert.match(demo, /Opt pași, o singură lume comercială/);
  assert.match(demo, /audit controlat pe 20–50 cazuri comerciale recente/i);
  assert.equal((demoModel.match(/buyerQuestion: "/g) ?? []).length, 8);
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
  assert.match(demo, /Valoarea estimată/);
  assert.match(demo, /nu este venit confirmat/);
  assert.match(demo, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(demo, /Decizia umană rămâne obligatorie/i);
  assert.doesNotMatch(`${demo}\n${audit}\n${pilot}`, /ROI garantat|venit garantat|succes garantat|recuperare automată/i);
});

test("demo identity is neutral, fictional and contains no personal mailbox or founder identity", () => {
  assert.match(fixtures, /irina\.petrescu@revenew-demo\.invalid/);
  assert.match(fixtures, /Meridian Commercial Operations/);
  assert.match(fixtures, /Meridian Logistics SRL/);
  assert.match(fixtures, /Delta Construct Solutions SRL/);
  assert.match(fixtures, /Nova Medical Systems SRL/);
  assert.match(seed, /DEMO\.operatorName/);
  assert.doesNotMatch(`${fixtures}\n${seed}`, /gmail\.com|Grigore|David|testdavid|davidtest|TEST DATA|E2E|Auto Management Revenue Lab/i);
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
  assert.match(demo, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(audit, /Valoare estimată, nu venit confirmat/);
  assert.match(pilot, /Fiecare oportunitate este numărată o singură dată în total/);
  assert.match(pilot, /Valoare estimată, nu venit confirmat; pilotul nu garantează recuperarea ei/);
  assert.match(pilot, /Decizia de continuare rămâne controlată/);
  assert.match(pilotModel, /Stabilește un ciclu lunar de audit/);
});

test("main buyer journey uses operational Romanian instead of internal ownership and workflow terms", () => {
  assert.doesNotMatch(dashboard, /Fără owner|actualizarea workflow-urilor/i);
  assert.doesNotMatch(decisionQueue, /ownership confirmat/i);
  assert.doesNotMatch(demo, /Executive Morning Brief/i);
  assert.doesNotMatch(demo, /\. coada deciziilor/);
  assert.doesNotMatch(opportunity, /Explorează workflow-ul|începe workflow-ul/i);
  assert.doesNotMatch(reports, /fără proprietar|prin workflow-ul existent/i);
  assert.match(reports, /Spațiu de lucru: \{business\?\.name/);
  assert.match(demo, /Inteligența operațională structurează și explică/);
});
