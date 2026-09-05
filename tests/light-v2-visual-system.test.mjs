import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("Light V2 centralizes the true-white, interaction, and intelligence roles", () => {
  const css = read("src/app/globals.css");
  for (const contract of [
    "--background: 255 255 255;",
    "--sidebar: 247 249 252;",
    "--background-soft: 244 247 251;",
    "--surface-subtle: 248 250 252;",
    "--surface-muted: 238 243 248;",
    "--surface-selected: 232 238 245;",
    "--border: 220 227 234;",
    "--divider: 231 235 240;",
    "--foreground: 17 24 39;",
    "--text-secondary: 86 98 115;",
    "--text-muted: 122 133 148;",
    "--interaction: 35 89 168;",
    "--interaction-hover: 29 79 145;",
    "--interaction-tint: 238 245 255;",
    "--intelligence: var(--rn-accent-500);",
    "--intelligence-strong: var(--rn-accent-800);",
    "--intelligence-tint: var(--rn-accent-50);"
  ]) assert.match(css, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(css, /--primary: var\(--rn-accent-700\);/);
  assert.match(css, /--focus-ring: var\(--rn-accent-ring\);/);
});

test("shared Select matches the trigger and retains anchored accessible behavior", () => {
  const select = read("src/components/ui/Select.tsx");
  assert.match(select, /left:\s*rect\.left/);
  assert.match(select, /width:\s*rect\.width/);
  assert.doesNotMatch(select, /Math\.max\(rect\.width\s*,\s*220\)|min-w-\[220px\]/);
  for (const contract of ["ResizeObserver", 'role="combobox"', 'role="listbox"', 'role="option"', "aria-expanded", "aria-controls"]) assert.match(select, new RegExp(contract));
  assert.match(select, /event\.key\s*===\s*"Escape"/);
  assert.match(select, /event\.key\s*===\s*"Enter"/);
  assert.match(select, /bg-\[rgb\(var\(--surface-floating\)\)\]/);
});

test("main Ask workspace uses one centered axis without changing drawer geometry", () => {
  const ask = read("src/components/intelligence/AskReveNew.tsx");
  const page = read("src/app/(protected)/ai/page.tsx");
  const drawer = read("src/components/guidance/ContextualAssistant.tsx");
  assert.match(ask, /mx-auto w-full max-w-5xl/);
  assert.match(ask, /CopilotConversation className="mt-5 w-full"/);
  assert.match(page, /<PageShell[\s\S]*?\bwide\b/);
  assert.doesNotMatch(drawer, /max-w-5xl/);
});

test("no-preference theme remains light while Champagne stays the recommended accent", () => {
  const provider = read("src/components/theme/ThemeProvider.tsx");
  const script = read("src/components/theme/theme-script.ts");
  const presets = read("src/lib/theme-presets.ts");
  assert.match(provider, /useState<Theme>\("light"\)/);
  assert.match(provider, /storedTheme[\s\S]*?: "light";/);
  assert.match(script, /localStorage\.getItem\(key\) \|\| "light"/);
  assert.match(presets, /defaultAccentTheme: AccentThemeId = "champagne"/);
  assert.match(presets, /id: "executive-blue"/);
});
