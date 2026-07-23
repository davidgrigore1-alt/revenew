import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../src/app/(protected)/opportunities/[id]/page.tsx", import.meta.url);
const workbenchUrl = new URL("../src/components/opportunities/OpportunityActionWorkbench.tsx", import.meta.url);
const controlCenterUrl = new URL("../src/components/opportunities/OpportunityControlCenter.tsx", import.meta.url);
const workflowUrl = new URL("../src/components/opportunities/OpportunityWorkflow.tsx", import.meta.url);

test("opportunity command workspace hides large execution forms by default", async () => {
  const page = await readFile(pageUrl, "utf8");
  for (const id of ["action-responsibility", "action-outcome", "action-response", "action-schedule"]) {
    assert.match(page, new RegExp(`id="${id}" className="hidden scroll-mt-24 target:block"`));
  }
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
  const [controlCenter, workflow] = await Promise.all([
    readFile(controlCenterUrl, "utf8"),
    readFile(workflowUrl, "utf8")
  ]);
  assert.match(controlCenter, /Dovadă disponibilă/);
  assert.match(controlCenter, /Verifică dovezile/);
  assert.match(controlCenter, /Lipsește o dovadă verificabilă/);
  assert.match(workflow, /Dovezi și istoric/);
  assert.match(workflow, /Consultă textul sursă/);
  assert.doesNotMatch(workflow, />Text sursă brut</);
});

test("estimated opportunity value stays separate from confirmed revenue", async () => {
  const controlCenter = await readFile(controlCenterUrl, "utf8");
  assert.match(controlCenter, /Valoare estimată, nu confirmată/);
  assert.match(controlCenter, /actualOutcomeAmount != null \? <div><dt[^>]*>Venit confirmat/);
  assert.match(controlCenter, /Venit recuperat confirmat/);
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

test("document, workflow and contact hashes remain accessible", async () => {
  const [workbench, workflow] = await Promise.all([
    readFile(workbenchUrl, "utf8"),
    readFile(workflowUrl, "utf8")
  ]);
  for (const hash of ["#workflow-actions", "#opportunity-documents", "#action-contacts"]) {
    assert.match(workbench, new RegExp(hash));
  }
  assert.match(workflow, /id="workflow-actions" className="hidden scroll-mt-24 target:block"/);
  assert.match(workflow, /id="opportunity-documents"/);
  assert.match(workflow, /id="documents"/);
  assert.match(workflow, /id="opportunity-contacts"/);
});

test("empty and partial opportunities have explicit operational states", async () => {
  const workbench = await readFile(workbenchUrl, "utf8");
  for (const copy of ["Acțiune lipsă", "Responsabil lipsă", "Niciun răspuns", "Fără documente", "Contact principal lipsă"]) {
    assert.match(workbench, new RegExp(copy));
  }
});
