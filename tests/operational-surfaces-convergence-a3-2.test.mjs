import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("Prepared separates review, prepared and approved work from execution", () => {
  const page = read("src/app/(protected)/prepared/page.tsx");
  const preview = read("src/components/intelligence/ActionPreview.tsx");
  const registry = read("src/lib/prepared-work-registry.ts");
  assert.match(page, /Necesită revizuire/);
  assert.match(page, /Drafturi pregătite/);
  assert.match(page, /Aprobate, încă neexecutate/);
  assert.match(preview, /Neexecutat · necesită acțiune umană/);
  assert.doesNotMatch(registry, /activeStatuses[^\n]+executed/);
});

test("Approvals exposes decision counts, priority, consequence and audit", () => {
  const source = read("src/components/approvals/ApprovalCenterClient.tsx");
  assert.match(source, /Rezumat aprobări/);
  assert.match(source, /Necesită decizie/);
  assert.match(source, /priorityLabels/);
  assert.match(source, /Ce se va schimba/);
  assert.match(source, /Istoric de audit/);
  assert.match(source, /Nimic nu este trimis extern/);
});

test("Workflows show operational state, attention and human-control boundaries", () => {
  const source = read("src/app/(protected)/workflows/page.tsx");
  assert.match(source, /Rezumat workflow-uri/);
  assert.match(source, /Necesită atenție/);
  assert.match(source, /Nu rulează până la activare explicită/);
  assert.match(source, /Acțiunile externe rămân sub control uman/);
});

test("Sequences expose truthful preparation, activation and enrollment state", () => {
  const source = read("src/app/(protected)/sequences/page.tsx");
  assert.match(source, /Rezumat secvențe/);
  assert.match(source, /fără trimitere autonomă/);
  assert.match(source, /Activează pregătirea/);
  assert.match(source, /următorul pas/);
  assert.match(source, /sequence.status === "draft" \|\| sequence.status === "paused"/);
  assert.doesNotMatch(source, /sequence.status === "active" \? "paused" : "active"/);
});

test("Meetings distinguish upcoming and completed commercial context truthfully", () => {
  const source = read("src/app/(protected)/meetings/page.tsx");
  assert.match(source, /Rezumat întâlniri/);
  assert.match(source, /În desfășurare/);
  assert.match(source, /Întâlniri încheiate recent/);
  assert.match(source, /Oportunitate asociată/);
  assert.match(source, /ReveNew nu presupune automat rezultatul/);
  assert.match(source, /result\.connection/);
});

test("Documents expose source, commercial context, provenance and useful empty actions", () => {
  const source = read("src/app/(protected)/documents/page.tsx");
  assert.match(source, /Rezumat documente afișate/);
  assert.match(source, /Google Drive/);
  assert.match(source, /Context/);
  assert.match(source, /Actualizat \/ verificat/);
  assert.match(source, /selectate explicit dintr-o sursă autorizată/);
  assert.match(source, /Gestionează sursele/);
});

test("Apps uses the protected shell and keeps live, planned and connected states distinct", () => {
  const hub = read("src/components/apps/IntegrationHub.tsx");
  const catalog = read("src/lib/integrations/catalog.ts");
  const logo = read("src/components/apps/ApplicationLogo.tsx");
  assert.match(hub, /<PageShell/);
  assert.match(hub, /Explorează aplicațiile/);
  assert.match(catalog, /implemented/);
  assert.match(catalog, /next/);
  assert.match(catalog, /planned/);
  assert.match(logo, /\/brands\/applications\//);
  assert.doesNotMatch(logo, /https?:\/\//);
  for (const asset of ["google-symbol.svg", "google-workspace.svg", "microsoft-365.svg", "hubspot.svg", "pipedrive.svg", "slack.svg", "docusign.svg", "salesforce.svg"]) {
    assert.ok(fs.existsSync(path.resolve("public/brands/applications", asset)), asset);
  }
});

test("Settings groups operational domains and presents missing values explicitly", () => {
  const source = read("src/app/(protected)/settings/page.tsx");
  assert.match(source, /Spațiu de lucru/);
  assert.match(source, /Operare/);
  assert.match(source, /Administrare/);
  assert.match(source, /Acces, AI și confidențialitate/);
  assert.match(source, /value \|\| "Necompletat"/);
  assert.doesNotMatch(source, /break-all/);
});
