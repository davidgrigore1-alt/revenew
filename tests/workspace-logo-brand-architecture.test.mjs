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

const logo = compileModel("src/lib/workspace-logo.ts");
const search = compileModel("src/lib/app-section-search.ts");
const help = compileModel("src/lib/contextual-help.ts");

test("workspace logo accepts only supported raster files within 300 KB", () => {
  for (const candidate of [
    { name: "marca.png", type: "image/png", size: 1024 },
    { name: "marca.jpg", type: "image/jpeg", size: 300 * 1024 },
    { name: "marca.jpeg", type: "image/jpeg", size: 2048 },
    { name: "marca.webp", type: "image/webp", size: 2048 }
  ]) assert.equal(logo.validateWorkspaceLogoFile(candidate).valid, true);

  for (const candidate of [
    { name: "marca.svg", type: "image/svg+xml", size: 1024 },
    { name: "marca.png", type: "image/svg+xml", size: 1024 },
    { name: "marca.exe", type: "image/png", size: 1024 },
    { name: "marca.png", type: "image/png", size: 300 * 1024 + 1 }
  ]) assert.equal(logo.validateWorkspaceLogoFile(candidate).valid, false);
});

test("workspace logo persistence remains local, namespaced and removable", () => {
  const provider = read("src/components/theme/ThemeProvider.tsx");
  const picker = read("src/components/settings/WorkspaceLogoPicker.tsx");
  assert.equal(logo.WORKSPACE_LOGO_DATA_URL_KEY, "revenew.workspace.logoDataUrl");
  assert.equal(logo.WORKSPACE_LOGO_META_KEY, "revenew.workspace.logoMeta");
  assert.match(provider, /localStorage\.setItem\(WORKSPACE_LOGO_DATA_URL_KEY/);
  assert.match(provider, /localStorage\.removeItem\(WORKSPACE_LOGO_META_KEY/);
  assert.match(provider, /catch \{/);
  assert.match(picker, /salvat doar în acest browser/);
  assert.match(picker, /Elimină logo/);
  assert.match(picker, /\.png,\.jpg,\.jpeg,\.webp/);
  assert.doesNotMatch([provider, picker].join("\n"), /fetch\(|supabase|storage\.from/i);
});

test("product brand and active company identity remain distinct in the shell", () => {
  const sidebar = read("src/components/dashboard/Sidebar.tsx");
  const menu = read("src/components/dashboard/WorkspaceMenu.tsx");
  const mark = read("src/components/theme/WorkspaceIdentityMark.tsx");
  const settings = read("src/components/settings/PersonalizationSettingsPanel.tsx");
  assert.match(sidebar, /<Logo href="\/dashboard"/);
  assert.match(sidebar, /Compania activă/);
  assert.match(sidebar, /WorkspaceIdentityDisplay/);
  assert.match(menu, /WorkspaceIdentityMark/);
  assert.match(menu, /truncate/);
  assert.match(mark, /Logo spațiu de lucru/);
  assert.match(mark, /workspaceInitials/);
  assert.match(settings, /ReveNew rămâne brandul produsului/);
});

test("search and assistant route logo questions to workspace identity settings", () => {
  for (const query of ["logo", "siglă", "nume firmă", "branding"]) {
    const result = search.searchAppSections(query)[0];
    assert.equal(result?.href, "/settings#identitate", query);
  }
  for (const question of ["Cum adaug logo-ul firmei?", "Unde schimb sigla?", "Cum schimb numele firmei?", "Cum revin la inițiale?", "Logo-ul se salvează pentru toți?", "De ce nu se schimbă logo-ul ReveNew?", "Care este diferența dintre logo-ul ReveNew și logo-ul companiei?"]) {
    const result = help.findContextualHelp(question, "/dashboard");
    assert.equal(result.entry?.id, "settings-logo", question);
    assert.equal(result.entry?.anchor, "settings-identity", question);
    assert.match(result.entry?.shortAnswer ?? "", /ReveNew rămâne brandul fix al produsului/);
  }
});

test("active-session account card truncates long identities without weakening auth", () => {
  const card = read("src/components/auth/AuthenticatedAccountChoice.tsx");
  assert.match(card, /title=\{email\}/);
  assert.match(card, /aria-label=\{`Cont conectat: \$\{email\}`\}/);
  assert.match(card, /max-w-full truncate/);
  assert.doesNotMatch(card, /break-all/);
  assert.match(card, /Continuă cu acest cont/);
  assert.match(card, /Folosește alt cont/);
  assert.match(card, /nu ocolește autentificarea/);
});
