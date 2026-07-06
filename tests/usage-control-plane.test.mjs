import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const source = read(relativePath);
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
      if (id === "@/lib/openai/client") {
        return { getOpenAIErrorCode: () => null };
      }
      if (id === "@/lib/usage/pricing-registry") {
        return loadTsModule("src/lib/usage/pricing-registry.ts");
      }
      if (id.startsWith("@/")) return {};
      return nodeRequire(id);
    }
  }, { filename });

  return module.exports;
}

test("usage pricing uses integer micro-units and stable pricing versions", () => {
  const pricingSource = read("src/lib/usage/pricing-registry.ts");
  const calculator = loadTsModule("src/lib/usage/cost-calculator.ts");

  assert.equal(pricingSource.includes("inputMicrosPerToken"), false);
  assert.equal(pricingSource.includes("outputMicrosPerToken"), false);
  assert.equal(pricingSource.includes("inputMicrosPerMillionTokens"), true);
  assert.equal(pricingSource.includes("outputMicrosPerMillionTokens"), true);
  assert.equal(pricingSource.includes('version: "2026-06-24"'), true);
  assert.equal(
    calculator.calculateEstimatedCostMicros({
      provider: "openai",
      model: "gpt-4o-mini",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000
    }),
    750_000
  );
});

test("production usage mode fails closed unless explicitly configured", () => {
  const source = read("src/lib/usage/usage-mode.ts");

  assert.equal(source.includes('process.env.NODE_ENV === "production" ? "enforce" : "observe"'), true);
});

test("paid AI routes pass lifecycle metadata and do not meter local fallback", () => {
  for (const route of ["src/app/api/ai/analyze-opportunity/route.ts", "src/app/api/ai/generate-document/route.ts"]) {
    const source = read(route);

    assert.equal(source.includes("classifyOpenAIProviderFailure"), true, route);
    assert.equal(source.includes("request.headers.get(\"x-request-id\")"), true, route);
    assert.equal(source.includes("costStatus: completion.usage ? \"provider_confirmed\" : \"estimated\""), true, route);
    assert.equal(source.includes("latencyMs: Date.now() - providerStartedAt"), true, route);
    assert.ok(source.indexOf("if (!isOpenAIConfigured())") < source.indexOf("const idempotencyKey"), "local fallback must happen before reservation setup");
  }
});

test("usage reservation lifecycle records idempotency, confirmation, release and failure metadata", () => {
  const source = read("src/lib/usage/reserve-usage.ts");

  for (const token of [
    "p_idempotency_key",
    "p_request_id",
    "p_expected_cost_micros",
    "p_confirmed_cost_micros",
    "p_cost_status",
    "p_pricing_version",
    "p_latency_ms",
    "p_billable_failure",
    "release_revenew_usage"
  ]) {
    assert.equal(source.includes(token), true, token);
  }
});

test("usage SQL package supports richer lifecycle and remains security-scoped", () => {
  const migration = read("supabase/migrations/202606240001_usage_metering.sql");
  const policies = read("supabase/migrations/202606240003_usage_metering_platform_role_policies.sql");

  for (const token of [
    "confirmed_cost_micros",
    "cost_status",
    "pricing_version",
    "request_id",
    "operation_type",
    "reservation_status",
    "execution_status",
    "retry_count",
    "latency_ms",
    "billable_failure",
    "unique (business_id, feature_id, idempotency_key)",
    "set search_path = pg_catalog, public"
  ]) {
    assert.equal(migration.includes(token), true, token);
  }

  assert.equal(/\bowner_id\b/.test(migration), false);
  assert.equal(migration.includes("profiles.role"), false);
  assert.equal(policies.includes("public.has_platform_role('platform_admin')"), true);
});

test("manual usage SQL review package exists and is executable SQL without placeholders", () => {
  for (const file of [
    "docs/sql/USAGE_CONTROL_PLANE_PREFLIGHT.sql",
    "docs/sql/USAGE_CONTROL_PLANE_VERIFY.sql",
    "docs/sql/USAGE_CONTROL_PLANE_RLS_REGRESSION.sql"
  ]) {
    const sql = read(file);

    assert.equal(sql.includes("```"), false, file);
    assert.equal(/\bTODO\b|REPLACE_ME|\.\.\./.test(sql), false, file);
    assert.equal(sql.includes("businesses_owner_id_absent"), true, file);
  }
});
