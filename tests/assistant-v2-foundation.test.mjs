import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function compileModel(relativePath) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module }, { filename });
  return module.exports;
}

const help = compileModel("src/lib/contextual-help.ts");
const search = compileModel("src/lib/app-section-search.ts");

test("assistant v2 explains key screens with route-specific, human-controlled guidance", () => {
  const assistant = read("src/components/guidance/ContextualAssistant.tsx");
  assert.match(assistant, /Explică această pagină/);
  assert.match(assistant, />Asistent</);
  assert.match(assistant, /Asistent ReveNew/);
  assert.match(assistant, /Ghid intern pentru folosirea produsului\./);
  assert.match(assistant, /Ești deja aici/);
  assert.match(assistant, /Orientare pe pagină/);
  const explainAction = assistant.slice(assistant.indexOf("function explainCurrentScreen"), assistant.indexOf("function submit"));
  assert.doesNotMatch(explainAction, /setQuestion/);
  const cases = [
    ["/dashboard", "screen-dashboard", "Control Center"],
    ["/inbox", "screen-inbox", "Inbox Comercial"],
    ["/today", "screen-today", "Activitatea mea"],
    ["/audit/start", "screen-audit", "20–50"],
    ["/help", "screen-help", "Ajutor"],
    ["/opportunities/de300006-0000-4000-8000-000000000006", "screen-opportunity", "valoarea estimată"],
    ["/reports", "screen-reports", "rezultatele confirmate"]
  ];
  for (const [route, id, copy] of cases) {
    const result = help.getScreenExplanation(route);
    assert.equal(result.matched, true);
    assert.equal(result.mode, "clarify");
    assert.equal(result.entry.id, id);
    assert.match(result.entry.shortAnswer, new RegExp(copy, "i"));
    assert.equal(result.entry.steps.length, 5);
    assert.match(result.entry.steps[0], /^Unde te afli:/);
    assert.match(result.entry.steps[4], /^Următorul pas sigur:/);
    assert.ok(result.suggestions.length >= 2);
  }
});

test("assistant copy remains a bounded product guide", () => {
  const surfaces = `${read("src/components/guidance/ContextualAssistant.tsx")}\n${read("src/lib/contextual-help.ts")}`;
  assert.doesNotMatch(surfaces, /Ghid AI|chatbot AI|\bLLM\b|întreabă orice|AI-ul știe|răspuns garantat/i);
  for (const route of ["src/app/(protected)/audit/start/page.tsx", "src/app/(protected)/settings/page.tsx", "src/app/(protected)/demo/feedback/page.tsx"]) assert.equal(fs.existsSync(path.resolve(route)), true, route);
});

test("vague guidance requests clarify the current screen instead of falling back", () => {
  for (const question of ["nu înțeleg ce fac aici", "ajută-mă", "nu știu unde să merg", "unde încep"]) {
    const result = help.findContextualHelp(question, "/inbox");
    assert.equal(result.matched, true, question);
    assert.equal(result.mode, "clarify", question);
    assert.equal(result.entry.id, "screen-inbox", question);
    assert.equal(result.entry.steps.length, 5, question);
    assert.ok(result.suggestions.length >= 2, question);
  }
});

test("existing deterministic answers remain available and unrelated questions fail safely", () => {
  const cases = [
    ["unde sunt firmele", "/dashboard", "companies-navigation"],
    ["cum adaug logo-ul firmei", "/dashboard", "settings-logo"],
    ["cum încep auditul", "/dashboard", "controlled-audit"],
    ["cum asociez un contact acestei oportunități", "/opportunities/abc", "opportunity-contact"],
    ["unde văd dovezile", "/opportunities/abc", "opportunity-evidence"],
    ["cum amân o acțiune", "/today", "today-postpone"]
  ];
  for (const [question, route, id] of cases) assert.equal(help.findContextualHelp(question, route).entry.id, id);
  const weather = help.findContextualHelp("cum e vremea mâine", "/dashboard");
  assert.equal(weather.matched, false);
  assert.equal(weather.mode, "fallback");
  assert.equal(weather.entry, null);
});

test("assistant drawer uses a short composited transition and preserves keyboard close", () => {
  const assistant = read("src/components/guidance/ContextualAssistant.tsx");
  assert.match(assistant, /ASSISTANT_TRANSITION_MS = 160/);
  assert.match(assistant, /transition-\[transform,opacity\]/);
  assert.match(assistant, /duration-\[160ms\]/);
  assert.match(assistant, /motion-reduce:transition-none/);
  assert.match(assistant, /event\.key === "Escape"/);
  assert.match(assistant, /returnFocusRef\.current\?\.focus/);
  assert.match(assistant, /useMemo\(\(\) => suggestedHelpQuestions\(pathname\)/);
  assert.doesNotMatch(assistant, /backdrop-blur/);
});

test("section search resolves personalization, currency and controlled audit aliases", () => {
  const cases = [
    ["culoare", "settings-appearance", "/settings#aspect"],
    ["tema", "settings-appearance", "/settings#aspect"],
    ["branding", "settings-identity", "/settings#identitate"],
    ["identitate", "settings-identity", "/settings#identitate"],
    ["moneda", "settings-identity", "/settings#identitate"],
    ["audit controlat", "audit-start", "/audit/start"],
    ["firme", "companies", "/companies"]
  ];
  for (const [query, id, href] of cases) {
    const result = search.searchAppSections(query)[0];
    assert.equal(result?.id, id, query);
    assert.equal(result?.href, href, query);
  }
});

test("controlled audit entry is concise and preserves commercial safety", () => {
  const demo = read("src/app/(protected)/demo/page.tsx");
  assert.match(demo, /Începe audit controlat/);
  assert.match(demo, /20–50/);
  assert.match(demo, /datele comerciale pot fi anonimizate/i);
  assert.match(demo, /nu necesită acces complet la inbox/i);
  assert.match(demo, /nicio comunicare externă nu este trimisă automat/i);
  assert.match(demo, /fără promisiuni de venit/i);
  assert.doesNotMatch(demo, /ROI garantat|venit garantat|recuperare garantată/i);
});
