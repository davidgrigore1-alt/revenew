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

test("bulk intake parses labeled signals deterministically and keeps source text bounded", async () => {
  const intake = await loadTypeScriptModule("../src/lib/commercial-source-intake.ts");
  const parsed = intake.parseBulkCommercialText(`Titlu: Ofertă fără răspuns
Companie: Atlas SRL
Contact: Ana Pop
Valoare: 12500
Monedă: RON
Termen: 31.07.2026
Context: Oferta necesită follow-up.

---

Notă după apel pentru reînnoire
Clientul revine după aprobarea bugetului.`, "email");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].title, "Ofertă fără răspuns");
  assert.equal(parsed.rows[0].due_date, "31.07.2026");
  assert.equal(parsed.rows[0].source_type, "email");
  assert.equal(parsed.rows[1].title, "Notă după apel pentru reînnoire");
  assert.match(parsed.rows[1].context, /aprobarea bugetului/);
});

test("CSV text parsing requires header and rows and returns Romanian validation errors", async () => {
  const intake = await loadTypeScriptModule("../src/lib/commercial-source-intake.ts");
  const parsed = intake.parseCommercialCsvText("title,source_type,raw_text,company,due_date\nCerere ofertă,email,Mesaj copiat,Atlas,2026-07-31");
  assert.equal(parsed.ok, true);
  assert.deepEqual(Array.from(parsed.headers), ["title", "source_type", "raw_text", "company", "due_date"]);
  assert.equal(parsed.rows[0][0], "Cerere ofertă");
  const empty = intake.parseCommercialCsvText("");
  assert.equal(empty.ok, false);
  assert.match(empty.error, /Adaugă text CSV/);
  assert.equal(intake.isAllowedCommercialCsvFile("semnale.csv", "text/csv"), true);
  assert.equal(intake.isAllowedCommercialCsvFile("semnale.txt", "text/csv"), false);
  assert.equal(intake.isAllowedCommercialCsvFile("semnale.csv", "application/javascript"), false);
  const tooMany = intake.parseCommercialCsvText(`title,context\n${Array.from({ length: 1001 }, (_, index) => `Semnal ${index},Context`).join("\n")}`);
  assert.equal(tooMany.ok, false);
  assert.match(tooMany.error, /1\.000/);
  const blanks = intake.parseCommercialCsvText("title,context\r\n\r\nSemnal,Context\r\n\r\n");
  assert.equal(blanks.rows.length, 1);
});

test("normalization validates source deadlines, detects duplicates and neutralizes unsafe spreadsheet text", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const row = { title: "\t=Cerere ofertă", source_type: "whatsapp", company: "\r+Atlas", context: "\u202e@Text\n<script>alert(1)</script> [click](javascript:alert(1))", due_date: "31.07.2026", currency: "EUR" };
  const valid = core.validateCommercialImportRows([row, row]);
  assert.equal(valid.accepted.length, 1);
  assert.equal(valid.accepted[0].source_type, "whatsapp");
  assert.equal(valid.accepted[0].requested_date, "2026-07-31T00:00:00.000Z");
  assert.equal(valid.accepted[0].title.startsWith("'="), true);
  assert.equal(valid.accepted[0].company.startsWith("'+"), true);
  assert.equal(valid.accepted[0].context.includes("<script>"), true);
  assert.equal(/[\r\n\u202e]/.test(valid.accepted[0].context), false);
  assert.equal(valid.rejected[0].status, "duplicate_file");
  const invalid = core.validateCommercialImportRows([{ title: "Semnal", due_date: "31/99/2026" }]);
  assert.equal(invalid.rejected[0].error_code, "invalid_due_date");
  assert.match(invalid.rejected[0].error_message, /Termenul comercial nu este valid/);
  const impossibleDate = core.validateCommercialImportRows([{ title: "Semnal", due_date: "2026-02-31" }]);
  assert.equal(impossibleDate.rejected[0].error_code, "invalid_due_date");
  const invalidSource = core.validateCommercialImportRows([{ title: "Semnal", source_type: "web_crawler" }]);
  assert.equal(invalidSource.rejected[0].error_code, "invalid_source_type");
  const tooLong = core.validateCommercialImportRows([{ title: "Semnal", context: "x".repeat(6001) }]);
  assert.equal(tooLong.rejected[0].error_code, "field_too_long");
});

