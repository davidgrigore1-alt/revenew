import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { forbiddenFileReason, secretLabelsForContent } from "../scripts/validation/check-repository-safety.mjs";
import { scanMigration } from "../scripts/validation/check-migrations.mjs";

const readJson = async (fileName) => JSON.parse(await readFile(new URL(fileName, import.meta.url), "utf8"));

test("migration gate detects destructive and tenant-unsafe SQL", () => {
  const sql = `
    drop table public.crm_contacts;
    alter table public.businesses drop column owner_profile_id;
    delete from public.opportunities;
    alter table public.businesses disable row level security;
    alter table public.businesses add column owner_id uuid;
    grant all on public.businesses to anon;
  `;
  const findings = scanMigration("20990101000000_unsafe.sql", sql).join("\n");
  assert.match(findings, /DROP TABLE/);
  assert.match(findings, /DROP COLUMN/);
  assert.match(findings, /DELETE without a constrained WHERE/);
  assert.match(findings, /RLS DISABLED/);
  assert.match(findings, /businesses\.owner_id/);
  assert.match(findings, /unsafe GRANT ALL/);
});

test("migration gate permits constrained deletes and justified security definer", () => {
  const sql = `
    delete from public.import_rows where business_id = auth.uid();
    -- safety-justification: required for an audited tenant-scoped RPC
    create function public.review_signal() returns void language plpgsql security definer as $$ begin null; end $$;
  `;
  assert.deepEqual(scanMigration("20990101000001_reviewed.sql", sql), []);
});

test("repository gate identifies runtime artifacts without rejecting templates or product assets", () => {
  assert.equal(forbiddenFileReason(".env.local"), "runtime environment file");
  assert.equal(forbiddenFileReason(".next/cache/item"), "generated dependency/build directory");
  assert.equal(forbiddenFileReason("artifacts/browser/trace.zip"), "browser/test artifact");
  assert.equal(forbiddenFileReason("diagnostics.csv"), "temporary log or CSV");
  assert.equal(forbiddenFileReason(".env.example"), null);
  assert.equal(forbiddenFileReason("public/product.png"), null);
});

test("repository gate reports secret categories rather than values", () => {
  const labels = secretLabelsForContent("SUPABASE_SERVICE_ROLE_KEY=" + "x".repeat(40));
  assert.deepEqual(labels, ["non-empty service-role key"]);
});

test("package scripts and CI expose the complete safety workflow", async () => {
  const packageJson = await readJson("../package.json");
  for (const command of ["typecheck", "lint", "test", "test:targeted", "build", "validate", "validate:quick", "validate:security", "validate:migrations"]) {
    assert.equal(typeof packageJson.scripts[command], "string", `missing npm script: ${command}`);
  }
  const workflow = await readFile(new URL("../.github/workflows/safety-gates.yml", import.meta.url), "utf8");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /npm ci/);
  assert.doesNotMatch(workflow, /deploy/i);
});

test("migration integrity baseline covers the complete reviewed history", async () => {
  const baseline = await readJson("../scripts/validation/migration-integrity-baseline.json");
  const migrations = (await readdir(new URL("../supabase/migrations", import.meta.url))).filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual(Object.keys(baseline.files).sort(), migrations);
});

test("migration gate permits privilege revocation without permitting destructive truncate", () => {
  assert.deepEqual(scanMigration("20990101000002_revoke.sql", "revoke truncate on public.commercial_signals from authenticated;"), []);
  assert.match(scanMigration("20990101000003_truncate.sql", "truncate table public.commercial_signals;").join("\n"), /TRUNCATE/);
});
