import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

function compileTs(relativePath, aliases = {}) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    URL,
    URLSearchParams,
    require: (id) => aliases[id] ?? nodeRequire(id)
  }, { filename });
  return module.exports;
}

const redirects = compileTs("src/lib/auth/redirects.ts");
const confirmation = compileTs("src/lib/auth/confirmation.ts", { "@/lib/auth/redirects": redirects });
const searchable = compileTs("src/lib/forms/searchable-options.ts");

test("confirmation input supports PKCE and token-hash email links", () => {
  const byCode = confirmation.getAuthConfirmationInput(new URLSearchParams("code=auth-code&next=%2Fonboarding"));
  assert.equal(byCode.method, "code");
  assert.equal(byCode.next, "/onboarding");

  const byHash = confirmation.getAuthConfirmationInput(new URLSearchParams("token_hash=token-value&type=signup&next=%2Fonboarding"));
  assert.equal(byHash.method, "token_hash");
  assert.equal(byHash.type, "signup");
  assert.equal(byHash.next, "/onboarding");
});

test("confirmation destinations reject external and protocol-relative redirects", () => {
  for (const unsafe of ["https://attacker.example", "//attacker.example/path", "/unknown-route"]) {
    const result = confirmation.getAuthConfirmationInput(new URLSearchParams({ code: "auth-code", next: unsafe }));
    assert.equal(result.next, "/onboarding");
  }
  assert.equal(confirmation.authConfirmationRedirectUrl("http://localhost:3001/", "/onboarding"), "http://localhost:3001/auth/callback?next=%2Fonboarding");
});

test("password recovery remains isolated from normal signup confirmation", () => {
  const recovery = confirmation.getAuthConfirmationInput(new URLSearchParams("token_hash=token-value&type=recovery"));
  assert.equal(recovery.passwordRecovery, true);
  const signup = confirmation.getAuthConfirmationInput(new URLSearchParams("token_hash=token-value&type=signup"));
  assert.equal(signup.passwordRecovery, false);
});

test("county search is diacritic tolerant and preserves canonical values", () => {
  const counties = [
    { value: "RO-B", label: "București" },
    { value: "RO-CJ", label: "Cluj" }
  ];
  assert.deepEqual(searchable.filterSearchableOptions(counties, "Bucuresti"), [{ value: "RO-B", label: "București" }]);
  assert.equal(searchable.exactSearchableOption(counties, "bucuresti").value, "RO-B");
  assert.equal(searchable.exactSearchableOption(counties, "Cluj").label, "Cluj");
});

test("signup recovery and county selection keep the required interaction contracts", () => {
  const signupPanel = read("src/components/auth/SignupConfirmationPanel.tsx");
  const onboarding = read("src/components/onboarding/OnboardingForm.tsx");
  const callback = read("src/app/auth/callback/route.ts");
  const authState = read("src/lib/auth/auth-state.ts");

  assert.match(signupPanel, /addEventListener\("focus"/);
  assert.match(signupPanel, /visibilitychange/);
  assert.match(signupPanel, /auth\.getUser\(\)/);
  assert.match(signupPanel, /auth\.resend/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /verifyOtp/);
  assert.match(authState, /getPostBusinessDestination/);

  assert.match(onboarding, /onPointerDown/);
  assert.match(onboarding, /choose\(option\)/);
  assert.match(onboarding, /administrativeAreaDisplayName/);
  assert.doesNotMatch(onboarding, /administrativeArea: value, city: ""/);
});
