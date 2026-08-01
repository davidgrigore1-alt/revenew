import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function compileModel(relativePath, context = {}) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module, ...context }, { filename });
  return module.exports;
}

const help = compileModel("src/lib/contextual-help.ts");

test("flow map uses six stable compact labels while preserving full business meaning", () => {
  const flow = read("src/components/guidance/ReveNewFlowMap.tsx");

  for (const label of ["Semnal", "Dovezi", "Recomandare", "Decizie", "Acțiune", "Audit / Pilot"]) assert.match(flow, new RegExp(`label: "${label.replace("/", "\\/")}`));
  for (const full of ["Decizie umană", "Acțiune sigură", "Audit sau pilot controlat"]) assert.match(flow, new RegExp(full));
  assert.match(flow, /grid-cols-2/);
  assert.match(flow, /sm:grid-cols-3/);
  assert.doesNotMatch(flow, /min-w-\[720px\]|overflow-x-auto|app-scrollbar/);
  assert.match(flow, /aria-label=\{`\$\{index \+ 1\}\. \$\{step\.full\}`\}/);
  assert.doesNotMatch(flow, /Ã|Â|�/);
});

test("contextual guides are dismissible per page and reset only namespaced keys", () => {
  const guide = read("src/components/guidance/ContextualPageGuide.tsx");
  const persistenceSource = read("src/lib/guide-persistence.ts");
  const values = new Map([
    ["revenew.dismissedGuide.dashboard", "true"],
    ["revenew.dismissedGuide.inbox", "true"],
    ["revenew-buyer-feedback-v1", "preserve"],
    ["unrelated.preference", "preserve"]
  ]);
  const localStorage = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  const window = { localStorage, dispatchEvent() {} };
  const persistence = compileModel("src/lib/guide-persistence.ts", { window, Event: class Event {} });

  assert.match(guide, /aria-label="Închide ghidul acestei pagini"/);
  assert.match(guide, /dismissGuide\(currentGuidance\.id\)/);
  assert.match(guide, /isGuideDismissed/);
  assert.match(persistenceSource, /revenew\.dismissedGuide\./);
  assert.equal(persistence.resetDismissedGuides(), 2);
  assert.equal(values.get("revenew-buyer-feedback-v1"), "preserve");
  assert.equal(values.get("unrelated.preference"), "preserve");
  assert.doesNotMatch(guide + persistenceSource, /supabase|database|server action/i);
});

test("knowledge base covers every core operating surface with routes and concrete steps", () => {
  const ids = new Set(help.contextualHelpEntries.map((entry) => entry.id));
  for (const id of [
    "revenew-core-flow", "dashboard-first-check", "recommendation-evidence", "inbox-signal-review", "companies-navigation", "contacts-navigation",
    "opportunity-contact", "opportunity-evidence", "today-postpone", "approvals-human-control",
    "estimated-value", "controlled-audit", "demo-controlled", "demo-feedback", "access-settings-help"
  ]) assert.equal(ids.has(id), true, `missing ${id}`);

  for (const entry of help.contextualHelpEntries) {
    assert.ok(entry.routes.length > 0, `${entry.id} needs a route`);
    assert.ok(entry.steps.length > 0, `${entry.id} needs steps`);
    assert.ok(entry.shortAnswer.length > 20, `${entry.id} needs a useful answer`);
  }
});

test("Romanian matching handles diacritics, synonyms and route context deterministically", () => {
  const cases = [
    ["cum asociez un contact acestei oportunități", "/opportunities/abc", "opportunity-contact"],
    ["cum asociez un contact acestei oportunitati", "/dashboard", "opportunity-contact"],
    ["unde este secțiunea de companii", "/dashboard", "companies-navigation"],
    ["unde sunt firmele", "/dashboard", "companies-navigation"],
    ["unde gasesc clientii", "/dashboard", "companies-navigation"],
    ["cum caut o firma", "/dashboard", "companies-navigation"],
    ["unde sunt contactele", "/dashboard", "contacts-navigation"],
    ["unde văd dovezile", "/opportunities/abc", "opportunity-evidence"],
    ["cum aman o actiune", "/today", "today-postpone"],
    ["ce este valoarea estimata", "/reports", "estimated-value"],
    ["cum notez feedbackul dupa demo", "/demo", "demo-feedback"]
  ];
  for (const [question, route, expected] of cases) {
    const result = help.findContextualHelp(question, route);
    assert.equal(result.matched, true, question);
    assert.equal(result.entry.id, expected, question);
  }

  const evidenceOnOpportunity = help.findContextualHelp("unde vad dovezile", "/opportunities/abc");
  const evidenceOnAi = help.findContextualHelp("unde vad dovezile", "/ai");
  assert.equal(evidenceOnOpportunity.entry.id, "opportunity-evidence");
  assert.equal(evidenceOnAi.entry.id, "recommendation-evidence");
});

