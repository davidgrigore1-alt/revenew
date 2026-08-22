import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("workspace menu uses unique semantics and complete menu keyboard behavior", () => {
  const source = read("src/components/dashboard/WorkspaceMenu.tsx");

  assert.match(source, /useId\(\)/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /querySelectorAll<HTMLElement>\('\[role="menuitem"\]/);
  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Escape"]) {
    assert.match(source, new RegExp(`"${key}"`));
  }
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /document\.addEventListener\("pointerdown"/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /window\.location\.href = "\/auth\/logout"/);
});

test("global search is a trapped combobox dialog and ignores stale tenant-search responses", () => {
  const source = read("src/components/search/GlobalSearch.tsx");
  const action = read("src/lib/search/actions.ts");

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /createPortal\(searchDialog, document\.body\)/);
  assert.match(source, /GLOBAL_SEARCH_OPEN_EVENT/);
  assert.match(source, /role="combobox"/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(source, /aria-activedescendant=\{activeOptionId\}/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /requestSequenceRef/);
  assert.match(source, /requestId !== requestSequenceRef\.current/);
  assert.match(source, /displayedResults/);
  assert.match(source, /router\.push\(destination\)/);
  assert.doesNotMatch(source, /window\.location\.assign/);
  assert.match(action, /requirePermission\("workspace\.read"\)/);
  assert.match(action, /\.eq\("business_id", businessId\)/);
});

test("mobile navigation drawer traps focus and restores its trigger", () => {
  const source = read("src/components/dashboard/AppHeader.tsx");

  assert.match(source, /useId\(\)/);
  assert.match(source, /drawerRef\.current\.querySelectorAll/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-label="Caută în spațiul de lucru"/);
  assert.match(source, /window\.dispatchEvent\(new Event\(GLOBAL_SEARCH_OPEN_EVENT\)\)/);
});

test("guided product tour is opt-in and retains accessible replay entry points", () => {
  const tour = read("src/components/guidance/GuidedProductTour.tsx");
  const help = read("src/app/(protected)/help/page.tsx");
  const mountEffectStart = tour.indexOf("useEffect(() => {");
  const replayStart = tour.indexOf("function replayGuide", mountEffectStart);
  const mountPrelude = tour.slice(mountEffectStart, replayStart);

  assert.doesNotMatch(mountPrelude, /setOpen\(true\)/);
  assert.match(tour, /revenew:replay-product-guide/);
  assert.match(tour, /function replayGuide/);
  assert.match(tour, /aria-haspopup="dialog"/);
  assert.match(tour, /returnFocusRef/);
  assert.match(tour, /document\.activeElement instanceof HTMLElement/);
  assert.match(tour, /returnTarget\?\.isConnected/);
  assert.match(tour, /closeGuide\("later"\)/);
  assert.match(help, /<GuideReplayButton \/>/);
});

test("information tooltip uses semantic tokens and dismisses accessibly", () => {
  const source = read("src/components/ui/InfoTooltip.tsx");

  assert.match(source, /aria-label=\{label\}/);
  assert.match(source, /role="tooltip"/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /document\.addEventListener\("pointerdown"/);
  assert.match(source, /pointerFocusRef/);
  assert.match(source, /var\(--surface-elevated\)/);
  assert.match(source, /var\(--text-secondary\)/);
  assert.doesNotMatch(source, /(?:mint|ink|text-zinc|border-white|bg-white)/);
});

test("interaction components do not visually reorder semantic content", () => {
  const sources = [
    "src/components/dashboard/WorkspaceMenu.tsx",
    "src/components/search/GlobalSearch.tsx",
    "src/components/dashboard/AppHeader.tsx",
    "src/components/guidance/GuidedProductTour.tsx",
    "src/components/ui/InfoTooltip.tsx"
  ].map(read).join("\n");

  assert.doesNotMatch(sources, /\border-(?:first|last|none|\[)|flex-(?:row|col)-reverse|:target/);
});
