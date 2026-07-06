import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("tools page filters modules server-side before rendering internal tools", () => {
  const source = read("src/app/(protected)/tools/page.tsx");

  assert.equal(source.includes("getAuthorizationContext"), true);
  assert.equal(source.includes("hasPermission(authorization, module.permission)"), true);
  assert.equal(source.includes("advancedNavigation"), false);
  assert.equal(source.includes("platform.admin.access"), true);
  assert.equal(source.includes("platform.internal_tools.access"), true);
  assert.equal(source.includes("internalTools.length ?"), true);
});

test("admin layout requires exact platform admin permission before rendering admin nav", () => {
  const source = read("src/app/(protected)/admin/layout.tsx");

  assert.equal(source.includes("getAuthorizationContext"), true);
  assert.equal(source.includes('hasPermission(authorization, "platform.admin.access")'), true);
  assert.equal(source.includes("ForbiddenState"), true);
  assert.ok(source.indexOf('hasPermission(authorization, "platform.admin.access")') < source.indexOf("adminLinks.map"));
});

test("demo is classified as internal and direct route is permission gated", () => {
  const demoPage = read("src/app/(protected)/demo/page.tsx");
  const policies = read("src/lib/authz/route-policies.ts");

  assert.equal(demoPage.includes('requirePermission("platform.internal_tools.access")'), true);
  assert.equal(policies.includes('{ prefix: "/demo", permission: "platform.internal_tools.access" }'), true);
});
