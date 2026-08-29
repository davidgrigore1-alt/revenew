import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../src/app/(protected)/opportunities/[id]/page.tsx", import.meta.url);
const workbenchUrl = new URL("../src/components/opportunities/OpportunityActionWorkbench.tsx", import.meta.url);
const controlCenterUrl = new URL("../src/components/opportunities/OpportunityControlCenter.tsx", import.meta.url);
const workflowUrl = new URL("../src/components/opportunities/OpportunityWorkflow.tsx", import.meta.url);
const intelligenceTimelineUrl = new URL("../src/components/opportunities/OpportunityIntelligenceTimeline.tsx", import.meta.url);

test("opportunity command workspace renders only the selected semantic panel", async () => {
  const page = await readFile(pageUrl, "utf8");
  assert.match(page, /const activeTab: OpportunityTab/);
  assert.match(page, /activeTab === "responsibility" \? <section id="action-responsibility"/);
  assert.match(page, /activeTab === "response" \? <section id="action-response"/);
  assert.match(page, /activeTab === "schedule" \? <section id="action-schedule"/);
  assert.doesNotMatch(page, /target:block|className="hidden scroll-mt-24|\border-\d+|flex-row-reverse/);
  assert.match(page, /mode="responsibility"/);
  assert.match(page, /mode="outcome"/);
  assert.match(page, /<CommercialResponsePanel opportunity=\{opportunity\} \/>/);
  assert.match(page, /<CreateTaskForm opportunityId=\{opportunity\.id\}/);
});

test("recommended action and precise safe CTAs remain visible", async () => {
  const workbench = await readFile(workbenchUrl, "utf8");
  assert.match(workbench, /Recomandat acum/);
  assert.match(workbench, /Completează următoarea acțiune/);
  assert.match(workbench, /Atribuie responsabil/);
  assert.match(workbench, /Înregistrează răspunsul/);
  assert.match(workbench, /Verifică și confirmă rezultatul/);
  assert.match(workbench, /Adaugă contact principal/);
  assert.doesNotMatch(workbench, />Continuă</);
  assert.doesNotMatch(workbench, />Vezi detalii</);
});

test("the first opportunity screen exposes evidence without opening a raw feed", async () => {
  const [page, controlCenter, workflow, intelligenceTimeline] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(controlCenterUrl, "utf8"),
    readFile(workflowUrl, "utf8"),
    readFile(intelligenceTimelineUrl, "utf8")
  ]);
  assert.match(page, /const evidenceBackedDescription = currentFacts\.blocker/);
  assert.doesNotMatch(page, /const evidenceBackedDescription = sourceSignal/);
  assert.match(page, /description=\{evidenceBackedDescription\}/);
  assert.match(controlCenter, /Dovezi disponibile/);
  assert.match(controlCenter, /Verifică dovada/);
  assert.match(controlCenter, /Lipsește o dovadă verificabilă/);
  assert.match(controlCenter, /Necesită verificare:/);
  assert.match(controlCenter, /attention\.reasons\.slice\(0, 2\)/);
  assert.match(controlCenter, /Aprobarea umană rămâne obligatorie/);
  assert.match(intelligenceTimeline, /Istoric comercial/);
  assert.match(intelligenceTimeline, /Fapte înregistrate și interpretări cu momentul evaluării explicit/);
  assert.match(intelligenceTimeline, /Fapt înregistrat/);
  assert.match(intelligenceTimeline, /Interpretare ReveNew/);
  assert.match(workflow, /Contextul sursă al oportunității/);
  assert.match(workflow, /Consultă textul sursă/);
  assert.doesNotMatch(workflow, />Text sursă brut</);
});

test("estimated opportunity value stays separate from confirmed revenue", async () => {
  const controlCenter = await readFile(controlCenterUrl, "utf8");
  assert.match(controlCenter, /Valoare estimată, nu confirmată/);
  assert.match(controlCenter, /commercialState\.financial\.confirmedRevenue != null/);
  assert.match(controlCenter, /commercialState\.financial\.confirmedRevenueCurrency/);
  assert.match(controlCenter, /Venit confirmat de echipă/);
  assert.match(controlCenter, /Separat de valoarea estimată a oportunității/);
});

test("human approval and existing server actions are not bypassed", async () => {
  const [controlCenter, workflow] = await Promise.all([
    readFile(controlCenterUrl, "utf8"),
    readFile(workflowUrl, "utf8")
  ]);
  assert.match(controlCenter, /openOutcomeConfirmation\(opportunity\.id, status\)/);
  assert.match(controlCenter, /recordOpportunityOutcome\(opportunity\.id, pendingOutcome\)/);
  assert.match(controlCenter, /finalConfirmation/);
  assert.match(controlCenter, /Aprobarea umană rămâne obligatorie/);
  assert.match(workflow, /persistGeneratedDocument\(opportunity\.id, type, generated\)/);
  assert.match(workflow, /updateGeneratedDocument/);
  assert.match(workflow, /Trimiterea din aplicație nu este activă/);
});

test("document, workflow and contact destinations use semantic URL tabs and disclosures", async () => {
  const [workbench, workflow] = await Promise.all([
    readFile(workbenchUrl, "utf8"),
    readFile(workflowUrl, "utf8")
  ]);
  for (const destination of ["?tab=workflow#workflow-actions", "?tab=workflow#opportunity-documents", "?tab=workflow#action-contacts"]) {
    assert.match(workbench, new RegExp(destination.replace(/[?]/g, "\\?")));
  }
  assert.match(workflow, /<details id="workflow-actions"/);
  assert.match(workflow, /id="opportunity-documents"/);
  assert.match(workflow, /id="documents"/);
  assert.match(workflow, /id="opportunity-contacts"/);
  assert.doesNotMatch(workflow, /target:block|className="hidden scroll-mt-24/);
});

test("empty and partial opportunities have explicit operational states", async () => {
  const workbench = await readFile(workbenchUrl, "utf8");
  for (const copy of ["Acțiune lipsă", "Responsabil lipsă", "Niciun răspuns", "Fără documente", "Contact principal lipsă"]) {
    assert.match(workbench, new RegExp(copy));
  }
});
