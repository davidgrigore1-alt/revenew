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
  const auditTemplate = fields.suggestedCommercialMapping([
    "opportunity_title", "company_name", "contact_name", "contact_email", "request_source",
    "request_summary", "current_status", "responsible_person", "last_action_date", "next_action_due_date"
  ]);
  assert.deepEqual(
    Object.fromEntries(Object.entries(auditTemplate).filter(([, index]) => index !== null)),
    {
      source: 4,
      title: 0,
      company: 1,
      contact: 2,
      email: 3,
      due_date: 9,
      last_interaction: 8,
      context: 5,
      status: 6,
      owner: 7
    }
  );
  const sampleHeader = (await readFile(new URL("../docs/samples/revenew-client-audit-template.csv", import.meta.url), "utf8"))
    .split(/\r?\n/, 1)[0]
    .split(",");
  const sampleMapping = fields.suggestedCommercialMapping(sampleHeader);
  assert.equal(sampleMapping.title, sampleHeader.indexOf("opportunity_title"));
  assert.equal(sampleMapping.company, sampleHeader.indexOf("company_name"));
  assert.equal(sampleMapping.context, sampleHeader.indexOf("request_summary"));
  assert.equal(sampleMapping.due_date, sampleHeader.indexOf("next_action_due_date"));
  for (const key of ["request_date", "contact_role", "last_action_summary", "next_action", "approval_required", "approval_status", "proposal_prepared", "proposal_sent", "outcome_confirmed", "operator_notes"]) {
    assert.equal(sampleMapping[key], sampleHeader.indexOf(key), `${key} must be mapped from the official audit template`);
  }
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

test("20–50 record audit intake preserves operational context without confirming it", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const rows = Array.from({ length: 25 }, (_, index) => ({
    title: `Oportunitate audit ${index + 1}`,
    company: `Compania ${index + 1}`,
    contact: `Contact ${index + 1}`,
    email: `contact-${index + 1}@example.invalid`,
    source: "CRM export controlat",
    source_reference: `AUDIT-${index + 1}`,
    context: "Cerere comercială disponibilă ca dovadă.",
    estimated_value: String(10000 + index),
    currency: index % 2 ? "EUR" : "RON",
    status: "Follow-up de verificat",
    owner: "Consultant comercial",
    request_date: "2026-06-04",
    last_interaction: "2026-06-18",
    last_action_summary: "Ofertă prezentată",
    next_action: "Confirmă starea deciziei",
    due_date: "2026-07-02",
    contact_role: "Decident operațional",
    approval_required: "da",
    approval_status: "În așteptare",
    proposal_prepared: "da",
    proposal_sent: "nu",
    outcome_confirmed: "nu",
    operator_notes: "Valoare estimată; nu este venit confirmat."
  }));
  const result = core.validateCommercialImportRows(rows);
  assert.equal(result.accepted.length, 25);
  assert.equal(result.rejected.length, 0);
  assert.ok(result.accepted.every((row) => row.audit_completeness === "strong"));
  assert.ok(result.accepted.every((row) => row.context.includes("Context operațional importat, de verificat:")));
  assert.ok(result.accepted.every((row) => row.context.includes("Stare aprobare: În așteptare")));
  assert.ok(result.accepted.every((row) => row.context.includes("Rezultat declarat: nu")));
  assert.ok(result.accepted.every((row) => !row.context.includes("venit confirmat: da")));
});

test("operational gaps are explicit but do not block safe signal intake", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const result = core.validateCommercialImportRows([{ title: "Cerere incompletă", company: "Compania F", currency: "RON", context: "Notă sursă" }]);
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0].audit_completeness, "minimal");
  assert.ok(result.accepted[0].missing_operational_fields.includes("responsabil"));
  assert.ok(result.accepted[0].missing_operational_fields.includes("următoarea acțiune"));
  assert.ok(result.accepted[0].missing_operational_fields.includes("termenul următoarei acțiuni"));
});

test("combined audit context is rejected instead of being silently truncated", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const result = core.validateCommercialImportRows([{
    title: "Context prea lung",
    currency: "RON",
    context: "a".repeat(5900),
    next_action: "b".repeat(500)
  }]);
  assert.equal(result.accepted.length, 0);
  assert.equal(result.rejected[0].error_code, "combined_context_too_long");
  assert.match(result.rejected[0].error_message, /fără a elimina dovezile materiale/);
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

test("reports keep imported estimates separate while Home omits financial aggregates", async () => {
  const dashboard = await readFile(new URL("../src/app/(protected)/dashboard/page.tsx", import.meta.url), "utf8");
  const reports = await readFile(new URL("../src/app/(protected)/reports/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(dashboard, /Valoare importată estimată|venitul câștigat confirmat|estimatedImportedRecoverableValue/);
  assert.match(reports, /Potențial estimat; venitul câștigat rămâne separat/);
});
