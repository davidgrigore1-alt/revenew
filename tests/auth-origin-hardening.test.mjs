import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function compileTs(relativePath, aliases = {}) {
  const filename = path.resolve(relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    URL,
    exports: module.exports,
    module,
    require: (id) => aliases[id] ?? nodeRequire(id)
  }, { filename });
  return module.exports;
}

test("bind-only hosts never become browser-facing origins", () => {
  const origin = compileTs("src/lib/browser-origin.ts");
  assert.equal(origin.safeBrowserOrigin("http://0.0.0.0:3001/auth/bootstrap"), "http://localhost:3001");
  assert.equal(origin.safeBrowserOrigin("http://0.0.0.0.:3001/auth/bootstrap"), "http://localhost:3001");
  assert.equal(origin.safeBrowserOrigin("http://[::]:3001/auth/bootstrap"), "http://localhost:3001");
  assert.equal(origin.safeBrowserOrigin("http://localhost:3001/dashboard"), "http://localhost:3001");
  assert.equal(origin.safeBrowserOrigin("http://127.0.0.1:3001/dashboard"), "http://127.0.0.1:3001");
  assert.equal(origin.safeBrowserOrigin("https://app.client.example/dashboard"), "https://app.client.example");
});

test("auth redirects retain safe paths and reject external destinations", () => {
  const origin = compileTs("src/lib/browser-origin.ts");
  const redirects = compileTs("src/lib/auth/redirects.ts", { "@/lib/browser-origin": origin });
  const retry = redirects.browserSafeRedirectUrl(
    "http://0.0.0.0:3001/auth/bootstrap",
    "/auth/bootstrap/retry?reason=profile_rls_denied",
    "/dashboard"
  );
  assert.equal(String(retry), "http://localhost:3001/auth/bootstrap/retry?reason=profile_rls_denied");
  const { NextResponse } = nodeRequire("next/server");
  const response = NextResponse.redirect(retry);
  assert.equal(response.headers.get("location"), "http://localhost:3001/auth/bootstrap/retry?reason=profile_rls_denied");
  assert.doesNotMatch(response.headers.get("location") ?? "", /0\.0\.0\.0|\[::\]/);
  assert.equal(String(redirects.browserSafeRedirectUrl("https://app.client.example/auth/bootstrap", "/onboarding", "/dashboard")), "https://app.client.example/onboarding");
  assert.equal(String(redirects.browserSafeRedirectUrl("https://app.client.example/auth/bootstrap", "https://attacker.example/phish", "/dashboard")), "https://app.client.example/dashboard");
  assert.equal(String(redirects.browserSafeRedirectUrl("https://app.client.example/auth/bootstrap", "//attacker.example/phish", "/dashboard")), "https://app.client.example/dashboard");
});

test("confirmation and password-reset callback URLs sanitize bind origins", () => {
  const origin = compileTs("src/lib/browser-origin.ts");
  const redirects = compileTs("src/lib/auth/redirects.ts", { "@/lib/browser-origin": origin });
  const confirmation = compileTs("src/lib/auth/confirmation.ts", { "@/lib/auth/redirects": redirects });
  assert.equal(
    confirmation.authConfirmationRedirectUrl("http://0.0.0.0:3001", "/onboarding"),
    "http://localhost:3001/auth/callback?next=%2Fonboarding"
  );
  assert.equal(
    confirmation.authConfirmationRedirectUrl("https://app.client.example", "https://attacker.example"),
    "https://app.client.example/auth/callback?next=%2Fonboarding"
  );
  assert.match(read("src/components/auth/ForgotPasswordForm.tsx"), /authConfirmationRedirectUrl\(window\.location\.origin, "\/reset-password"\)/);
});

test("auth route handlers use the hardened redirect boundary", () => {
  const routes = [
    "src/app/auth/bootstrap/route.ts",
    "src/app/auth/callback/route.ts",
    "src/app/auth/recover-session/route.ts",
    "src/app/auth/switch-account/route.ts",
    "src/app/auth/logout/route.ts",
    "src/app/auth/session/clear/route.ts"
  ];
  for (const route of routes) {
    const source = read(route);
    assert.match(source, /browserSafeRedirectUrl/);
    assert.doesNotMatch(source, /new URL\([^\n]*request\.url/);
  }
});

test("generated public URLs reject bind-only configured origins", () => {
  const seo = read("src/lib/seo.ts");
  assert.match(seo, /safeBrowserOrigin/);
  assert.match(seo, /"https:\/\/revenew\.ro"/);
});
