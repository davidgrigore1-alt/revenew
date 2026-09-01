import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

test("A4.6 shared summaries fit their real facts and preserve long-value access", () => {
  const summary = read("src/components/records/RecordSummaryBar.tsx");

  assert.match(summary, /repeat\(auto-fit,minmax\(10rem,1fr\)\)/);
  assert.doesNotMatch(summary, /xl:grid-cols-6/);
  assert.match(summary, /typeof item\.detail === "string" \? item\.detail/);
});

test("A4.6 page headers and dialogs remain inside narrow viewports", () => {
  const header = read("src/components/dashboard/PageHeader.tsx");
  const drawer = read("src/components/apps/IntegrationDetailDrawer.tsx");

  assert.match(header, /w-full min-w-0 max-w-full flex-wrap/);
  assert.match(drawer, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(drawer, /w-\[calc\(100vw-1rem\)\]/);
  assert.match(drawer, /rounded-overlay/);
  assert.match(drawer, /returnFocus\.focus\(\{ preventScroll: true \}\)/);
});

test("A4.6 Recovery table exposes semantic and financial alignment", () => {
  const recovery = read("src/app/(protected)/recoverable/page.tsx");

  assert.match(recovery, /<caption className="sr-only">Oportunități care necesită intervenție/);
  assert.match(recovery, /<th scope="col"[^>]*text-right[^>]*>Valoare estimată<\/th>/);
  assert.match(recovery, /<td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">/);
});

test("A4.6 durable rules and freeze record are explicit", () => {
  const design = read("docs/a4-design-system.md");
  const certification = read("docs/a4-final-certification.md");

  assert.match(design, /Summary bars distribute only the facts that exist/);
  assert.match(design, /Overlays retain a small mobile viewport inset/);
  assert.match(certification, /No authenticated local browser session was available/);
  assert.match(certification, /A4 is frozen/);
});
