import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "docs/sales/outreach-playbook.md",
  "docs/sales/discovery-call-script.md",
  "docs/sales/demo-script.md",
  "docs/sales/objection-handling.md",
  "docs/sales/first-50-prospect-list-guide.md",
  "docs/sales/offer-and-pricing-draft.md",
];

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const docs = Object.fromEntries(files.map((file) => [file, read(file)]));
const allDocs = Object.values(docs).join("\n");

test("all client outreach and discovery documents exist", () => {
  for (const file of files) {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), true, file);
    assert.ok(docs[file].length > 600, `${file} should be immediately useful`);
  }
});

test("the pack preserves safe commercial claims", () => {
  assert.match(allDocs, /valoare estimată[^.\n]*(nu|separat)[^.\n]*venit confirmat/i);
  assert.match(allDocs, /nu (garantează|garantăm)[^.\n]*(venit|recuperarea)/i);
  assert.match(allDocs, /nu (promitem|afirmăm)[^.\n]*ROI/i);
  assert.match(allDocs, /nu (trimite|trimitem|promitem trimitere)[^.\n]*automat/i);
  const unsafeClaims = allDocs
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      /\bgarantăm (creștere|venit|ROI)|recuperează bani automat|\b(suntem|este) certificat(?:ă|i)? (SOC 2|ISO 27001|GDPR)/i.test(
        line,
      ),
    )
    .filter((line) => !/\b(nu|fără|refuză|cere|evită|descalifică)\b/i.test(line));
  assert.deepEqual(unsafeClaims, []);
});

test("the data request is limited, anonymizable and does not require account access", () => {
  assert.match(allDocs, /20–50/);
  assert.match(allDocs, /anonimizat/i);
  assert.match(allDocs, /nu (solicităm|avem nevoie de) acces complet la inbox/i);
  assert.match(allDocs, /nu (solicităm|avem nevoie de) acces complet la calendar/i);
  assert.match(allDocs, /nu solicităm parole/i);
  assert.match(allDocs, /canalul securizat aprobat de client/i);
  assert.match(allDocs, /spațiu de lucru dedicat/i);
});

test("the pack does not present unavailable communication integrations as live", () => {
  assert.match(allDocs, /integrare de inbox nu face parte din oferta curentă/i);
  assert.match(allDocs, /integrarea live cu Calendar nu face parte din oferta curentă/i);
  assert.match(allDocs, /nu afirmăm că sunt disponibile integrări live Gmail, Calendar sau voice/i);
  assert.doesNotMatch(allDocs, /\b(integrarea|integrare) live (Gmail|Calendar|voice) (este|sunt) disponibil/i);
});

test("the sales journey covers discovery, audit and a human-controlled pilot", () => {
  assert.match(docs["docs/sales/discovery-call-script.md"], /15 minute/i);
  assert.match(allDocs, /pilot(?:ul)? (?:controlat )?(?:de )?14 zile/i);
  assert.match(allDocs, /continuăm, ajustăm sau oprim/i);
  assert.match(allDocs, /control uman|aprobare umană|confirmare umană/i);
  assert.match(allDocs, /audit(?:ul)? plătit/i);
});

test("the five-minute demo uses the current local buyer route", () => {
  const demo = docs["docs/sales/demo-script.md"];
  for (const route of [
    "/dashboard",
    "/demo",
    "/reports",
    "/reports/revenue-recovery-audit",
    "/reports/enterprise-pilot-pack",
    "/opportunities/de300006-0000-4000-8000-000000000006",
  ]) {
    assert.match(demo, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(demo, /```cmd/);
  assert.match(demo, /cd \/d C:\\Projects\\ReveNew/);
  assert.doesNotMatch(demo, /```(?:bash|sh|powershell)/i);
});

test("the LinkedIn message is concise and the pack handles core objections", () => {
  const outreach = docs["docs/sales/outreach-playbook.md"];
  const linkedInSection = outreach.match(
    /### Mesaj inițial — sub 700 de caractere\s+>\s*([\s\S]*?)\n\n###/,
  );
  assert.ok(linkedInSection, "LinkedIn message should be extractable");
  const message = linkedInSection[1].replace(/\n>\s?/g, "\n").trim();
  assert.ok(message.length < 700, `LinkedIn message has ${message.length} characters`);

  const objections = docs["docs/sales/objection-handling.md"];
  for (const phrase of [
    "Avem deja un CRM",
    "Unde este AI-ul",
    "Aveți nevoie de acces la email",
    "Aveți nevoie de acces la calendar",
    "Este conform GDPR",
    "Puteți garanta venit",
    "De ce să plătim lunar",
    "Poate trimite emailuri automat",
    "Este gata pentru achiziții enterprise",
    "De ce să nu folosim Excel",
    "Ce se întâmplă după 14 zile",
  ]) {
    assert.match(objections, new RegExp(phrase, "i"));
  }
});

test("the first 50 guide contains sectors, scoring and no fabricated prospect list", () => {
  const guide = docs["docs/sales/first-50-prospect-list-guide.md"];
  for (const phrase of [
    "primele 50",
    "rent-a-car",
    "clinici private",
    "distribuitori",
    "construcții",
    "logistică",
    "facility management",
    "agenții B2B",
    "flotă",
    "9–12",
    "6–8",
    "0–5",
  ]) {
    assert.match(guide, new RegExp(phrase, "i"));
  }
  assert.match(guide, /nu conține companii sau persoane reale/i);
  assert.match(guide, /nu automatiza trimiterea/i);
});

test("the pricing draft separates four bounded offers and exclusions", () => {
  const pricing = docs["docs/sales/offer-and-pricing-draft.md"];
  assert.match(pricing, /Audit discovery gratuit — evaluare limitată/i);
  assert.match(pricing, /Audit de recuperare venituri/i);
  assert.match(pricing, /Pilot controlat — 14 zile/i);
  assert.match(pricing, /Utilizare recurentă/i);
  assert.match(pricing, /490–1\.200 EUR/);
  assert.match(pricing, /1\.500–3\.500 EUR/);
  assert.match(pricing, /690–1\.500 EUR\/lună/);
  assert.match(pricing, /Nu include:/g);
  assert.match(pricing, /Deduplicatează valoarea estimată pe oportunitate/i);
});
