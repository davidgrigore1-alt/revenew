#Requires -Version 5.1
param(
  [string]$Repo = "C:\Projects\ReveNew"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PageRel = 'src\app\(protected)\dashboard\page.tsx'
$CssRel  = 'src\app\globals.css'
$Page = Join-Path $Repo $PageRel
$Css  = Join-Path $Repo $CssRel
$Marker = 'REVENew FINALIZE PHASE 1A - SECONDARY CONTROL CENTER VIEWS'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

function Count-Literal([string]$Text, [string]$Needle) {
  if ([string]::IsNullOrEmpty($Needle)) { return 0 }
  $count = 0
  $start = 0
  while ($true) {
    $index = $Text.IndexOf($Needle, $start, [System.StringComparison]::Ordinal)
    if ($index -lt 0) { break }
    $count++
    $start = $index + $Needle.Length
  }
  return $count
}

function Run-Gate([string]$Label, [scriptblock]$Command) {
  Write-Host "\n== $Label ==" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Validation failed: $Label (exit $LASTEXITCODE)"
  }
}

if (-not (Test-Path -LiteralPath $Page)) { throw "Missing file: $Page" }
if (-not (Test-Path -LiteralPath $Css))  { throw "Missing file: $Css" }

$pageText = Read-Utf8 $Page
$cssText  = Read-Utf8 $Css

if ($cssText.Contains($Marker)) {
  throw "SAFE STOP: Phase 1A marker already exists. Nothing was changed."
}

$oldClass = 'className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8"'
$oldCount = Count-Literal $pageText $oldClass
if ($oldCount -ne 2) {
  throw "SAFE STOP: expected exactly 2 executive/review wrappers, found $oldCount. Nothing was changed."
}

if (-not $pageText.Contains('searchParams.view === "executive"') -or -not $pageText.Contains('searchParams.view === "review"')) {
  throw "SAFE STOP: executive/review routing contract was not found. Nothing was changed."
}

if (-not $pageText.Contains('<RevenueCommandBrief model={model} />')) {
  throw "SAFE STOP: RevenueCommandBrief anchor not found. Nothing was changed."
}

if (-not $pageText.Contains('<CommercialDecisionReview')) {
  throw "SAFE STOP: CommercialDecisionReview anchor not found. Nothing was changed."
}

$newClass = 'className={`control-center-secondary-canvas ${searchParams.view === "review" ? "control-center-secondary-review" : "control-center-secondary-executive"} mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8`}'
$newPage = $pageText.Replace($oldClass, $newClass)

if ((Count-Literal $newPage 'control-center-secondary-canvas') -ne 2) {
  throw "SAFE STOP: wrapper transformation did not produce exactly 2 scoped canvases. Nothing was changed."
}

$cssBlock = @'

/* ========================================================================== */
/* REVENew FINALIZE PHASE 1A - SECONDARY CONTROL CENTER VIEWS                 */
/* Brief executiv + Revizuire comerciala: depth/layering convergence only.    */
/* No business semantics. No dark palette token redefinition.                 */
/* ========================================================================== */

.control-center-secondary-canvas {
  --secondary-view-radius: 1rem;
  --secondary-view-inner-radius: 0.8rem;
  isolation: isolate;
}

.control-center-secondary-canvas > nav {
  position: relative;
  z-index: 2;
}

.control-center-secondary-canvas > nav + * {
  margin-top: 1rem;
  overflow: hidden;
  border: 1px solid rgb(var(--border-subtle));
  border-radius: var(--secondary-view-radius);
  background: rgb(var(--surface-subtle));
  padding: 1rem;
}

.control-center-secondary-canvas > nav + * h1 {
  letter-spacing: -0.025em;
}

.control-center-secondary-canvas > nav + * :where(section, article, aside)[class*="border"]:not([class*="bg-"]) {
  background-color: rgb(var(--surface));
}

.control-center-secondary-canvas > nav + * :where(section, article, aside) {
  border-color: rgb(var(--border));
}

.control-center-secondary-canvas > nav + * :where(button, a) {
  text-underline-offset: 0.18em;
}

.control-center-secondary-canvas > nav + * :where(button, a):focus-visible {
  outline-offset: 2px;
}

.control-center-secondary-review > nav + * {
  padding-bottom: 1.125rem;
}

@media (min-width: 768px) {
  .control-center-secondary-canvas > nav + * {
    padding: 1.25rem;
  }
}

@media (min-width: 1280px) {
  .control-center-secondary-canvas > nav + * {
    padding: 1.375rem;
  }
}

/* Light mode receives the same white-canvas / cool-neutral depth contract as
   the main Control Center. The authenticated sidebar keeps its own scoped
   graphite variables. Dark mode intentionally keeps the existing palette. */
