import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function compileModel(relativePath) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module }, { filename });
  return module.exports;
}

const themes = compileModel("src/lib/theme-presets.ts");

test("premium accent presets are complete, namespaced and keep Champagne Gold as default", () => {
  assert.equal(themes.defaultAccentTheme, "champagne");
  assert.equal(themes.ACCENT_THEME_STORAGE_KEY, "revenew.theme.accent");
  assert.equal(themes.WORKSPACE_IDENTITY_STORAGE_KEY, "revenew.workspace.identityPreview");
  assert.deepEqual(
    Array.from(themes.accentThemePresets, (preset) => preset.id),
    ["champagne", "executive-blue", "emerald", "copper", "burgundy", "violet", "graphite"]
  );
  for (const preset of themes.accentThemePresets) {
    assert.deepEqual(Object.keys(preset.tokens), Array.from(themes.accentTokenNames), preset.id);
    assert.doesNotMatch(Object.keys(preset.tokens).join(" "), /success|warning|danger|error|critical/i, preset.id);
  }
});

test("settings exposes controlled selection, preview, reset and honest local persistence", () => {
  const panel = read("src/components/settings/PersonalizationSettingsPanel.tsx");
  const settings = read("src/app/(protected)/settings/page.tsx");
  const source = `${panel}\n${settings}\n${read("src/lib/theme-presets.ts")}`;

  for (const label of ["Aspect", "Culoare accent", "Champagne Gold", "Executive Blue", "Emerald", "Copper", "Burgundy", "Violet", "Graphite Minimal"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(panel, /type="radio"/);
  assert.doesNotMatch(panel, /type="color"/);
  assert.match(panel, /Aplică tema/);
  assert.match(panel, /Revino la implicit/);
  assert.match(panel, /Previzualizare temă/);
  assert.match(panel, /status.*critic.*succes.*eroare.*avertizare.*rămân independente/is);
  assert.match(panel, /Preferința se aplică în acest browser/);
});

test("workspace identity remains an honest local display preference", () => {
  const panel = read("src/components/settings/PersonalizationSettingsPanel.tsx");
  const shellIdentity = read("src/components/theme/WorkspaceIdentityDisplay.tsx");
  const provider = read("src/components/theme/ThemeProvider.tsx");

  for (const label of ["Identitate spațiu de lucru", "Nume afișat", "Inițiale", "Industrie", "Monedă principală", "Preferință de limbă"]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /nu convertește valorile existente/i);
  assert.match(panel, /monedele rămân separate în rapoarte/i);
  assert.match(panel, /interfața curentă rămâne în română/i);
  assert.match(panel, /Datele legale ale companiei nu se modifică/i);
  assert.match(provider, /window\.localStorage/);
  assert.match(shellIdentity, /identityPreview/);
  assert.doesNotMatch(`${panel}\n${provider}`, /fetch\(|server action|supabase|createClient/i);
});

test("theme initialization applies tokens before hydration and semantic colors stay independent", () => {
  const script = read("src/components/theme/theme-script.ts");
  const globals = read("src/app/globals.css");
  const presetSource = read("src/lib/theme-presets.ts");

  assert.match(script, /document\.documentElement\.style\.setProperty/);
  assert.match(script, /dataset\.accentTheme/);
  assert.match(globals, /--success-background:/);
  assert.match(globals, /--warning-background:/);
  assert.match(globals, /--danger-background:/);
  assert.doesNotMatch(presetSource, /--success|--warning|--danger|--error/);
});