test("unknown questions fail safely without invented answers", () => {
  const result = help.findContextualHelp("Cum configurez sateliți pentru prognoza meteo?", "/dashboard");
  assert.equal(result.matched, false);
  assert.equal(result.entry, null);
  assert.equal(result.suggestions.length, 3);

  const shortKeywordCollision = help.findContextualHelp("Care este prognoza meteo pentru mâine?", "/dashboard");
  assert.equal(shortKeywordCollision.matched, false);
  assert.equal(shortKeywordCollision.entry, null);

  const assistant = read("src/components/guidance/ContextualAssistant.tsx");
  assert.match(assistant, /Nu am găsit încă un răspuns sigur în ghidul produsului\./);
  assert.match(assistant, /nu completează răspunsul prin presupuneri/i);
  assert.doesNotMatch(assistant, /întreabă orice/i);
});

test("assistant is accessible, local, actionable and keeps the existing tour replay", () => {
  const assistant = read("src/components/guidance/ContextualAssistant.tsx");
  const shell = read("src/components/dashboard/AppShell.tsx");
  const header = read("src/components/dashboard/AppHeader.tsx");
  const tour = read("src/components/guidance/GuidedProductTour.tsx");

  assert.match(header, /<AssistantButton/);
  assert.match(shell, /<ContextualAssistant \/>/);
  assert.match(assistant, /Asistent ReveNew/);
  assert.match(assistant, /role="dialog"/);
  assert.match(assistant, /aria-modal="true"/);
  assert.match(assistant, /event\.key === "Escape"/);
  assert.match(assistant, /Întreabă cum folosești ReveNew/);
  assert.match(assistant, /Du-mă acolo/);
  assert.match(assistant, /Arată-mi zona/);
  assert.match(assistant, /Revezi turul introductiv/);
  assert.match(assistant, /Resetează ghidurile închise/);
  assert.match(assistant, /Pagina este deschisă\. Zona nu este disponibilă în starea curentă/);
  assert.doesNotMatch(assistant, /notice \? <p className="sr-only"/);
  assert.match(tour, /revenew:replay-product-guide/);
  assert.doesNotMatch(assistant, /fetch\(|OpenAI|createClient|supabase|streaming|thinking/i);
});

test("navigation uses explicit stable anchors and a temporary namespaced highlight", () => {
  const navigation = read("src/lib/guide-navigation.ts");
  const assistant = read("src/components/guidance/ContextualAssistant.tsx");
  const sources = [
    "src/app/(protected)/dashboard/page.tsx",
    "src/app/(protected)/ai/page.tsx",
    "src/components/inbox/CommercialInboxClient.tsx",
    "src/components/dashboard/TodayActionCard.tsx",
    "src/components/approvals/ApprovalCenterClient.tsx",
    "src/app/(protected)/opportunities/[id]/page.tsx",
    "src/app/(protected)/reports/revenue-recovery-audit/page.tsx",
    "src/components/demo/BuyerFeedbackCapture.tsx"
  ].map(read).join("\n");

  for (const anchor of [
    "dashboard-critical-decision", "ai-recommendation", "inbox-signal-intelligence", "today-action",
    "approvals-human-control", "opportunity-commercial-facts", "opportunity-evidence", "reports-audit-summary", "demo-feedback-fit"
  ]) assert.match(sources, new RegExp(`data-guide-anchor="${anchor}"`));

  assert.match(navigation, /data-revenew-guide-highlight/);
  assert.match(navigation, /window\.setTimeout/);
  assert.match(navigation, /removeAttribute/);
  assert.match(navigation, /if \(!target\) return false/);
  assert.match(navigation, /prefers-reduced-motion/);
  assert.doesNotMatch(navigation + assistant, /getByText|innerText|textContent/);
});

test("assistant copy preserves commercial safety and existing demo/feedback regressions", () => {
  const assistant = read("src/components/guidance/ContextualAssistant.tsx");
  const knowledge = read("src/lib/contextual-help.ts");
  const demo = read("src/app/(protected)/demo/page.tsx");
  const feedback = read("src/app/(protected)/demo/feedback/page.tsx");
  const recommendation = read("src/components/intelligence/RecommendationExplanationCard.tsx");
  const copy = `${assistant}\n${knowledge}`;

  assert.match(copy, /Nicio comunicare externă nu este trimisă automat|nu trimite și nu aplică automat/i);
  assert.match(copy, /valoare estimată.*neconfirmată/i);
  assert.match(copy, /decizie umană/i);
  assert.doesNotMatch(knowledge, /venit garantat|ROI garantat|recuperare automată|Gmail live|Calendar live|voce live|powered by AI|AI chatbot|workspace|pending|ownership|fixture|local demo/i);
  const assistantStringLiterals = [...assistant.matchAll(/"([^"\n]*)"/g)].map((match) => match[1]).join("\n");
  assert.doesNotMatch(assistantStringLiterals, /workspace|pending|ownership|fixture|local demo/i);
  assert.match(demo, /href="\/demo\/feedback"/);
  assert.match(feedback, /Concluzii după demo/);
  assert.match(recommendation, /Dovadă/);
  assert.match(recommendation, /Decizie umană necesară/);
});
