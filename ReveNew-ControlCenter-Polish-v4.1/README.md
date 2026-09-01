# ReveNew — Control Center Polish V4.1

Focused manual implementation package for the current Control Center baseline.

## What V4 changes

1. Removes the duplicated `dovezi` text in intervention rows.
2. Renames the selected-case top fact from `Scadență` to `Termen comercial` so it cannot be confused with the action deadline.
3. Gives Gmail / Calendar / Drive concise provider-specific context descriptions without inventing usage data.
4. Turns the empty `Activitate recentă` panel into a useful, truthful empty state.
5. Adds one canonical **light-only** polish block:
   - full-width connected-context grid;
   - more deliberate source cards;
   - better lower-panel depth;
   - cleaner selected-case facts;
   - refined disclosure geometry.
6. Does not redefine `.dark` colors.

## Files touched

- `src/components/dashboard/ExecutionControlCenter.tsx`
- `src/app/(protected)/dashboard/page.tsx`
- `src/app/globals.css`
- adds `tests/control-center-polish-v4.test.mjs`

No package/dependency/SQL/auth/RLS/provider mutation.

## Install

Put this entire folder inside:

`C:\Projects\ReveNew\ReveNew-ControlCenter-Polish-v4.1`

Then from CMD:

```bat
cd /d C:\Projects\ReveNew
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-ControlCenter-Polish-v4.1\apply.ps1"
```

The installer:
- verifies expected source markers first;
- performs all transforms in memory first;
- creates a backup only after preflight succeeds;
- writes UTF-8 without BOM while preserving newline style;
- installs a regression test;
- runs focused tests, typecheck, lint, and `git diff --check`.

## Optional full build

After visual acceptance:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-ControlCenter-Polish-v4.1\verify.ps1" -Build
```

## Rollback

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-ControlCenter-Polish-v4.1\rollback.ps1"
```

## Visual QA after install

Open `http://localhost:3001/dashboard`, hard refresh, then verify:

### Light mode
- no duplicate evidence count in queue rows;
- `Termen comercial` appears in the selected-case facts;
- connected-context cards use the full available width;
- each connected source has a useful provider-specific description;
- recent activity empty state has explanation + link;
- disclosures remain compact and chevrons centered.

### Dark mode
- background palette is unchanged;
- sidebar palette is unchanged;
- chart palette is unchanged;
- connected-context palette is unchanged;
- next-action palette is unchanged.

Only shared source/content semantics may differ.
