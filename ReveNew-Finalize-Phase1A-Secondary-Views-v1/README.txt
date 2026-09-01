ReveNew Finalize - Phase 1A
==============================
Scope: Brief executiv + Revizuire comerciala only.

What this pass does
- Adds a scoped canvas to the two secondary Control Center views.
- Applies the same depth logic as the main Control Center: white canvas, cool-neutral grouping, elevated working objects.
- Keeps interaction/selection separate from gray depth surfaces.
- Does not change business logic, auth, RLS, migrations, Google connections, AI behavior, or financial semantics.
- Does not redefine the dark palette. Dark mode only receives geometry/surface layering through existing theme variables.

Safety
- Exact source-contract checks before write.
- Backup before write.
- UTF-8 .NET read/write (no Windows PowerShell Set-Content corruption).
- typecheck + lint + focused tests when present + git diff --check.
- Automatic restore of the two touched files if validation fails.

Run from CMD
1) Extract this folder somewhere inside C:\Projects\ReveNew (or anywhere).
2) Run:
   cd /d C:\Projects\ReveNew
   powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-Finalize-Phase1A-Secondary-Views-v1\apply.ps1"

If you extracted elsewhere, pass -Repo C:\Projects\ReveNew.

Then hard-refresh the browser (Ctrl+Shift+R) and inspect:
- Control Center > Brief executiv
- Control Center > Revizuire comerciala
- light mode
- dark mode

Do not proceed to Phase 1B (Activitatea mea) until these two screenshots are visually approved.
