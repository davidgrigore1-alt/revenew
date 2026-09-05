import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: id => {
      if (id === "next/link") return ({ children, ...props }) => React.createElement("a", props, children);
      if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
      return require(id);
    }
  }, { filename });
  return module.exports;
}
const { Button } = load("src/components/ui/Button.tsx");
const { Input } = load("src/components/ui/Input.tsx");
const { Textarea } = load("src/components/ui/Textarea.tsx");
const { Checkbox } = load("src/components/ui/Checkbox.tsx");
const { Select } = load("src/components/ui/Select.tsx");
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test("busy actions retain their accessible label and cannot submit or retain a navigation destination", () => {
  const label = "Pregătește documentul comercial pentru revizuirea echipei responsabile";
  const busy = render(Button, { children: label, loading: true, type: "submit" });
  assert.match(busy, /^<button[^>]*type="submit"/);
  assert.match(busy, /disabled=""/);
  assert.match(busy, /aria-busy="true"/);
  assert.ok(busy.includes(label));
  assert.match(busy, /aria-hidden="true"[^>]*rn-button-spinner/);
  for (const state of [{ disabled: true }, { loading: true }]) {
    const link = render(Button, { ...state, href: "/destination", children: label });
    assert.match(link, /^<span role="link" aria-disabled="true"/);
    assert.doesNotMatch(link, /href=|tabindex=/);
    assert.ok(link.includes(label));
  }
  assert.match(render(Button, { href: "/destination", children: label }), /^<a href="\/destination"/);
});

test("action defaults are non-submit and explicit full width does not change hierarchy", () => {
  const intrinsic = render(Button, { children: "Salvează" });
  assert.match(intrinsic, /^<button type="button"/);
  assert.doesNotMatch(intrinsic, /(?:^|\s)w-full(?:\s|")/);
  const wide = render(Button, { children: "Șterge", fullWidth: true, variant: "danger", size: "compact" });
  assert.match(wide, /\sw-full[\s"]/);
  assert.match(wide, /--danger-solid/);
  assert.doesNotMatch(wide, /--primary\)/);
});

test("field invalid state cannot be contradicted by a false aria prop and native form attributes survive", () => {
  for (const component of [Input, Textarea]) {
    const html = render(component, { id: "note", name: "note", defaultValue: "Conținut", invalid: true, "aria-invalid": false, "aria-describedby": "reason", required: true });
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-describedby="reason"/);
    assert.match(html, /id="note"/);
    assert.match(html, /name="note"/);
    assert.match(html, /required=""/);
    assert.ok(html.includes("Conținut"));
    assert.match(render(component, { "aria-invalid": "grammar" }), /aria-invalid="grammar"/);
    assert.doesNotMatch(render(component, { invalid: false }), /aria-invalid="true"/);
  }
});

test("native checkbox owns checked semantics for controlled and uncontrolled forms", () => {
  const uncontrolled = render(Checkbox, { defaultChecked: true, name: "selection", value: "record-1" });
  assert.match(uncontrolled, /type="checkbox"/);
  assert.match(uncontrolled, /checked=""/);
  assert.match(uncontrolled, /name="selection"/);
  assert.match(uncontrolled, /value="record-1"/);
  assert.doesNotMatch(uncontrolled, /aria-checked=/);
  const controlled = render(Checkbox, { checked: false, onChange() {}, disabled: true });
  assert.doesNotMatch(controlled, /checked=""/);
  assert.match(controlled, /disabled=""/);
  // Native indeterminate/checked transitions, including reset, are browser-verified.
  assert.match(uncontrolled, /aria-hidden="true"[^>]*rn-checkbox-mark/);
});

test("Select preserves native form values and exposes validation on the visible combobox", () => {
  const html = render(Select, {
    name: "stage", defaultValue: "two", invalid: true, "aria-label": "Etapă", required: true,
    children: [React.createElement("option", { value: "one", key: "one" }, "Prima"), React.createElement("option", { value: "two", key: "two" }, "A doua")]
  });
  assert.match(html, /<select[^>]*name="stage"[^>]*required=""[^>]*aria-hidden="true"/);
  assert.match(html, /<option value="two" selected="">A doua<\/option>/);
  assert.match(html, /<button[^>]*role="combobox"[^>]*aria-label="Etapă"[^>]*aria-invalid="true"/);
  assert.match(html, /<span class="min-w-0 truncate">A doua<\/span>/);
});

test("Champagne and Executive Blue focus colors contrast with light, dark and graphite sidebar surfaces", () => {
  const { accentThemePresets } = load("src/lib/theme-presets.ts");
  function luminance(rgb) {
    const parts = rgb.split(" ").map(Number).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
    return parts[0] * .2126 + parts[1] * .7152 + parts[2] * .0722;
  }
  for (const preset of accentThemePresets.filter(p => ["champagne", "executive-blue"].includes(p.id))) {
    for (const [token, background] of [["--rn-accent-ring", "255 255 255"], ["--rn-accent-400", "12 12 12"], ["--rn-accent-400", "46 49 58"]]) {
      const a = luminance(preset.tokens[token]), b = luminance(background);
      const contrast = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      assert.ok(contrast >= 3, `${preset.id} ${background}: ${contrast}`);
    }
  }
});
