import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function loadModel() {
  const filename = path.resolve("src/lib/buyer-feedback.ts");
  const output = ts.transpileModule(read("src/lib/buyer-feedback.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module, Date, Object }, { filename });
  return module.exports;
}

const model = loadModel();

function complete(overrides = {}) {
  const input = model.createEmptyBuyerFeedback();
  return {
    ...input,
    companyName: "Companie exemplu",
    industry: "Servicii B2B",
    buyerRole: "Director comercial",
    companySize: "250–999 angajați",
    processComplexity: "recurring",
    monthlyVolume: "80–120",
    currentProcess: "CRM și foi de calcul",
    painClarity: "clear",
    commercialPain: "Oportunități fără follow-up la timp",
    blockage: "Între ofertă și aprobarea comercială",
    auditData: "Export cu 30 de cazuri recente",
    dataAvailability: "available",
    anonymizable: "yes",
    inboxResistance: "yes",
    auditReadiness: "accepted",
    urgency: "high",
    decisionAccess: "direct",
    comprehension: { ...input.comprehension, evidence: true, safeAction: true, problem: true, humanApproval: true },
    objections: ["Nu vrem acces la inbox"],
    productFeedback: "Scurtează explicația despre valoarea estimată.",
    ...overrides
  };
}

test("feedback route is protected and connected from the controlled demo", () => {
  const page = read("src/app/(protected)/demo/feedback/page.tsx");
  const demo = read("src/app/(protected)/demo/page.tsx");
  const help = read("src/app/(protected)/help/page.tsx");

  assert.match(page, /requirePermission\("platform\.internal_tools\.access"\)/);
  assert.match(page, /Concluzii după demo/);
  assert.match(demo, /href="\/demo\/feedback"/);
  assert.match(demo, /Notează feedbackul după demo/);
  assert.doesNotMatch(help, /href="\/demo\/feedback"/);
  assert.doesNotMatch(help, /După demo: notează feedbackul/);
});

test("capture includes buyer context, discovery, comprehension, objections and data readiness", () => {
  const capture = read("src/components/demo/BuyerFeedbackCapture.tsx");

  for (const copy of [
    "Companie", "Industrie", "Rolul cumpărătorului", "Dimensiunea companiei",
    "Complexitatea procesului comercial", "Volum lunar estimat", "Proces sau instrument actual", "Data demonstrației",
    "Durerea comercială principală", "Unde se blochează oportunitățile", "Procesul actual de follow-up",
    "Blocaje de aprobare", "Responsabil pentru follow-up", "Date disponibile pentru audit",
    "Disponibilitatea datelor", "Datele pot fi anonimizate?", "Există rezistență la acces în inbox?",
    "Problema comercială", "Dovezile recomandării", "Acțiunea sigură", "Aprobarea umană",
    "Valoare estimată vs. confirmată", "Audit → pilot → dovada valorii"
  ]) assert.match(capture, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  for (const objection of [
    "Avem deja CRM", "Nu vrem acces la inbox", "Nu avem timp", "Nu credem în AI",
    "Nu avem date structurate", "Nu este prioritar", "Buget neclar", "Decidentul nu este prezent",
    "Valoarea estimată nu este suficient de clară", "Altă obiecție"
  ]) assert.match(capture, new RegExp(objection));

  assert.match(capture, /window\.localStorage/);
  assert.doesNotMatch(capture, /fetch\(|createClient|server action|supabase/i);
});

test("fit assessment returns all four transparent states", () => {
  assert.equal(model.assessBuyerFit(complete()).label, "Fit puternic pentru audit");
  assert.equal(model.assessBuyerFit(complete({
    painClarity: "unclear",
    dataAvailability: "partial",
    anonymizable: "unknown",
    auditReadiness: "possible"
  })).label, "Fit posibil, necesită clarificare");
  assert.equal(model.assessBuyerFit(complete({
    processComplexity: "none",
    dataAvailability: "none",
    anonymizable: "no",
    auditReadiness: "no",
    urgency: "low"
  })).label, "Fit slab acum");
  assert.equal(model.assessBuyerFit(model.createEmptyBuyerFeedback()).label, "Nu concluziona încă");
});

test("assessment explains reasons and gaps and recommends a deterministic safe next step", () => {
  const input = complete();
  const first = model.assessBuyerFit(input);
  const second = model.assessBuyerFit(input);

  assert.ok(first.reasons.length >= 4);
  assert.ok(Array.isArray(first.missing));
  assert.equal(first.nextStep, second.nextStep);
  assert.match(first.nextStep, /20–50 de cazuri comerciale recente/);
  assert.doesNotMatch(first.nextStep, /trimite automat|programează automat|garant/i);
});

test("generated summary covers profile, pain, objections, audit readiness and next step", () => {
  const input = complete();
  const summary = model.generateBuyerFeedbackSummary(input);

  assert.match(summary, /Cumpărător: Companie exemplu/);
  assert.match(summary, /Durere comercială: Oportunități fără follow-up la timp/);
  assert.match(summary, /Obiecții: Nu vrem acces la inbox/);
  assert.match(summary, /Disponibilitate pentru audit: acceptată ca pas următor/);
  assert.match(summary, /Următor pas recomandat:/);
  assert.match(summary, /fără trimitere automată/);
  assert.match(summary, /valoarea estimată rămâne neconfirmată/);
});

test("feedback copy preserves privacy, human control and cautious commercial claims", () => {
  const page = read("src/app/(protected)/demo/feedback/page.tsx");
  const capture = read("src/components/demo/BuyerFeedbackCapture.tsx");
  const modelSource = read("src/lib/buyer-feedback.ts");
  const copy = `${page}\n${capture}\n${modelSource}`;

  assert.match(copy, /Primul audit nu necesită acces complet la inbox/);
  assert.match(copy, /datele pot fi anonimizate/i);
  assert.match(copy, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(copy, /control uman|decizie umană/i);
  assert.match(copy, /valoarea estimată.*neconfirmată/i);
  assert.doesNotMatch(copy, /venit garantat|ROI garantat|recuperare automată|Gmail live|Calendar live|voce live|probabilitate de închidere|șansă garantată de pilot|local demo|fixture|workspace|pending|ownership/i);
});
