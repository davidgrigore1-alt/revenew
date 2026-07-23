import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const globalsUrl = new URL("../src/app/globals.css", import.meta.url);
const panelUrl = new URL("../src/components/dashboard/PremiumPanel.tsx", import.meta.url);
const memoryUrl = new URL("../src/components/company/CompanyBusinessMemory.tsx", import.meta.url);
const gitignoreUrl = new URL("../.gitignore", import.meta.url);

test("dark theme reserves vivid yellow for emphasis and softens large primary surfaces", async () => {
  const css = await readFile(globalsUrl, "utf8");
  assert.match(css, /--brand-500:\s*241 210 23;/);
  assert.match(css, /--brand-400:\s*230 200 74;/);
  assert.match(css, /\.dark\s*\{[\s\S]*?--primary:\s*var\(--brand-400\);/);
  assert.match(css, /--primary-foreground:\s*var\(--brand-950\);/);
  assert.match(css, /--primary-hover:\s*var\(--brand-300\);/);
  assert.match(css, /--primary-active:\s*var\(--brand-600\);/);
  assert.match(css, /--focus-ring:\s*var\(--brand-500\);/);
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
  assert.match(panel, /dark:border-\[rgb\(var\(--brand-500\)\/0\.24\)\]/);
  assert.match(memory, /dark:bg-\[rgb\(var\(--brand-950\)\/0\.34\)\]/);
});

test("local environment download artifacts are excluded without entering the product bundle", async () => {
  const [gitignore, css] = await Promise.all([readFile(gitignoreUrl, "utf8"), readFile(globalsUrl, "utf8")]);
  assert.match(gitignore, /^env\*\.download$/m);
  assert.doesNotMatch(css, /env\*\.download|service[_-]?role|api[_-]?key/i);
});
