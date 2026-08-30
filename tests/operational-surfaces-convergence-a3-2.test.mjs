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

test("Prepared projects current persisted state and routes each real document type safely", () => {
  const domain = read("src/lib/prepared-work.ts");
  const actions = read("src/lib/actions.ts");
  assert.match(domain, /if \(document\.status === "approved"\) return "approved"/);
  assert.match(domain, /if \(document\.status === "ready_to_send"\) return "ready_for_review"/);
  assert.match(domain, /\["draft", "edited", "copied"\]\.includes\(document\.status\)/);
  assert.doesNotMatch(domain, /ready_to_send" \|\| document\.readyAt/);
  for (const type of ["outreach_email", "follow_up_email", "linkedin_message", "whatsapp_message"]) assert.ok(domain.includes(`"${type}"`));
  for (const type of ["offer_draft", "procurement_checklist", "grant_summary"]) assert.ok(domain.includes(`"${type}"`));
  assert.match(actions, /select\("id,status,title,body,document_type,approved_content_fingerprint,updated_at"\)/);
  assert.match(actions, /\.eq\("updated_at", currentDocument\.updated_at\)/);
  assert.match(actions, /Documentul a fost modificat între timp/);
});

test("Prepared decision UX is URL-selected, evidence-only and has no execution action", () => {
  const page = read("src/app/(protected)/prepared/page.tsx");
  const preview = read("src/components/intelligence/ActionPreview.tsx");
  const registry = read("src/lib/prepared-work-registry.ts");
  assert.match(page, /searchParams\?\.item/);
  assert.match(page, /Coadă de decizie/);
  assert.match(page, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(page, /href=\{`\/prepared\?item=\$\{encodeURIComponent\(item\.id\)\}`\}\s+scroll=\{false\}/);
  assert.match(page, /items-start/);
  assert.match(page, /xl:max-h-\[calc\(100dvh-17rem\)\]/);
  assert.doesNotMatch(page, /xl:h-\[min\(|xl:min-h-\[/);
  assert.match(page, /xl:grid-cols-\[minmax\(17rem,21rem\)_minmax\(0,1fr\)\]/);
  assert.match(page, /active \? "border-\[rgb\(var\(--interaction\)\)\] bg-\[rgb\(var\(--interaction\)\/0\.08\)\]" : "border-transparent"/);
  assert.match(preview, /xl:max-h-\[calc\(100dvh-17rem\)\] xl:flex-col/);
  assert.match(preview, /min-h-0 gap-0[\s\S]*?xl:overflow-y-auto xl:overscroll-contain/);
  assert.doesNotMatch(preview, /xl:h-full|xl:flex-1/);
  for (const label of ["Ce a pregătit ReveNew", "De ce există", "Susținut de", "Context autorizat", "Neexecutat · necesită acțiune umană"]) assert.ok(preview.includes(label));
  assert.match(preview, /Nu există un motiv persistent asociat direct/);
  assert.match(preview, /Nu există dovezi persistente asociate direct/);
  assert.match(preview, /Documentul este rezultatul pregătit, nu dovada motivului comercial/);
  assert.match(preview, /Valoare estimată, neconfirmată/);
  assert.match(preview, /Moneda originală/);
  assert.match(registry, /business_assignable_profiles/);
  assert.doesNotMatch(page + preview + registry, /sendEmail|gmail\.send|updateGeneratedDocument|<form/i);
  assert.doesNotMatch(page + preview, /confidence/i);
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
