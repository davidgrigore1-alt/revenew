import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("settings uses grouped local navigation and renders only the active panel", () => {
  const settings = read("src/app/(protected)/settings/page.tsx");

  assert.match(settings, /navigationGroups/);
  assert.match(settings, /Spațiu de lucru/);
  assert.match(settings, /Administrare/);
  assert.match(settings, /activeTab === "workspace"/);
  assert.match(settings, /activeTab === "control"/);
  assert.match(settings, /activeTab === "usage"/);
  assert.doesNotMatch(settings, /<DataCard|\border-.*(?:22|14) indicatori/);
  assert.doesNotMatch(settings, /(?:^|\s)order-(?:first|last|\d)|flex-(?:row|col)-reverse|:target/);
});

test("personalization keeps real controls in compact semantic rows", () => {
  const panel = read("src/components/settings/PersonalizationSettingsPanel.tsx");

  assert.match(panel, /type="radio"/);
  assert.match(panel, /aria-label="Previzualizare temă"/);
  assert.match(panel, /lg:grid-cols-\[minmax\(0,12rem\)_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(panel, /type="color"|flex-(?:row|col)-reverse|:target/);
});

test("reports uses truthful rows and tables instead of decorative metric card stacks", () => {
  const reports = read("src/app/(protected)/reports/page.tsx");

  assert.match(reports, /<table/);
  assert.match(reports, /function MetricRows/);
  assert.match(reports, /activeTab === "overview"/);
  assert.match(reports, /activeTab === "operations"/);
  assert.match(reports, /activeTab === "export"/);
  assert.match(reports, /responseLoop\.confirmedRevenueRon/);
  assert.match(reports, /inboxSummary\.estimatedValueUnderReview/);
  assert.doesNotMatch(reports, /<MetricCard|<DataCard|<ExecutiveSummaryVisual|22 indicatori|14 indicatori/);
  assert.doesNotMatch(reports, /(?:^|\s)order-(?:first|last|\d)|flex-(?:row|col)-reverse|:target/);
});
