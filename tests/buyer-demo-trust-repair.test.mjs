import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const documentsRoute = "src/app/(protected)/documents/page.tsx";
const navigation = read("src/lib/navigation.ts");
const todayCard = read("src/components/dashboard/TodayActionCard.tsx");
const opportunities = read("src/app/(protected)/opportunities/page.tsx");
const pipeline = read("src/app/(protected)/pipeline/page.tsx");
const companies = read("src/components/crm/CrmWorkspaceClient.tsx");
const settings = read("src/app/(protected)/settings/page.tsx");
const help = read("src/app/(protected)/help/page.tsx");
const access = read("src/app/(account)/access/page.tsx");
const ai = read("src/app/(protected)/ai/page.tsx");
const outreach = read("src/app/(protected)/outreach/page.tsx");
const fixtures = read("scripts/demo/fixtures.mjs");

test("documents is a protected alias to the existing document workflow", () => {
  assert.equal(existsSync(new URL(`../${documentsRoute}`, import.meta.url)), true);
  const route = read(documentsRoute);
  assert.match(route, /redirect\("\/outreach"\)/);
  assert.match(navigation, /name: "Documente", href: "\/outreach".+permission: "documents\.read"/);
  assert.match(outreach, /Studio de follow-up/);
  assert.match(outreach, /Niciun mesaj nu este trimis automat/);
});

test("buyer-facing demo copy does not expose internal fixture identifiers", () => {
  const surfaces = `${todayCard}\n${opportunities}\n${companies}\n${settings}\n${help}\n${access}\n${ai}\n${outreach}`;
  assert.doesNotMatch(surfaces, /revenew-local-demo-v1|Captură locală demonstrativă/i);
  assert.doesNotMatch(fixtures, /source_label:\s*"Captură locală demonstrativă"/i);
  assert.match(fixtures, /source_label:\s*"Dovadă disponibilă"/i);
});

test("fixed Romanian surfaces avoid mixed operational terminology", () => {
  const fixedSurfaces = `${navigation}\n${todayCard}\n${opportunities}\n${pipeline}\n${companies}\n${settings}\n${help}\n${access}\n${ai}\n${outreach}`;
  assert.doesNotMatch(fixedSurfaces, /Inteligență AI|Centrul de control AI|Cu acțiune pending|Valoare maximă estimată|Follow-up Studio/i);
  assert.doesNotMatch(`${companies}\n${settings}\n${help}`, /workspace-ul|Control workspace|>Workspace</i);
  assert.doesNotMatch(help, /ownership/i);
  assert.match(navigation, /Inteligență operațională/);
  assert.match(ai, /Controlul inteligenței operaționale/);
  assert.match(todayCard, /Valoare estimată, neconfirmată/);
  assert.match(pipeline, /Valoare estimată în pipeline/);
});

test("commercial safety claims remain explicit after the trust repair", () => {
  const safeSurfaces = `${pipeline}\n${access}\n${ai}\n${outreach}`;
  assert.match(pipeline, /Nu este venit confirmat/);
  assert.match(access, /nu inițiază plăți și nu creează abonamente/i);
  assert.match(access, /Nicio opțiune nu promite rezultate garantate/i);
  assert.match(ai, /nu execută acțiuni comerciale riscante fără aprobarea explicită/i);
  assert.match(outreach, /Niciun mesaj nu este trimis automat/i);
  assert.doesNotMatch(safeSurfaces, /ROI garantat|venit garantat|recuperare automată/i);
});
