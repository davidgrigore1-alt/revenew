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
});

test("normalization validates source deadlines, detects duplicates and neutralizes unsafe spreadsheet text", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const row = { title: "=Cerere ofertă", source_type: "whatsapp", company: "Atlas", context: "Text copiat", due_date: "31.07.2026", currency: "EUR" };
  const valid = core.validateCommercialImportRows([row, row]);
  assert.equal(valid.accepted.length, 1);
  assert.equal(valid.accepted[0].source_type, "whatsapp");
  assert.equal(valid.accepted[0].requested_date, "2026-07-31T00:00:00.000Z");
  assert.equal(valid.accepted[0].title.startsWith("'="), true);
  assert.equal(valid.rejected[0].status, "duplicate_file");
  const invalid = core.validateCommercialImportRows([{ title: "Semnal", due_date: "31/99/2026" }]);
  assert.equal(invalid.rejected[0].error_code, "invalid_due_date");
  assert.match(invalid.rejected[0].error_message, /Termenul comercial nu este valid/);
});

test("confirmation selection imports selected candidates only while retaining exact duplicates for audit", async () => {
  const core = await loadTypeScriptModule("../src/lib/commercial-ingestion-core.ts");
  const rows = [
    { row_fingerprint: "a".repeat(64), exact_duplicate: false, title: "Selectat" },
    { row_fingerprint: "b".repeat(64), exact_duplicate: false, title: "Neselectat" },
    { row_fingerprint: "c".repeat(64), exact_duplicate: true, title: "Duplicat" }
  ];
  const selected = core.selectConfirmedCommercialRows(rows, ["a".repeat(64)]);
  assert.deepEqual(Array.from(selected.selectedRows, (row) => row.title), ["Selectat"]);
  assert.deepEqual(Array.from(selected.confirmedRows, (row) => row.title), ["Selectat", "Duplicat"]);
  assert.equal(selected.notSelected, 1);
});

test("source intake remains preview-first, tenant-scoped and human-controlled", async () => {
  const [actions, server, client, sql] = await Promise.all([
    readFile(new URL("../src/lib/commercial-ingestion-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/commercial-ingestion.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/inbox/CommercialSignalImportWizard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260719181513_source_intake_external_signals_v1.sql", import.meta.url), "utf8")
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
  assert.doesNotMatch(sql, /security definer|disable row level security|service_role|grant all|insert into public\.opportunities|insert into public\.opportunity_actions/i);
  assert.doesNotMatch(`${actions}\n${server}`, /fetch\(|openai|anthropic|gmail|whatsapp.*api|send.*message|service_role/i);
});
