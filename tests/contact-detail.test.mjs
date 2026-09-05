import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText;
    vm.runInNewContext(compiled, { module, exports: module.exports, Date, Map, Set, URL, URLSearchParams, Intl, require: (id) => {
      if (id in overrides) return overrides[id];
      if (id === "server-only") return {};
      if (id.endsWith(".module.css")) return new Proxy({}, { get: (_target, key) => key === "__esModule" ? false : String(key) });
      if (id === "next/link") return ({ children, ...props }) => React.createElement("a", props, children);
      if (id === "@/components/filters/SavedViewControls") return { SavedViewControls: () => null };
      if (id === "react" && file.endsWith("ContactsRegistry.tsx")) return { ...React, useMemo: (fn) => fn() };
      if (id.startsWith("@/")) {
        const base = path.resolve("src", id.slice(2));
        return load(base + (fs.existsSync(base + ".ts") ? ".ts" : ".tsx"));
      }
      return require(id);
    } }, { filename: file });
    return module.exports;
  }
  return load;
}
let notesProps;
const load = loader({
  "@/components/guidance/ContextualAssistant": { AssistantButton: () => React.createElement("button", null, "Întreabă ReveNew") },
  "@/components/workspace/RecordNotes": { RecordNotes: props => { notesProps = props; return React.createElement("section", { "aria-label": "Note existente" }); } }
});
const { ContactDetail } = load("src/components/crm/ContactDetail.tsx");
const contact = { id: "c", businessId: "b", fullName: "Andrei Ionescu", jobTitle: "Director Comercial", decisionRole: "decision_maker", organizationId: "co", organization: { id: "co", name: "Meridian Logistics" }, email: "andrei@example.invalid" };
const opportunity = (id, extra = {}) => ({ id, title: `Proiect ${id}`, status: "new", estimatedValueHigh: 42000, currency: "RON", ownerName: "Irina", recommendedAction: "Confirmă termenul", ...extra });
const render = (extra = {}) => renderToStaticMarkup(React.createElement(ContactDetail, { contact, primary: "confirmed", opportunities: [], notes: [], ...extra }));

test("identity links to canonical company and primary stays explicit and quiet", () => {
  const output = render();
  assert.match(output, /href="\/crm\/organizations\/co"/);
  assert.match(output, /Contact principal/);
  assert.match(output, /Decident/);
  assert.equal((output.match(/andrei@example.invalid/g) || []).length, 1);
  assert.doesNotMatch(render({ primary: "none" }), /Contact principal|Nu este principal/);
  assert.match(render({ primary: "ambiguous" }), /Principal de clarificat/);
  assert.match(render({ primary: "unknown" }), /Principal neconfirmat/);
});
test("active work precedes a collapsed closed history using canonical lifecycle", () => {
  const output = render({ opportunities: [opportunity("closed", { lifecycleStatus: "lost" }), opportunity("active", { status: "won", lifecycleStatus: "open" })] });
  const history = output.indexOf('<details');
  assert.ok(output.indexOf('href="/opportunities/active"') < history);
  assert.ok(output.indexOf('href="/opportunities/closed"') > history);
  assert.doesNotMatch(output, /<details[^>]*\sopen/);
  assert.match(output, /Context înregistrat/);
  assert.match(output, /Pas recomandat/);
});
test("values remain labeled estimates with explicit currencies and no invented default", () => {
  const output = render({ opportunities: [opportunity("ron"), opportunity("eur", { currency: "EUR", estimatedValueHigh: 12 }), opportunity("unknown", { currency: undefined })] });
  assert.equal((output.match(/Valoare estimată/g) || []).length, 3);
  assert.match(output, /42\.000 RON/);
  assert.match(output, /12 EUR/);
  assert.match(output, /Monedă neconfirmată/);
  assert.doesNotMatch(output, /84\.012|Venit confirmat/);
});
test("missing and closed-only states retain real history without implying active work", () => {
  const output = render({ contact: { ...contact, organization: null, phone: null, department: null, email: null }, opportunities: [opportunity("old", { lifecycleStatus: "won" })] });
  assert.match(output, /Companie indisponibilă/);
  assert.match(output, /Nicio oportunitate activă asociată/);
  assert.match(output, /href="\/opportunities\/old"/);
  assert.equal((output.match(/Necompletat/g) || []).length, 3);
});
test("notes receive identical records and target; assistant and human control remain", () => {
  const notes = [{ id: "n", content: "Context existent", pinned: true, canEdit: false }];
  const output = render({ notes });
  assert.equal(notesProps.targetType, "contact");
  assert.equal(notesProps.targetId, "c");
  assert.equal(notesProps.notes, notes);
  assert.match(output, /Întreabă ReveNew/);
  assert.match(output, /nu autorizează execuție externă/);
  assert.match(output, /controlului uman/);
});
