import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("opportunity detail keeps the executive decision and commercial identity first", async () => {
  const [page, control, workbench] = await Promise.all([
    read("../src/app/(protected)/opportunities/[id]/page.tsx"),
    read("../src/components/opportunities/OpportunityControlCenter.tsx"),
    read("../src/components/opportunities/OpportunityActionWorkbench.tsx")
  ]);

  assert.match(page, /title=\{opportunity\.title\}/);
  assert.match(control, />Companie</);
  assert.match(control, /Valoare estimată, nu confirmată/);
  assert.match(control, /Dovezi disponibile/);
  assert.match(control, /Următoarea acțiune/);
  assert.match(control, /Responsabil/);
  assert.match(control, /Aprobarea umană rămâne obligatorie/);
  assert.match(workbench, /Recomandat acum/);
  assert.match(workbench, /Revizuiește acțiunea/);
});

test("opportunity secondary execution areas use progressive disclosure", async () => {
  const [page, workbench, workflow, timeline] = await Promise.all([
    read("../src/app/(protected)/opportunities/[id]/page.tsx"),
    read("../src/components/opportunities/OpportunityActionWorkbench.tsx"),
    read("../src/components/opportunities/OpportunityWorkflow.tsx"),
    read("../src/components/opportunities/OpportunityIntelligenceTimeline.tsx")
  ]);

  assert.match(workbench, /<details[^>]*>[\s\S]*Alte intervenții controlate/);
  assert.match(page, /<details[^>]*>[\s\S]*Semnale asociate/);
  assert.match(workflow, /Evaluare și date operaționale/);
  assert.match(workflow, /Context comercial complet/);
  assert.match(timeline, /<section id="opportunity-timeline"/);
  assert.match(workflow, /<details id="opportunity-documents"/);
  assert.match(workflow, /Documente și drafturi/);
  assert.match(workflow, /<details id="opportunity-source-context"/);
  assert.match(workflow, /window\.location\.hash === "#opportunity-source-context"/);
  assert.match(timeline, /ExplanationDisclosure/);
});

test("opportunity actions provide safe review destinations and sanitized feedback", async () => {
  const [tasks, response, workflow, control, workbench] = await Promise.all([
    read("../src/components/revenue/TaskControls.tsx"),
    read("../src/components/opportunities/CommercialResponsePanel.tsx"),
    read("../src/components/opportunities/OpportunityWorkflow.tsx"),
    read("../src/components/opportunities/OpportunityControlCenter.tsx"),
    read("../src/components/opportunities/OpportunityActionWorkbench.tsx")
  ]);

  assert.match(tasks, /Acțiunea a fost creată\. O poți revizui în Activitatea mea/);
  assert.match(tasks, /Deschide Activitatea mea/);
  assert.match(response, /Acțiunea poate fi revizuită în Activitatea mea/);
  assert.match(response, /toUserFacingActionError/);
  assert.match(control, /toUserFacingActionError/);
  assert.match(workflow, /Deschide Activitatea mea/);
  assert.match(workbench, /Nicio comunicare externă/);
});

test("inbox presents compact filters and master-detail before detailed review", async () => {
  const [page, client] = await Promise.all([
    read("../src/app/(protected)/inbox/page.tsx"),
    read("../src/components/inbox/CommercialInboxClient.tsx")
  ]);

  assert.match(client, /aria-label="Comenzi Inbox Comercial"[\s\S]*id="signal-list-title"[\s\S]*id="signal-review-panel"/);
  assert.match(client, /Valoare estimată, neconfirmată/);
  assert.match(client, /Netrimis automat/);
  assert.match(client, /01 · Date esențiale/);
  assert.match(client, /02 · Acțiune și responsabil/);
  assert.match(page, /Revizuiește semnalele înainte de a le transforma în oportunități/);
  assert.doesNotMatch(page, /Obligatoriu:|Opțional, dar util:/);
});

test("inbox review groups optional and advanced data behind disclosures", async () => {
  const client = await read("../src/components/inbox/CommercialInboxClient.tsx");

  for (const label of [
    "Detalii de contact și context",
    "03 · Legături CRM",
    "04 · Draft recomandat",
    "Amânare, respingere și arhivare",
    "Istoric verificabil"
  ]) {
    assert.match(client, new RegExp(label.replace(/[·]/g, "\\·")));
  }
  assert.match(client, /<details className="group border-t/);
  assert.match(client, /signal-review-panel/);
  assert.match(client, /max-width: 1279px/);
  assert.match(client, /Obligatoriu/);
  assert.match(client, /Opțional/);
  assert.match(client, /Nu se trimite niciun mesaj/);
});

test("import guidance remains cautious, Romanian and progressively disclosed", async () => {
  const [page, wizard] = await Promise.all([
    read("../src/app/(protected)/inbox/import/page.tsx"),
    read("../src/components/inbox/CommercialSignalImportWizard.tsx")
  ]);

  assert.match(page, /Datele pot fi anonimizate pentru audit/);
  assert.match(page, /nu trimite mesaje automat/);
  assert.match(wizard, /datele spațiului de lucru/);
  assert.match(wizard, /Obligatoriu/);
  assert.match(wizard, /Opțional/);
  assert.match(wizard, /Istoric importuri și detectări/);
  assert.doesNotMatch(`${page}\n${wizard}`, /workspace-ului|Source Intake|Maximum/);
});

test("touched execution surfaces preserve commercial safety claims", async () => {
  const files = await Promise.all([
    read("../src/app/(protected)/opportunities/[id]/page.tsx"),
    read("../src/components/opportunities/OpportunityControlCenter.tsx"),
    read("../src/components/opportunities/OpportunityActionWorkbench.tsx"),
    read("../src/components/opportunities/OpportunityWorkflow.tsx"),
    read("../src/components/inbox/CommercialInboxClient.tsx"),
    read("../src/app/(protected)/inbox/page.tsx")
  ]);
  const source = files.join("\n");

  assert.doesNotMatch(source, /ROI garantat|venit garantat|recuperare automată/i);
  assert.match(source, /nu (?:este )?trimis[ăa]? automat|Nicio comunicare externă nu este trimisă automat/i);
  assert.match(source, /venit confirmat/i);
  assert.match(source, /aprobare umană|decizie umană/i);
}
);
