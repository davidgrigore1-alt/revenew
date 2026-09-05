import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const dummy = { email: "phase1e@example.invalid", password: "DUMMY-Only-Phase1E!", confirmPassword: "DUMMY-Only-Phase1E!", fullName: "Verificare Locală", phoneCountry: "RO", phone: "+40721000000", acceptedTerms: "on" };

// Execute the real components and submit handlers; only browser/provider boundaries are substitutes.
function loader(overrides = {}, globals = {}) {
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
      module, exports: module.exports, URL, console: { error() {} }, ...globals,
      require: id => {
        if (id in overrides) return overrides[id];
        if (id === "next/link") return ({ children, ...props }) => React.createElement("a", props, children);
        if (id === "@/lib/supabase/status") return { isSupabaseConfigured: false };
        if (id === "@/lib/supabase/client") return { createSupabaseBrowserClient: () => assert.fail("Unexpected provider access") };
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

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

function harness(name, props = {}, initial = {}) {
  let cursor = 0;
  const states = [];
  const calls = [];
  let respond;
  const pending = new Promise(resolve => { respond = resolve; });
  const location = { origin: "http://localhost:3000", href: "http://localhost:3000/login", assign(value) { this.href = value; } };
  const provider = new Proxy({}, { get: (_target, method) => payload => { calls.push({ method, payload }); return method === "signOut" ? Promise.resolve({ error: null }) : pending; } });
  const load = loader({
    react: { ...React, useState: value => {
      const slot = cursor++;
      if (!(slot in states)) states[slot] = slot in initial ? initial[slot] : typeof value === "function" ? value() : value;
      return [states[slot], next => { states[slot] = typeof next === "function" ? next(states[slot]) : next; }];
    }, useRef: () => ({ current: null }), useCallback: fn => fn, useEffect() {} },
    "@/lib/supabase/status": { isSupabaseConfigured: true },
    "@/lib/supabase/client": { createSupabaseBrowserClient: () => ({ auth: provider }) }
  }, {
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? null; } },
    window: { location, requestAnimationFrame: fn => fn() }, document: { getElementById: () => null }
  });
  const Component = load(`src/components/auth/${name}.tsx`)[name];
  function render() { cursor = 0; return Component(props); }
  function form() { return elements(render(), node => node.type === "form")[0]; }
  function submit(values = dummy) {
    let cancelled = false;
    const result = form().props.onSubmit({ currentTarget: values, preventDefault() { cancelled = true; } });
    assert.equal(cancelled, true, "native navigation must be cancelled synchronously");
    return result;
  }
  function submitButton() { return elements(render(), node => node.props.type === "submit")[0]; }
  return { form, submit, submitButton, calls, respond, states, location };
}

test("server-rendered login, signup, reset and recovery forms declare POST before hydration", () => {
  const load = loader();
  for (const [name, props, fields] of [
    ["AuthForm", { mode: "login" }, ["email", "password"]],
    ["AuthForm", { mode: "signup" }, ["email", "password", "confirmPassword"]],
    ["ResetPasswordForm", {}, ["password", "confirmPassword"]],
    ["ForgotPasswordForm", {}, ["email"]]
  ]) {
    const html = renderToStaticMarkup(React.createElement(load(`src/components/auth/${name}.tsx`)[name], props));
    const forms = [...html.matchAll(/<form\b([^>]*)>/g)];
    assert.equal(forms.length, 1);
    assert.match(forms[0][1], /\bmethod="post"/);
    assert.doesNotMatch(html, /\bformMethod=|\bformAction=|\baction=/i);
    for (const field of fields) assert.ok(html.includes(`name="${field}"`), `${name}/${field}`);
    assert.doesNotMatch(html, /DUMMY-Only|phase1e@example/);
  }
});

test("hydrated login preserves provider payload, Enter-submit boundary, busy guard and success redirect", async () => {
  const h = harness("AuthForm", { mode: "login" });
  assert.equal(h.form().props.method, "post");
  assert.equal(h.submitButton().props.type, "submit");
  const task = h.submit({ ...dummy, email: "  PHASE1E@EXAMPLE.INVALID  " });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].method, "signInWithPassword");
  assert.deepEqual({ ...h.calls[0].payload }, { email: dummy.email, password: dummy.password });
  assert.equal(h.submitButton().props.loading, true);
  assert.equal(h.submitButton().props.disabled, true);
  await h.submit();
  assert.equal(h.calls.length, 1, "busy submission must not duplicate auth");
  h.respond({ error: null });
  await task;
  assert.equal(h.location.href, "/auth/bootstrap?intent=login");
  assert.ok(!h.location.href.includes(dummy.password));
});

test("login validation and provider errors retain cancellation, errors and retry availability", async () => {
  const h = harness("AuthForm", { mode: "login" });
  await h.submit({ ...dummy, email: "invalid" });
  assert.equal(h.calls.length, 0);
  assert.ok(h.states[2].email);
  const task = h.submit();
  h.respond({ error: { message: "invalid login credentials" } });
  await task;
  assert.equal(h.states[0].message, "Emailul sau parola nu sunt corecte.");
  assert.equal(h.submitButton().props.disabled, false);
  assert.equal(h.location.href, "http://localhost:3000/login");
});

test("signup retains wizard interception and existing signUp boundary without native navigation", async () => {
  const first = harness("AuthForm", { mode: "signup" });
  await first.submit();
  assert.equal(first.calls.length, 0);
  assert.equal(first.states[5], 1);
  const h = harness("AuthForm", { mode: "signup" }, { 5: 3 });
  const task = h.submit();
  assert.equal(h.calls[0].method, "signUp");
  assert.equal(h.calls[0].payload.email, dummy.email);
  assert.equal(h.calls[0].payload.password, dummy.password);
  assert.equal(h.calls[0].payload.options.data.full_name, dummy.fullName);
  assert.ok(!h.calls[0].payload.options.emailRedirectTo.includes(dummy.password));
  h.respond({ data: { user: { id: "dummy-user" }, session: null }, error: null });
  await task;
  assert.equal(h.states[3], dummy.email);
  assert.equal(h.location.href, "http://localhost:3000/login");
});

test("reset retains mismatch validation, updateUser, signOut and password-updated redirect", async () => {
  const h = harness("ResetPasswordForm", {}, { 1: true });
  assert.equal(h.form().props.method, "post");
  await h.submit({ ...dummy, confirmPassword: "DUMMY-Mismatch!" });
  assert.equal(h.calls.length, 0);
  assert.equal(h.states[2], "Parolele nu coincid.");
  const task = h.submit();
  assert.equal(h.calls[0].method, "updateUser");
  assert.equal(h.calls[0].payload.password, dummy.password);
  assert.equal(h.submitButton().props.disabled, true);
  h.respond({ error: null });
  await task;
  assert.equal(h.calls[1].method, "signOut");
  assert.equal(h.location.href, "/login?reason=password_updated");
});

test("recovery retains normalized email and existing resetPasswordForEmail boundary", async () => {
  const h = harness("ForgotPasswordForm");
  assert.equal(h.form().props.method, "post");
  const task = h.submit({ email: "  PHASE1E@EXAMPLE.INVALID  " });
  assert.equal(h.calls[0].method, "resetPasswordForEmail");
  assert.equal(h.calls[0].payload, dummy.email);
  assert.equal(h.submitButton().props.loading, true);
  h.respond({ error: null });
  await task;
  assert.equal(h.states[1], true);
  assert.equal(h.submitButton().props.disabled, false);
});
