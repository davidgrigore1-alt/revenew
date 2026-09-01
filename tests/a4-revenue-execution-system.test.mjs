import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

test("A4.3 Pipeline presents money, execution and action without changing financial truth", () => {
  const page = read("src/app/(protected)/pipeline/page.tsx");
  const board = read("src/components/revenue/PipelineBoard.tsx");
  assert.match(page, /Estimările rămân distincte de venit/);
  assert.match(board, /BANI → EXECUȚIE → ACȚIUNE/);
  assert.match(board, /Valoare estimată activă/);
  assert.match(board, /Valoare în cazuri de intervenție/);
  assert.match(board, /Venit confirmat/);
  assert.match(board, /Monede originale/);
  assert.match(board, /ReportingCurrencyControl currency=\{currency\}/);
  assert.doesNotMatch(board, /win probability|health score|forecast confidence/i);
});

test("A4.3 Recovery leads with an intervention queue and keeps verified impact separate", () => {
  const page = read("src/app/(protected)/recoverable/page.tsx");
  const impact = read("src/components/recovery/ImpactSurface.tsx");
  assert.match(page, /<PageShell[\s\S]{0,40}\bwide\b/);
  assert.ok(page.indexOf("recovery-queue-heading") < page.indexOf("recovery-proof-heading"));
  assert.match(page, /focusedOpportunityId/);
  assert.match(page, /Cazuri de recuperare/);
  assert.match(page, /Potențialul, intervenția și venitul recuperat rămân categorii separate/);
  assert.match(impact, /<caption className="sr-only">Cazuri cu impact comercial urmărit<\/caption>/);
  assert.match(impact, /xl:max-h-\[min\(36rem,calc\(100vh-12rem\)\)\]/);
});

test("A4.3 Documents is an operational registry with compact tools and responsive rows", () => {
  const page = read("src/app/(protected)/documents/page.tsx");
  assert.match(page, /<PageShell[\s\S]{0,40}\bwide\b/);
  assert.match(page, /Instrumente registru documente/);
  assert.match(page, /<RecordSummaryBar label="Rezumat documente afișate"/);
  assert.match(page, /<ul[\s\S]*lg:hidden[\s\S]*aria-label="Documente comerciale"/);
  assert.match(page, /hidden overflow-hidden lg:block/);
  assert.match(page, /Asociere|Context|Stare/);
});

test("A4.3 document detail separates prepared, approved and executed truth", () => {
  const page = read("src/app/(protected)/documents/[id]/page.tsx");
  assert.match(page, /<RecordSummaryBar label="Starea și contextul documentului"/);
  assert.match(page, /status === "approved"/);
  assert.match(page, /Nu înseamnă trimis/);
  assert.match(page, /status === "sent"/);
  assert.match(page, /Acțiune umană necesară/);
  assert.match(page, /<pre className="whitespace-pre-wrap/);
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
});
