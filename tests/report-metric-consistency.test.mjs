import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("Reports distinguishes active pipeline value from exposed audit value", () => {
  const reports = read("src/app/(protected)/reports/page.tsx");
  const visual = read("src/components/reports/ExecutiveSummaryVisual.tsx");
  const copy = `${reports}\n${visual}`;

  assert.doesNotMatch(copy, /Pipelines estimat|Pipeline estimat|Valoare maximă estimată/i);
  assert.match(copy, /Valoare estimată în pipeline/);
  assert.match(copy, /Toate oportunitățile active/);
  assert.match(copy, /nu (?:este|indică doar).*venit confirmat|nu este venit confirmat/i);
  assert.match(reports, /opportunities\.filter\(isOpenOpportunity\)/);
});

test("audit and pilot label exposed estimates as distinct, deduplicated and unconfirmed", () => {
  const audit = read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx");
  const pilot = read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx");
  const model = read("src/lib/enterprise-pilot-pack.ts");
  const copy = `${audit}\n${pilot}\n${model}`;

  assert.match(audit, /Valoare estimată expusă/);
  assert.match(pilot, /Valoare estimată expusă/);
  assert.match(audit, /deduplicate pe obiect comercial/);
  assert.match(pilot, /deduplicate pe obiect comercial/);
  assert.match(copy, /separate pe monedă/);
  assert.match(copy, /nu venit confirmat|nu sunt venit confirmat|neconfirmate ca venit/);
  assert.doesNotMatch(copy, /ROI garantat|venit garantat|recuperare garantată|guaranteed revenue/i);
});

test("pilot and audit preserve human control at the decision point", () => {
  const audit = read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx");
  const pilot = read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx");
  assert.match(pilot, /Prima acțiune sigură, sub control uman/);
  assert.match(pilot, /pilotul nu garantează recuperarea/);
  assert.match(audit, /rămân sub control uman/);
});