test("confirmation selection cannot forward exact duplicates to the write RPC", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const rows = [
    { row_fingerprint: "a".repeat(64), exact_duplicate: false, title: "Selectat" },
    { row_fingerprint: "b".repeat(64), exact_duplicate: false, title: "Neselectat" },
    { row_fingerprint: "c".repeat(64), exact_duplicate: true, title: "Duplicat" }
  ];
  const selected = core.selectConfirmedCommercialRows(rows, ["a".repeat(64)]);
  assert.deepEqual(Array.from(selected.selectedRows, (row) => row.title), ["Selectat"]);
  assert.deepEqual(Array.from(selected.confirmedRows, (row) => row.title), ["Selectat"]);
  assert.deepEqual(Array.from(selected.exactDuplicates, (row) => row.title), ["Duplicat"]);
  assert.equal(selected.notSelected, 1);
});

test("server envelope enforces payload, row and column limits independently of the browser", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  assert.match(core.validateCommercialImportEnvelope([]), /1 și 1\.000/);
  assert.match(core.validateCommercialImportEnvelope(Array.from({ length: 1001 }, () => ({ title: "Semnal" }))), /1 și 1\.000/);
  assert.match(core.validateCommercialImportEnvelope([Object.fromEntries(Array.from({ length: 31 }, (_, index) => [`c${index}`, "x"]))]), /30 de câmpuri/);
  assert.match(core.validateCommercialImportEnvelope([{ title: "Semnal", context: "x".repeat(2 * 1024 * 1024) }]), /2 MB/);
  assert.equal(core.validateCommercialImportEnvelope([{ title: "Semnal" }]), null);
});

test("source intake remains preview-first, tenant-scoped and human-controlled", async () => {
  const [actions, server, client, sql, hardeningSql] = await Promise.all([
    readFile(new URL("../src/lib/commercial-ingestion-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/commercial-ingestion.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/inbox/CommercialSignalImportWizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260719181513_source_intake_external_signals_v1.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260719185230_harden_source_intake_validation.sql", import.meta.url), "utf8")
  ]);
  assert.match(actions, /requirePermission\("signals\.create"\)/);
  assert.match(server, /getCurrentBusinessForUser/);
  assert.match(server, /\.eq\("business_id", business\.id\)/);
  assert.match(client, /previewCommercialSignalImport/);
  assert.match(client, /Importă selectate/);
  assert.match(client, /Nimic nu este convertit automat/);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /not public\.can_access_business\(target_business_id\)/i);
  assert.match(sql, /status, priority, title/);
  assert.match(sql, /'new', 'medium'/);
  assert.match(sql, /requested_date/);
  assert.match(sql, /signal_imported/);
  assert.match(hardeningSql, /security invoker/i);
  assert.match(hardeningSql, /pg_column_size\(accepted_rows\).*2097152/i);
  assert.match(hardeningSql, /extensions\.digest/);
  assert.match(hardeningSql, /analysis_status, review_status/);
  assert.match(hardeningSql, /'not_started', 'new'/);
  assert.match(hardeningSql, /revoke all on table public\.commercial_signals, public\.commercial_signal_events from anon/i);
  assert.match(hardeningSql, /revoke truncate, references, trigger .* from authenticated/i);
  assert.doesNotMatch(sql, /security definer|disable row level security|service_role|grant all|insert into public\.opportunities|insert into public\.opportunity_actions/i);
  assert.doesNotMatch(hardeningSql, /security definer|disable row level security|service_role|grant all|grant delete|insert into public\.opportunities|insert into public\.opportunity_actions/i);
  assert.doesNotMatch(`${actions}\n${server}`, /fetch\(|openai|anthropic|gmail|whatsapp.*api|send.*message|service_role/i);
  assert.doesNotMatch(client, /dangerouslySetInnerHTML/);
});
