import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    require: (id) => {
      if (id === "server-only") return {};
      if (id.startsWith("@/")) return {};
      return nodeRequire(id);
    }
  }, { filename });

  return module.exports;
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

test("every protected app route has an explicit route policy", () => {
  const { routePolicies } = loadTsModule("src/lib/authz/route-policies.ts");
  const policyPrefixes = new Set(routePolicies.map((policy) => policy.prefix));
  const expected = [
    "/admin",
    "/dashboard",
    "/demo",
    "/help",
    "/inbox",
    "/leads",
    "/opportunities",
    "/opportunities/analyze",
    "/recoverable",
    "/reports",
    "/results",
    "/settings",
    "/today",
    "/tools",
    "/outreach"
  ];

  for (const route of expected) {
    assert.ok(policyPrefixes.has(route), `${route} missing from routePolicies`);
  }
});

test("final authorization SQL package contains raw executable SQL files", () => {
  const dir = path.resolve("docs/sql/authorization-final");
  const expected = [
    "00_AUTHORIZATION_PREFLIGHT.sql",
    "01_APPLY_CORE_AUTHORIZATION.sql",
    "02_AUTHORIZATION_VERIFY.sql",
    "03_GRANT_PLATFORM_ADMIN_PAWZOO24.sql",
    "04_AUTHORIZATION_RLS_REGRESSION.sql",
    "05_REVOKE_PLATFORM_ADMIN_PAWZOO24.sql",
    "06_REACTIVATE_PLATFORM_ADMIN_PAWZOO24.sql",
    "07_AUTHORIZATION_EMERGENCY_DISABLE.sql"
  ];

  for (const name of expected) {
    const fullPath = path.join(dir, name);
    assert.ok(fs.existsSync(fullPath), `${name} missing`);
    const sql = fs.readFileSync(fullPath, "utf8");
    assert.equal(sql.includes("```"), false, `${name} contains Markdown fence`);
    assert.equal(/\bTODO\b|REPLACE_ME|\.\.\./.test(sql), false, `${name} contains placeholder text`);
  }
});

test("application code does not hardcode Pawzoo24 as authorization authority", () => {
  const files = walkFiles("src").filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(text.includes("pawzoo24@gmail.com"), false, `${file} contains Pawzoo24 email`);
  }
});

test("application code never references businesses.owner_id", () => {
  const files = walkFiles("src").filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(/\bowner_id\b/.test(text), false, `${file} references owner_id instead of owner_profile_id`);
  }
});

test("no browser-facing role mutation route or action is present", () => {
  const files = walkFiles("src").filter((file) => /\.(ts|tsx)$/.test(file));
  const suspicious = /(platform_user_roles|role_audit_log).*\.(insert|update|upsert|delete)|roles\.(assign|update|delete)|assignRole|updateRole|deleteRole|role-management/i;

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    if (file.endsWith(path.join("src", "lib", "authz", "get-authorization-context.ts"))) continue;
    assert.equal(suspicious.test(text), false, `${file} looks like a role mutation surface`);
  }
});
