import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");

const execution = read(
  "src/components/dashboard/ExecutionControlCenter.tsx",
);
const page = read("src/app/(protected)/dashboard/page.tsx");
const css = read("src/app/globals.css");

test("queue does not render the duplicate evidence text chip", () => {
  assert.equal(
    execution.includes('className="control-center-evidence-chip"'),
    false,
  );
  assert.match(execution, /<CaseReadiness[\s\S]*?evidence=\{item\.evidence\.length\}/);
});

test("selected case distinguishes commercial deadline from action deadline", () => {
  const factsIndex = execution.indexOf("control-center-case-facts");
  assert.ok(factsIndex >= 0, "selected-case fact strip missing");
  const factsSlice = execution.slice(factsIndex, factsIndex + 5000);
  assert.match(factsSlice, /Termen comercial/);
});

test("connected context uses truthful provider-specific descriptions", () => {
  assert.match(page, /Conversații și context email autorizat\./);
  assert.match(page, /Întâlniri și termene din calendarul autorizat\./);
  assert.match(page, /Documente și dovezi disponibile în context\./);
  assert.match(page, /integration\.active\s*\?\s*integration\.contextDescription/);
  assert.doesNotMatch(
    page,
    /integration\.active\s*\?\s*"Disponibil în contextul comercial autorizat\."/,
  );
});

test("recent activity empty state explains the state and a useful next step", () => {
  assert.match(page, /control-center-empty-state/);
  assert.match(
    page,
    /ReveNew continuă să urmărească numai contextul disponibil din sursele autorizate\./,
  );
  assert.match(page, /Vezi oportunitățile monitorizate/);
});

test("V4 visual block is explicitly light-only and does not redefine dark palette", () => {
  const start =
    "/* === REVENEW CONTROL CENTER LIGHT POLISH V4 START ===";
  const end =
    "/* === REVENEW CONTROL CENTER LIGHT POLISH V4 END === */";

  const startIndex = css.indexOf(start);
  const endIndex = css.indexOf(end);

  assert.ok(startIndex >= 0, "V4 CSS start marker missing");
  assert.ok(endIndex > startIndex, "V4 CSS end marker missing");

  const block = css.slice(startIndex, endIndex + end.length);

  assert.match(block, /:root:not\(\.dark\)/);
  assert.doesNotMatch(block, /(^|\n)\s*\.dark\b/);
  assert.match(block, /control-center-source-grid/);
  assert.match(block, /control-center-empty-state/);
});
