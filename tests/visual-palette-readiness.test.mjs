import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const globalsUrl = new URL("../src/app/globals.css", import.meta.url);
const panelUrl = new URL("../src/components/dashboard/PremiumPanel.tsx", import.meta.url);
const memoryUrl = new URL("../src/components/company/CompanyBusinessMemory.tsx", import.meta.url);
const gitignoreUrl = new URL("../.gitignore", import.meta.url);

test("dark theme keeps the workspace accent above a crisp neutral foundation", async () => {
  const css = await readFile(globalsUrl, "utf8");
  assert.match(css, /--rn-accent-500:\s*76 151 129;/);
  assert.match(css, /--rn-accent-400:\s*112 176 154;/);
  assert.match(css, /--brand-500:\s*var\(--rn-accent-500\);/);
  assert.match(css, /--brand-400:\s*var\(--rn-accent-400\);/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--primary:\s*var\(--brand-400\);/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--background:\s*12 13 14;/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--surface:\s*19 20 21;/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--foreground:\s*250 250 250;/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--primary-foreground:\s*10 10 11;/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--primary-muted:\s*32 33 35;/);
  assert.match(css, /--primary-hover:\s*var\(--brand-300\);/);
  assert.match(css, /--primary-active:\s*var\(--brand-600\);/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--focus-ring:\s*var\(--rn-accent-ring\);/);
  assert.match(css, /--gold-500:\s*190 133 39;/);
});

test("supporting accent tokens cover selected and soft decision surfaces", async () => {
  const [css, panel, memory] = await Promise.all([
    readFile(globalsUrl, "utf8"),
    readFile(panelUrl, "utf8"),
    readFile(memoryUrl, "utf8")
  ]);
  for (const token of ["--brand-50", "--brand-950", "--gold-50", "--primary-muted", "--warning-bg"]) {
    assert.match(css, new RegExp(`${token}:`));
  }
  assert.match(panel, /bg-\[rgb\(var\(--surface-elevated\)\)\]/);
  assert.doesNotMatch(panel, /gradient|brand-950/);
  assert.match(memory, /bg-\[rgb\(var\(--surface-subtle\)\)\]/);
  assert.match(memory, /border-l-\[rgb\(var\(--primary\)\)\]/);
});

test("local environment download artifacts are excluded without entering the product bundle", async () => {
  const [gitignore, css] = await Promise.all([readFile(gitignoreUrl, "utf8"), readFile(globalsUrl, "utf8")]);
  assert.match(gitignore, /^env\*\.download$/m);
  assert.doesNotMatch(css, /env\*\.download|service[_-]?role|api[_-]?key/i);
});
