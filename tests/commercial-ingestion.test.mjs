import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function loadTypeScriptModule(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${output}\n})(require,module,module.exports)`, { require, module, exports: module.exports });
  return module.exports;
}

test("field mapping suggests unique Romanian and English aliases but leaves ambiguity unresolved", async () => {
  const fields = await loadTypeScriptModule("../src/lib/commercial-ingestion-fields.ts");
  const mapping = fields.suggestedCommercialMapping(["Companie", "Contact Name", "Email", "Valoare estimata", "Titlu"]);
  assert.equal(mapping.company, 0); assert.equal(mapping.contact, 1); assert.equal(mapping.email, 2);
  assert.equal(mapping.estimated_value, 3); assert.equal(mapping.title, 4);
  assert.equal(fields.suggestedCommercialMapping(["Email", "E-mail", "Titlu"]).email, null);
});

test("row validation accepts good input, rejects invalid rows and detects same-file duplicates", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const valid = { title: "Ofertă fără răspuns", company: "TEST SRL", contact: "Ana Test", email: "ana@example.invalid", phone: "+40700000001", estimated_value: "12.500,00", currency: "RON", last_interaction: "15.05.2026", context: "Follow-up necesar", source: "oferta", status: "vechi", owner: "", source_reference: "TEST-1" };
  const result = core.validateCommercialImportRows([valid, valid, { ...valid, title: "", email: "gresit" }]);
  assert.equal(result.accepted.length, 1); assert.equal(result.accepted[0].estimated_value, "12500");
  assert.equal(result.accepted[0].last_interaction_at, "2026-05-15T00:00:00.000Z");
  assert.equal(result.rejected.length, 2); assert.equal(result.rejected[0].status, "duplicate_file");
  assert.equal(result.rejected[1].error_code, "missing_title");
});

test("spreadsheet formula prefixes are neutralized before preview and persistence", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const result = core.validateCommercialImportRows([{ title: "=HYPERLINK(\"bad\")", company: "+SUM(A1:A2)", currency: "RON" }]);
  assert.equal(result.accepted[0].title.startsWith("'="), true);
  assert.equal(result.accepted[0].company.startsWith("'+"), true);
});

test("migration enforces workspace idempotency, bounded processing and RLS", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260714234600_data_ingestion_continuous_recovery_v1.sql", import.meta.url), "utf8");
  assert.match(sql, /data_import_batches_workspace_fingerprint_idx/i);
  assert.match(sql, /commercial_signals_ingestion_fingerprint_idx/i);
  assert.match(sql, /jsonb_array_length\(accepted_rows\).*not between 1 and 1000/is);
  assert.match(sql, /alter table public\.commercial_import_rows enable row level security/i);
  assert.match(sql, /public\.can_access_business\(business_id\)/i);
  assert.match(sql, /security invoker/gi);
  assert.doesNotMatch(sql, /service_role|disable row level security|truncate|delete from|drop table|drop column/i);
});

test("imports create signals only and stale detection reuses the existing opportunity on approval", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260714234600_data_ingestion_continuous_recovery_v1.sql", import.meta.url), "utf8");
  const server = await readFile(new URL("../src/lib/commercial-ingestion.ts", import.meta.url), "utf8");
  const importBody = sql.slice(sql.indexOf("import_commercial_signal_batch"), sql.indexOf("detect_stale_commercial_signals"));
  assert.match(importBody, /insert into public\.commercial_signals/i);
  assert.doesNotMatch(importBody, /insert into public\.opportunities/i);
  assert.match(sql, /approve_detected_recoverable_signal/); assert.match(sql, /v_signal\.detected_from_opportunity_id/);
  assert.match(sql, /update public\.opportunities/); assert.match(server, /assessOpportunityAttention/); assert.match(server, /slice\(0, 200\)/);
});

test("dashboard and reports keep imported estimates separate from confirmed won revenue", async () => {
  const dashboard = await readFile(new URL("../src/app/(protected)/dashboard/page.tsx", import.meta.url), "utf8");
  const reports = await readFile(new URL("../src/app/(protected)/reports/page.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /Valoare importată estimată/); assert.match(dashboard, /separată de venitul câștigat confirmat/);
  assert.match(reports, /Potențial estimat; venitul câștigat rămâne separat/);
});
