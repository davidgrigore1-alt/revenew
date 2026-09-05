import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import postcss from "postcss";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const read = file => fs.readFileSync(path.resolve(file), "utf8");
function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(read(file), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports, URL,
      require: id => {
        if (id in overrides) return overrides[id];
        if (id === "next/link") return ({ children, ...props }) => React.createElement("a", props, children);
        if (id === "next/navigation") return { redirect: () => { throw Error("Unexpected redirect"); } };
        if (id === "@/lib/auth/auth-state") return { resolveAuthPageState: async () => ({ status: "anonymous" }) };
        if (id === "@/lib/supabase/status") return { isSupabaseConfigured: true };
        if (id === "@/lib/supabase/client") return { createSupabaseBrowserClient: () => { throw Error("Presentation must not call auth"); } };
        if (id.startsWith("@/") || id.startsWith(".")) {
          const base = id.startsWith("@/") ? `src/${id.slice(2)}` : path.resolve(path.dirname(filename), id);
          return load([`${base}.tsx`, `${base}.ts`].find(fs.existsSync));
        }
        return require(id);
      }
    }, { filename });
    return module.exports;
  }
  return load;
}
const load = loader();
const { accentThemePresets } = load("src/lib/theme-presets.ts");
const css = postcss.parse(read("src/app/globals.css"));
function declarations(selector) {
  const result = {};
  css.walkRules(rule => {
    if (rule.parent.type !== "root" || !rule.selectors.includes(selector)) return;
    rule.walkDecls(decl => { if (decl.prop.startsWith("--")) result[decl.prop] = decl.value; });
  });
  return result;
}
function resolve(map, name) {
  return map[name].replace(/var\((--[\w-]+)\)/g, (_, dependency) => resolve(map, dependency));
}
function luminance(value) {
  return value.split(" ").map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); }

test("auth canvas and semantic feedback stay dark and neutral for every workspace theme and accent", () => {
  for (const theme of ["light", "dark"]) for (const accent of accentThemePresets) {
    const root = { ...declarations(":root"), ...(theme === "dark" ? declarations(".dark") : {}), ...accent.tokens };
    const auth = { ...root, ...declarations(".auth-theme") };
    assert.equal(resolve(root, "--background"), theme === "light" ? "255 255 255" : "6 6 6");
    for (const token of ["--background", "--surface", "--surface-subtle", "--surface-muted", "--surface-elevated"]) {
      const channels = resolve(auth, token).split(" ").map(Number);
      assert.equal(new Set(channels).size, 1, `${theme}/${accent.id}/${token}`);
      assert.ok(channels[0] < 30);
    }
    assert.equal(resolve(auth, "--danger-text"), "249 164 164");
    assert.equal(resolve(auth, "--success-text"), "119 222 168");
    assert.equal(resolve(auth, "--warning-text"), "246 196 105");
    assert.equal(resolve(auth, "--primary"), accent.tokens["--rn-accent-400"]);
    for (const action of ["--primary", "--primary-hover", "--primary-active"]) assert.ok(contrast(resolve(auth, action), resolve(auth, "--primary-foreground")) >= 4.5, `${accent.id}/${action}`);
    for (const text of ["--foreground", "--text-muted", "--text-faint"]) assert.ok(contrast(resolve(auth, text), resolve(auth, "--surface")) >= 4.5, text);
    for (const tone of ["success", "warning", "danger", "info"]) assert.ok(contrast(resolve(auth, `--${tone}-text`), resolve(auth, `--${tone}-background`)) >= 4.5, tone);
  }
});

