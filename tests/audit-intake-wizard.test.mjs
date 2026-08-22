import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function loadTsModel(relativePath) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module }, { filename });
  return module.exports;
}

function completeInput(overrides = {}) {
  return {
    companyName: "Companie exemplu",
    industry: "Servicii B2B",
    buyerRole: "Director comercial",
    companySize: "250–999 angajați",
    processComplexity: "Proces complex, cu aprobări și mai multe echipe",
    blockers: ["Follow-up întârziat"],
    recentExample: "O ofertă nu a primit următor pas.",
    caseVolume: "20to50",
    caseTypes: ["Oportunități în pipeline"],
    dataRecency: "Ultimele 90 de zile",
    anonymization: "yes",
    inboxAccess: "Nu este necesar pentru primul audit",
    availableFields: ["Companie", "Valoare estimată", "Monedă", "Status", "Următor pas"],
    objectives: ["Identificarea oportunităților blocate"],
    valuableOutcome: "Un plan verificabil pentru management.",
    constraints: "",
    ...overrides
  };
}

const model = loadTsModel("src/lib/audit-intake.ts");
const searchModel = loadTsModel("src/lib/app-section-search.ts");

test("audit start route is protected and states the commercial and privacy boundaries", () => {
  const page = read("src/app/(protected)/audit/start/page.tsx");
  assert.match(page, /requirePermission\("workspace\.read"\)/);
  assert.match(page, /Pregătește primul audit ReveNew/);
  assert.match(page, /20–50 de cazuri/);
  assert.match(page, /Date anonimizabile/);
  assert.match(page, /nu necesită acces complet la inbox/i);
  assert.match(page, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(page, /nu garantează venit sau recuperare/i);
});

test("wizard exposes six real steps, compact progress and a copy fallback", () => {
  const wizard = read("src/components/audit/AuditIntakeWizard.tsx");
  for (const label of ["Compania", "Blocaje", "Cazuri", "Date și confidențialitate", "Obiectiv", "Plan recomandat"]) assert.match(wizard, new RegExp(label));
  assert.equal((wizard.match(/title: "/g) ?? []).length, 8); // six steps plus two grouped field headings
  assert.match(wizard, /grid-cols-3[\s\S]*sm:grid-cols-6/);
  assert.doesNotMatch(wizard, /overflow-x-auto|whitespace-nowrap/);
  assert.match(wizard, /Rezumat complet, disponibil și pentru copiere manuală/);
  assert.match(wizard, /readOnly/);
  assert.match(wizard, /navigator\.clipboard\.writeText/);
  assert.match(wizard, /revenew\.auditIntake\.draft/);
});

test("deterministic assessment distinguishes strong, possible, difficult and incomplete fit", () => {
  assert.equal(model.assessAuditIntake(completeInput()).label, "Pregătit pentru audit controlat");
  assert.equal(model.assessAuditIntake(completeInput({ caseVolume: "10to20", anonymization: "unknown", availableFields: ["Companie", "Status"] })).label, "Audit posibil, necesită clarificare");
  assert.equal(model.assessAuditIntake(completeInput({ caseVolume: "under10" })).label, "Audit dificil acum");
  const incomplete = model.assessAuditIntake(model.createEmptyAuditIntake());
  assert.equal(incomplete.label, "Nu concluziona încă");
  assert.ok(incomplete.missingInformation.length >= 6);
  assert.match(incomplete.nextStep, /Completează informațiile lipsă/);
});

test("generated plan is actionable, cautious and contains no invented commercial outcome", () => {
  const assessment = model.assessAuditIntake(completeInput());
  const plan = model.generateAuditPlan(completeInput(), assessment);
  for (const section of ["Context companie", "Blocaje urmărite", "Cazuri recomandate pentru analiză", "Date necesare", "Confidențialitate și limitări", "Ce va produce auditul", "Următorul pas"]) assert.match(plan, new RegExp(section));
  assert.match(plan, /nu cere acces complet la inbox/i);
  assert.match(plan, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(plan, /Valorile estimate nu sunt venit confirmat/);
  assert.doesNotMatch(plan, /ROI|venit garantat|recuperare garantată|probabilitate de conversie/i);
});

test("demo, report, help, assistant and search lead to the audit wizard while Home stays sparse", () => {
  for (const file of [
    "src/app/(protected)/demo/page.tsx",
    "src/app/(protected)/reports/revenue-recovery-audit/page.tsx",
    "src/app/(protected)/help/page.tsx"
  ]) assert.match(read(file), /href="\/audit\/start"/, file);
  assert.doesNotMatch(read("src/app/(protected)/dashboard/page.tsx"), /href="\/(?:audit\/start|reports\/revenue-recovery-audit)"/);

  const help = read("src/lib/contextual-help.ts");
  const search = read("src/lib/app-section-search.ts");
  assert.match(help, /routes: \["\/audit\/start"/);
  assert.match(help, /Deschide wizardul de audit/);
  assert.match(search, /id: "audit-start"[\s\S]*href: "\/audit\/start"/);
  for (const query of ["audit controlat", "incepe audit", "începe audit", "date anonimizate", "cazuri comerciale", "plan audit", "audit wizard"]) {
    assert.equal(searchModel.searchAppSections(query)[0]?.href, "/audit/start", query);
  }
});

test("new surface preserves themes and existing guidance routes", () => {
  const wizard = read("src/components/audit/AuditIntakeWizard.tsx");
  const themes = read("src/lib/theme-presets.ts");
  const assistant = read("src/lib/contextual-help.ts");
  const search = read("src/lib/app-section-search.ts");
  const recommendation = read("src/components/intelligence/RecommendationExplanationCard.tsx");
  assert.match(wizard, /--rn-accent/);
  assert.match(themes, /executive-blue/);
  assert.equal(searchModel.searchAppSections("firme")[0]?.href, "/companies");
  assert.match(search, /\/demo\/feedback/);
  assert.match(assistant, /Unde sunt firmele/);
  assert.match(recommendation, /Dovadă/);
  assert.match(recommendation, /Decizie umană necesară/);
});