:root:not(.dark) .product-desktop:has(.control-center-secondary-canvas) {
  --background: 255 255 255;
  --background-soft: 247 247 248;
  --surface: 255 255 255;
  --surface-raised: 255 255 255;
  --surface-subtle: 247 247 248;
  --surface-muted: 234 234 234;
  --surface-selected: 231 238 245;
  --surface-elevated: 255 255 255;
  --surface-floating: 255 255 255;
  --border: 226 228 231;
  --border-subtle: 234 234 234;
  --divider: 234 234 234;
  --border-strong: 192 192 192;
  --foreground: 25 29 36;
  --text-secondary: 76 84 96;
  --text-muted: 108 116 128;
  --text-faint: 142 149 160;
  --shadow-card: 0 1px 2px rgb(20 25 34 / .035), 0 8px 20px rgb(20 25 34 / .028);
}

:root:not(.dark) .control-center-secondary-canvas > nav + * {
  border-color: rgb(226 228 231);
  background: rgb(247 247 248);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .72);
}

:root:not(.dark) .control-center-secondary-canvas > nav + * :where(section, article, aside)[class*="border"]:not([class*="bg-"]) {
  background-color: rgb(255 255 255);
}

/* Keep selected/interactive states visually distinct from depth surfaces. */
:root:not(.dark) .control-center-secondary-canvas [aria-current="true"],
:root:not(.dark) .control-center-secondary-canvas [aria-selected="true"],
:root:not(.dark) .control-center-secondary-canvas [aria-pressed="true"] {
  border-color: rgb(var(--interaction-border));
}

/* END REVENew FINALIZE PHASE 1A - SECONDARY CONTROL CENTER VIEWS */
'@

$newCss = $cssText.TrimEnd("`r", "`n") + $cssBlock + "`r`n"

# Pre-write integrity checks.
if ($newPage.Contains('`n') -or $newCss.Contains('`n')) {
  throw "SAFE STOP: suspicious literal backtick-newline token detected. Nothing was changed."
}
if (-not $newCss.Contains($Marker)) {
  throw "SAFE STOP: CSS marker missing from staged output. Nothing was changed."
}
if ($newCss.Contains('.dark .product-desktop:has(.control-center-secondary-canvas)')) {
  throw "SAFE STOP: staged block attempts to redefine the dark palette. Nothing was changed."
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $Repo ".manual-ui-backups\finalize-phase1a-$stamp"
$pageBackup = Join-Path $backupRoot $PageRel
$cssBackup  = Join-Path $backupRoot $CssRel
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $pageBackup) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $cssBackup) | Out-Null
Copy-Item -LiteralPath $Page -Destination $pageBackup -Force
Copy-Item -LiteralPath $Css  -Destination $cssBackup -Force

try {
  Write-Utf8 $Page $newPage
  Write-Utf8 $Css $newCss

  Write-Host "OK  Scoped Brief/Review canvas installed" -ForegroundColor Green
  Write-Host "OK  Gray depth/layering contract installed" -ForegroundColor Green
  Write-Host "OK  Light palette scoped; dark palette tokens untouched" -ForegroundColor Green

  Push-Location $Repo
  try {
    Run-Gate "typecheck" { npm.cmd run typecheck }
    Run-Gate "lint" { npm.cmd run lint }

    $tests = @()
    if (Test-Path -LiteralPath (Join-Path $Repo 'tests\commercial-decision-review-g3e.test.mjs')) { $tests += 'tests\commercial-decision-review-g3e.test.mjs' }
    if (Test-Path -LiteralPath (Join-Path $Repo 'tests\executive-morning-brief.test.mjs')) { $tests += 'tests\executive-morning-brief.test.mjs' }
    if (Test-Path -LiteralPath (Join-Path $Repo 'tests\visual-excellence.test.mjs')) { $tests += 'tests\visual-excellence.test.mjs' }
    if ($tests.Count -gt 0) {
      Write-Host "\n== focused tests ==" -ForegroundColor Cyan
      & node @('--test') @tests
      if ($LASTEXITCODE -ne 0) { throw "Validation failed: focused tests (exit $LASTEXITCODE)" }
    }

    Write-Host "\n== git diff --check ==" -ForegroundColor Cyan
    & git diff --check -- $PageRel $CssRel
    if ($LASTEXITCODE -ne 0) { throw "Validation failed: git diff --check (exit $LASTEXITCODE)" }
  }
  finally {
    Pop-Location
  }
}
catch {
  Write-Host "\nVALIDATION FAILED - restoring the two touched files." -ForegroundColor Red
  Copy-Item -LiteralPath $pageBackup -Destination $Page -Force
  Copy-Item -LiteralPath $cssBackup  -Destination $Css -Force
  Write-Host "Rollback complete. Backup kept at: $backupRoot" -ForegroundColor Yellow
  throw
}

Write-Host "\nDONE - ReveNew Finalize Phase 1A installed." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Cyan
Write-Host "Next: hard refresh, then inspect Brief executiv and Revizuire comerciala in light + dark mode." -ForegroundColor Yellow