test("theme initialization preserves saved preferences while auth rendering never writes storage", () => {
  const { themeInitScript } = load("src/components/theme/theme-script.ts");
  for (const theme of ["light", "dark", "system"]) for (const systemDark of [false, true]) {
    const saved = new Map([["revenew-theme", theme], ["revenew.theme.accent", "executive-blue"]]);
    const before = [...saved];
    const root = { dataset: {}, style: { setProperty() {} }, classList: { toggle(_name, value) { this.dark = value; }, remove() {} } };
    vm.runInNewContext(themeInitScript(), { window: { localStorage: { getItem: key => saved.get(key), setItem: () => assert.fail("Preference write"), removeItem: () => assert.fail("Preference removal") }, matchMedia: () => ({ matches: systemDark }) }, document: { documentElement: root } });
    const { AuthTheme } = load("src/components/auth/AuthTheme.tsx");
    assert.equal(renderToStaticMarkup(React.createElement(AuthTheme, null, "Cont")), '<div class="auth-theme">Cont</div>');
    assert.equal(root.dataset.theme, theme);
    assert.equal(root.dataset.accentTheme, "executive-blue");
    assert.equal(root.classList.dark, theme === "system" ? systemDark : theme === "dark");
    assert.deepEqual([...saved], before);
  }
});

test("all auth pages render their initial and reason states inside the server dark boundary", async () => {
  const { default: Layout } = load("src/app/(auth)/layout.tsx");
  for (const route of ["login", "signup", "forgot-password", "reset-password", "verify-email"]) {
    const Page = load(`src/app/(auth)/${route}/page.tsx`).default;
    const page = await Page({ searchParams: Promise.resolve({ reason: "invalid_link" }) });
    const html = renderToStaticMarkup(React.createElement(Layout, null, page));
    assert.match(html, /^<div class="auth-theme"><main/);
    assert.doesNotMatch(html, /signup-premium-theme/);
    assert.match(html, /<h1/);
  }
  const Retry = load("src/app/auth/bootstrap/retry/page.tsx").default;
  assert.match(renderToStaticMarkup(React.createElement(Retry)), /^<div class="auth-theme"><main/);
});

test("active-session and unconfirmed account states retain the same auth boundary", async () => {
  for (const status of ["authenticated", "authenticated_unconfirmed", "temporary_auth_failure"]) {
    const scoped = loader({ "@/lib/auth/auth-state": { resolveAuthPageState: async () => ({ status, email: "qa@example.invalid" }) } });
    const Layout = scoped("src/app/(auth)/layout.tsx").default;
    for (const route of ["login", "signup"]) {
      const Page = scoped(`src/app/(auth)/${route}/page.tsx`).default;
      const html = renderToStaticMarkup(React.createElement(Layout, null, await Page({})));
      assert.match(html, /^<div class="auth-theme"><main/);
      assert.match(html, status === "authenticated" ? /Sesiune activă/ : status === "authenticated_unconfirmed" ? /Verifică adresa de email/ : /Reîncearcă/);
    }
  }
});

test("password and recovery fields retain native constraints, labels and shared invalid/focus contracts", () => {
  const { PasswordField } = load("src/components/auth/PasswordField.tsx");
  const html = renderToStaticMarkup(React.createElement(PasswordField, { name: "confirmPassword", label: "Confirmă parola", autoComplete: "new-password", invalid: true, describedBy: "password-error" }));
  for (const expression of [/rn-field focus-ring/, /aria-invalid="true"/, /aria-describedby="password-error"/, /minLength="8"/, /required=""/, /autoComplete="new-password"/, /type="password"/, /aria-pressed="false"/, /aria-label="Arată confirmă parola"/]) assert.match(html, expression);
  const { ForgotPasswordForm } = load("src/components/auth/ForgotPasswordForm.tsx");
  assert.match(renderToStaticMarkup(React.createElement(ForgotPasswordForm)), /rn-field focus-ring/);
});

test("login busy state exposes disabled and aria-busy through the existing Button", () => {
  const values = [null, true, {}, "", 0, 0, null];
  const scoped = loader({ react: { ...React, useState: initial => [values.length ? values.shift() : initial, () => {}], useRef: () => ({ current: null }), useCallback: fn => fn } });
  const { AuthForm } = scoped("src/components/auth/AuthForm.tsx");
  const html = renderToStaticMarkup(AuthForm({ mode: "login" }));
  assert.match(html, /disabled="" aria-busy="true"/);
  assert.match(html, /Se procesează/);
});
