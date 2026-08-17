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

const sections = compileModel("src/lib/app-section-search.ts");

test("app section search resolves business-friendly Romanian aliases", () => {
  const cases = [
    ["firme", "Companii", "/companies"],
    ["companii", "Companii", "/companies"],
    ["societati", "Companii", "/companies"],
    ["contacte", "Contacte", "/contacts"],
    ["audit", "Începe audit controlat", "/audit/start"],
    ["feedback", "Concluzii după demo", "/demo/feedback"],
    ["demo", "Demo controlat", "/demo"],
    ["setari", "Setări", "/settings"],
    ["ajutor", "Ajutor", "/help"],
    ["aprobări", "Aprobări", "/approvals"]
  ];

  for (const [query, title, href] of cases) {
    const result = sections.searchAppSections(query)[0];
    assert.equal(result?.title, title, query);
    assert.equal(result?.href, href, query);
    assert.equal(result?.group, "Secțiuni", query);
  }
});

test("global search combines local sections with existing tenant-scoped records", () => {
  const search = read("src/components/search/GlobalSearch.tsx");
  const actions = read("src/lib/search/actions.ts");

  assert.match(search, /searchAppSections/);
  assert.match(search, /\[\.\.\.sectionResults, \.\.\.workspaceResults\]/);
  assert.match(search, /Companie, oportunitate sau întrebare comercială/);
  assert.match(actions, /eq\("business_id", businessId\)/);
  assert.match(actions, /requirePermission\("workspace\.read"\)/);
});

test("shared section rhythm separates major modules on AI and Inbox", () => {
  const pageShell = read("src/components/dashboard/PageShell.tsx");
  const globals = read("src/app/globals.css");
  const ai = read("src/app/(protected)/ai/page.tsx");
  const inbox = read("src/components/inbox/CommercialInboxClient.tsx");

  assert.match(pageShell, /app-section-stack mt-8/);
  assert.match(globals, /\.app-section-stack\s*\{[\s\S]*gap: clamp\(1\.75rem, 2\.2vw, 2\.5rem\)/);
  assert.match(ai, /Priorități din datele existente/);
  assert.match(ai, /Registrul complet de capabilități și limite/);
  assert.match(inbox, /<div className="app-section-stack">/);
  assert.match(inbox, /Semnal selectat · inteligență operațională/);
});

test("search and assistant hardening preserve honest product boundaries", () => {
  const sources = [
    read("src/lib/app-section-search.ts"),
    read("src/lib/contextual-help.ts"),
    read("src/components/guidance/ContextualAssistant.tsx"),
    read("src/lib/ai-preparation.ts")
  ].join("\n");

  assert.doesNotMatch(sources, /întreabă orice|powered by AI|chatbot AI|LLM|Gmail live|Calendar live|voce live/i);
  assert.doesNotMatch(sources, /Fallback local/i);
  assert.doesNotMatch(sources, /ROI garantat|venit garantat|recuperare garantată/i);
  assert.match(sources, /ghidului intern/);
  assert.match(sources, /nu trimite și nu aplică automat|Nicio comunicare externă nu este trimisă automat/i);
});
