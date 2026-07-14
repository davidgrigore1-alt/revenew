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
      if (id.startsWith("@/")) {
        return {};
      }
      return nodeRequire(id);
    }
  }, { filename });

  return module.exports;
}

const { advancedNavigation, dashboardNavigation, isNavItemActive, primaryNavigation, utilityNavigation } = loadTsModule("src/lib/navigation.ts");

test("navigation config is serializable across server/client boundaries", () => {
  const allItems = [...primaryNavigation, ...utilityNavigation, ...advancedNavigation, ...dashboardNavigation];

  assert.ok(allItems.length > 0);
  for (const item of allItems) {
    assert.equal(typeof item.name, "string");
    assert.equal(typeof item.href, "string");
    assert.equal(typeof item.icon, "string", `${item.href} icon must be a serializable key`);
    assert.equal(typeof item.permission, "string");
  }
});

test("admin navigation remains permission-gated by centralized permission", () => {
  const admin = advancedNavigation.find((item) => item.href === "/admin");

  assert.ok(admin);
  assert.equal(admin.permission, "platform.admin.access");
  assert.equal(admin.icon, "shield-check");
});

test("commercial inbox is a unique primary route directly after home", () => {
  const inboxItems = dashboardNavigation.filter((item) => item.href === "/inbox");

  assert.equal(primaryNavigation[0].href, "/dashboard");
  assert.equal(primaryNavigation[1].href, "/inbox");
  assert.equal(primaryNavigation[2].href, "/today");
  assert.equal(inboxItems.length, 1);
  assert.equal(inboxItems[0].name, "Inbox Comercial");
  assert.equal(inboxItems[0].icon, "inbox-stack");
  assert.equal(inboxItems[0].permission, "signals.read");
  assert.equal(isNavItemActive("/inbox", "/inbox"), true);
  assert.equal(isNavItemActive("/inbox/review", "/inbox"), true);
});
