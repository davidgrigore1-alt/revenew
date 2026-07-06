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
      return nodeRequire(id);
    }
  }, { filename });

  return module.exports;
}

const { isMissingRelationError, toSafeDatabaseErrorMessage } = loadTsModule("src/lib/supabase/database-errors.ts");

test("recognizes PostgreSQL 42P01 missing platform_user_roles", () => {
  assert.equal(
    isMissingRelationError({ code: "42P01", message: 'relation "public.platform_user_roles" does not exist' }, "platform_user_roles"),
    true
  );
});

test("recognizes PostgREST PGRST205 schema-cache miss for platform_user_roles", () => {
  assert.equal(
    isMissingRelationError(
      {
        code: "PGRST205",
        message: "Could not find the table `public.platform_user_roles` in the schema cache"
      },
      "platform_user_roles"
    ),
    true
  );
});

test("does not classify permission, RLS, auth, timeout or generic errors as missing relation", () => {
  const errors = [
    { code: "42501", message: "permission denied for table platform_user_roles" },
    { code: "PGRST301", message: "JWT expired" },
    { code: "PGRST116", message: "The result contains 0 rows" },
    { code: "57014", message: "canceling statement due to statement timeout" },
    { code: "XX000", message: "internal error near platform_user_roles" },
    { code: "PGRST205", message: "Could not find relationship in the schema cache for platform_user_roles" }
  ];

  for (const error of errors) {
    assert.equal(isMissingRelationError(error, "platform_user_roles"), false, error.message);
  }
});

test("safe database error messages expose only stable codes", () => {
  assert.equal(toSafeDatabaseErrorMessage({ code: "PGRST205", message: "raw table text" }), "PGRST205");
  assert.equal(toSafeDatabaseErrorMessage({ message: "raw table text" }), "database_error");
});
