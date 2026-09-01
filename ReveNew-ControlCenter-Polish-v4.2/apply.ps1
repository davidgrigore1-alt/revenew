#Requires -Version 5.1

param(
  [string]$Repo = "C:\Projects\ReveNew",
  [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

function Normalize-Newlines([string]$Text) {
  return $Text.Replace("`r`n", "`n")
}

function Restore-Newlines([string]$Text, [bool]$UsesCrLf) {
  if ($UsesCrLf) {
    return $Text.Replace("`n", "`r`n")
  }
  return $Text
}

function Assert-Path([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "SAFE STOP: missing $Label at $Path"
  }
}

function Replace-Regex-One-Or-Skip(
  [string]$Text,
  [string]$Pattern,
  [string]$Replacement,
  [string]$AlreadyPattern,
  [string]$Label
) {
  if ($AlreadyPattern -and [regex]::IsMatch($Text, $AlreadyPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
    Write-Host "SKIP $Label already installed" -ForegroundColor DarkYellow
    return $Text
  }

  $matches = [regex]::Matches(
    $Text,
    $Pattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($matches.Count -ne 1) {
    throw "SAFE STOP: expected exactly one match for '$Label', found $($matches.Count)"
  }

  Write-Host "OK   $Label" -ForegroundColor Green
  return [regex]::Replace(
    $Text,
    $Pattern,
    $Replacement,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

function Remove-Regex-One-Or-Skip(
  [string]$Text,
  [string]$Pattern,
  [string]$Label
) {
  $matches = [regex]::Matches(
    $Text,
    $Pattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )

  if ($matches.Count -eq 0) {
    Write-Host "SKIP $Label already absent" -ForegroundColor DarkYellow
    return $Text
  }

  if ($matches.Count -ne 1) {
    throw "SAFE STOP: expected zero or one match for '$Label', found $($matches.Count)"
  }

  Write-Host "OK   $Label" -ForegroundColor Green
  return [regex]::Replace(
    $Text,
    $Pattern,
    "",
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
}

if (-not (Test-Path -LiteralPath $Repo)) {
  throw "SAFE STOP: repo not found: $Repo"
}

$ExecutionRel = "src\components\dashboard\ExecutionControlCenter.tsx"
$PageRel = "src\app\(protected)\dashboard\page.tsx"
$CssRel = "src\app\globals.css"
$TestRel = "tests\control-center-polish-v4.test.mjs"

$Execution = Join-Path $Repo $ExecutionRel
$Page = Join-Path $Repo $PageRel
$Css = Join-Path $Repo $CssRel
$Test = Join-Path $Repo $TestRel

Assert-Path $Execution "ExecutionControlCenter.tsx"
Assert-Path $Page "dashboard page"
Assert-Path $Css "globals.css"

$ExecutionRaw = Read-Utf8 $Execution
$PageRaw = Read-Utf8 $Page
$CssRaw = Read-Utf8 $Css

$ExecutionCrLf = $ExecutionRaw.Contains("`r`n")
$PageCrLf = $PageRaw.Contains("`r`n")
$CssCrLf = $CssRaw.Contains("`r`n")

$executionText = Normalize-Newlines $ExecutionRaw
$pageText = Normalize-Newlines $PageRaw
$cssText = Normalize-Newlines $CssRaw

# ---------------------------------------------------------------------------
# PRECONDITIONS
# ---------------------------------------------------------------------------

$requiredExecutionMarkers = @(
  "control-center-case-facts",
  "control-center-case-list",
  "CaseReadiness",
  "Termen depășit"
)

foreach ($marker in $requiredExecutionMarkers) {
  if (-not $executionText.Contains($marker)) {
    throw "SAFE STOP: ExecutionControlCenter does not match expected premium baseline. Missing marker: $marker"
  }
}

$requiredPageMarkers = @(
  "control-center-source-grid",
  "control-center-source-card",
  "Context conectat",
  "Activitate recentă",
  "Nicio schimbare comercială semnificativă"
)

foreach ($marker in $requiredPageMarkers) {
  if (-not $pageText.Contains($marker)) {
    throw "SAFE STOP: dashboard page does not match expected premium baseline. Missing marker: $marker"
  }
}

if (-not $cssText.Contains(".control-center-source-grid")) {
  throw "SAFE STOP: globals.css does not contain Control Center source-grid styles."
}

# All transformations happen IN MEMORY before any source file is written.

# ---------------------------------------------------------------------------
# 1) QUEUE — remove duplicate evidence label.
# CaseReadiness already renders the readiness/evidence state, so the extra
# text chip caused the duplicated “4 dovezi” visible in the rendered queue.
# ---------------------------------------------------------------------------

$executionText = Remove-Regex-One-Or-Skip `
  $executionText `
  '(?ms)\s*<span className="control-center-evidence-chip">\s*\{item\.evidence\.length\}\{" "\}\s*\{item\.evidence\.length === 1 \? "dovadă" : "dovezi"\}\s*</span>\s*' `
  "Queue duplicate evidence label"

# ---------------------------------------------------------------------------
# 2) SELECTED CASE — make the two deadline concepts unmistakable.
# The upper fact is the opportunity/commercial deadline; the action card below
# already carries the proposed action deadline.
# ---------------------------------------------------------------------------

$executionText = Replace-Regex-One-Or-Skip `
  $executionText `
  '(?ms)(control-center-case-facts[\s\S]{0,5000}?<dt[^>]*>\s*)Scadență(\s*</dt>)' `
  '$1Termen comercial$2' `
  '(?ms)control-center-case-facts[\s\S]{0,5000}?<dt[^>]*>\s*Termen comercial\s*</dt>' `
  "Selected case deadline semantics"

# ---------------------------------------------------------------------------
# 3) CONNECTED CONTEXT — provider-specific, truthful context descriptions.
# No invented usage counts, sync counts, permissions, or health metrics.
# ---------------------------------------------------------------------------

$contextFields = @(
  @{
    Label = "Gmail"
    Provider = "gmail"
    Description = "Conversații și context email autorizat."
  },
  @{
    Label = "Google Calendar"
    Provider = "google_calendar"
    Description = "Întâlniri și termene din calendarul autorizat."
  },
  @{
    Label = "Google Drive"
    Provider = "google_drive"
    Description = "Documente și dovezi disponibile în context."
  }
)

foreach ($item in $contextFields) {
  $escapedLabel = [regex]::Escape($item.Label)
  $escapedProvider = [regex]::Escape($item.Provider)
  $description = $item.Description

  $pattern = '(?ms)(label:\s*"' + $escapedLabel + '",\s*provider:\s*"' + $escapedProvider + '" as const,\s*)'
  $already = '(?ms)label:\s*"' + $escapedLabel + '",[\s\S]{0,220}?contextDescription:\s*"' + [regex]::Escape($description) + '"'

  $pageText = Replace-Regex-One-Or-Skip `
    $pageText `
    $pattern `
    ('$1contextDescription: "' + $description + '",' + "`n" + '        ') `
    $already `
    ("Connected context description: " + $item.Label)
}

$pageText = Replace-Regex-One-Or-Skip `
  $pageText `
  '(?ms)(integration\.active\s*\?\s*)"Disponibil în contextul comercial autorizat\."' `
  '$1integration.contextDescription' `
  '(?ms)integration\.active\s*\?\s*integration\.contextDescription' `
  "Connected context active-copy binding"

# ---------------------------------------------------------------------------
# 4) RECENT ACTIVITY — convert a dead blank panel into a useful empty state.
# It says what happened, what ReveNew is still doing, and gives one relevant
# next destination. This follows mature empty-state guidance without inventing
# activity.
# ---------------------------------------------------------------------------

$recentOldPattern = '(?ms)<p className="mt-3 border-t border-\[rgb\(var\(--border\)\)\] py-4 text-sm text-\[rgb\(var\(--text-muted\)\)\]">\s*Nicio schimbare comercială semnificativă în\s*ultimele 24 de ore\.\s*</p>'

$recentNew = @'
<div className="control-center-empty-state mt-3">
                <div className="control-center-empty-state-mark" aria-hidden="true">
                  <span />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[rgb(var(--foreground))]">
                    Nicio schimbare comercială semnificativă în ultimele 24 de ore.
                  </p>

                  <p className="mt-1.5 max-w-xl text-xs leading-5 text-[rgb(var(--text-muted))]">
                    ReveNew continuă să urmărească numai contextul disponibil din sursele autorizate.
                  </p>

                  <Link
                    href="/opportunities"
                    className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-[rgb(var(--interaction))] hover:underline"
                  >
                    Vezi oportunitățile monitorizate
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
'@

$pageText = Replace-Regex-One-Or-Skip `
  $pageText `
  $recentOldPattern `
  $recentNew `
  'control-center-empty-state' `
  "Recent activity actionable empty state"

# ---------------------------------------------------------------------------
# 5) CSS — one final canonical LIGHT-ONLY polish block.
# Dark palette is deliberately untouched.
# ---------------------------------------------------------------------------

$CssStart = "/* === REVENEW CONTROL CENTER LIGHT POLISH V4 START === */"
$CssEnd = "/* === REVENEW CONTROL CENTER LIGHT POLISH V4 END === */"

$canonicalCss = @'
/* === REVENEW CONTROL CENTER LIGHT POLISH V4 START === */
/*
   Intent:
   - pure-white application canvas remains untouched
   - graphite sidebar remains untouched
   - dark palette remains untouched
   - improve hierarchy, density, connected context and empty-state legibility
*/

:root:not(.dark) .control-center-source-grid {
  width: 100% !important;
  max-width: none !important;
}

@media (min-width: 640px) {
  :root:not(.dark) .control-center-source-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

:root:not(.dark) .control-center-source-card {
  min-width: 0;
  min-height: 7.7rem;
  border-color: rgb(206 224 217);
  background: rgb(255 255 255);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255),
    0 1px 2px rgb(18 24 34 / .018);
}

:root:not(.dark) .control-center-source-card:hover {
  border-color: rgb(164 205 190);
  background: rgb(253 255 254);
}

:root:not(.dark) .control-center-lower-panel {
  border-color: rgb(220 224 229);
  background: rgb(255 255 255);
  box-shadow: 0 1px 2px rgb(18 24 34 / .016);
}

:root:not(.dark) .control-center-empty-state {
  display: flex;
  min-height: 8.75rem;
  align-items: flex-start;
  gap: .8rem;
  border-top: 1px solid rgb(var(--border-subtle));
  border-radius: 0 0 .62rem .62rem;
  background: rgb(249 250 251);
  padding: 1rem;
}

:root:not(.dark) .control-center-empty-state-mark {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(216 221 227);
  border-radius: .58rem;
  background: rgb(255 255 255);
}

:root:not(.dark) .control-center-empty-state-mark > span {
  height: .42rem;
  width: .42rem;
  border-radius: 999px;
  background: rgb(var(--interaction) / .72);
  box-shadow: 0 0 0 4px rgb(var(--interaction) / .075);
}

:root:not(.dark) .control-center-case-facts {
  border-color: rgb(219 223 228);
  background: rgb(249 250 251);
}

:root:not(.dark) .control-center-case-facts > div {
  min-height: 3.55rem;
}

:root:not(.dark) .control-center-disclosure-summary {
  min-height: 3.1rem;
}

:root:not(.dark) .control-center-disclosure-summary:hover {
  background: rgb(248 249 250);
}

:root:not(.dark) .control-center-disclosure[open] {
  border-color: rgb(207 214 222);
}

:root:not(.dark) .control-center-disclosure[open]
  > .control-center-disclosure-summary {
  background: rgb(250 251 252);
}

:root:not(.dark) .control-center-ask-surface {
  width: min(100%, 72rem);
}

@media (max-width: 639px) {
  :root:not(.dark) .control-center-empty-state {
    min-height: 0;
    padding: .875rem;
  }
}

/* === REVENEW CONTROL CENTER LIGHT POLISH V4 END === */
'@

$existingCanonicalPattern = '(?ms)' + [regex]::Escape($CssStart) + '.*?' + [regex]::Escape($CssEnd)

if ([regex]::IsMatch($cssText, $existingCanonicalPattern)) {
  $cssText = [regex]::Replace(
    $cssText,
    $existingCanonicalPattern,
    $canonicalCss,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
  Write-Host "OK   Canonical light polish block refreshed" -ForegroundColor Green
} else {
  $cssText = $cssText.TrimEnd() + "`n`n" + $canonicalCss.Trim() + "`n"
  Write-Host "OK   Canonical light polish block installed" -ForegroundColor Green
}

# Safety assertion: the canonical block must never redefine dark mode.
$canonicalMatch = [regex]::Match(
  $cssText,
  $existingCanonicalPattern,
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

if (-not $canonicalMatch.Success) {
  throw "SAFE STOP: canonical V4 CSS block could not be verified."
}

if ($canonicalMatch.Value -match '(?m)^\s*\.dark\b') {
  throw "SAFE STOP: V4 attempted to define a .dark selector. No files were written."
}

# ---------------------------------------------------------------------------
# PRE-WRITE SOURCE SANITY
# Catch accidental PowerShell escape literals before any source file is written.
# ---------------------------------------------------------------------------

if ($pageText -match 'contextDescription:\s*"[^"]+",`n\s*status:') {
  throw "SAFE STOP: literal PowerShell newline token detected in dashboard source. No files were written."
}

if ($pageText.Contains('",`n        status:')) {
  throw "SAFE STOP: malformed contextDescription insertion detected. No files were written."
}

# ---------------------------------------------------------------------------
# BACKUP — only after ALL transformations/preconditions have succeeded.
# ---------------------------------------------------------------------------

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Repo ".manual-ui-backups\control-center-polish-v4-$Stamp"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

$backupTargets = @(
  @{ Relative = $ExecutionRel; Path = $Execution },
  @{ Relative = $PageRel; Path = $Page },
  @{ Relative = $CssRel; Path = $Css }
)

foreach ($target in $backupTargets) {
  $dest = Join-Path $BackupRoot $target.Relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item -LiteralPath $target.Path -Destination $dest -Force
}

$testExisted = Test-Path -LiteralPath $Test
if ($testExisted) {
  $testDest = Join-Path $BackupRoot $TestRel
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $testDest) | Out-Null
  Copy-Item -LiteralPath $Test -Destination $testDest -Force
}

$backupMeta = [ordered]@{
  package = "ReveNew-ControlCenter-Polish-v4.2"
  created_at = (Get-Date).ToString("o")
  test_existed = $testExisted
  targets = @($ExecutionRel, $PageRel, $CssRel, $TestRel)
}
$backupMeta | ConvertTo-Json -Depth 4 | Out-File -LiteralPath (Join-Path $BackupRoot "_backup.json") -Encoding utf8

# ---------------------------------------------------------------------------
# WRITE — UTF-8 without BOM, preserving each file's existing newline style.
# ---------------------------------------------------------------------------

Write-Utf8NoBom $Execution (Restore-Newlines $executionText $ExecutionCrLf)
Write-Utf8NoBom $Page (Restore-Newlines $pageText $PageCrLf)
Write-Utf8NoBom $Css (Restore-Newlines $cssText $CssCrLf)

$BundledTest = Join-Path $PSScriptRoot "payload\tests\control-center-polish-v4.test.mjs"
Assert-Path $BundledTest "bundled regression test"
Copy-Item -LiteralPath $BundledTest -Destination $Test -Force

$StateDir = Join-Path $PSScriptRoot ".state"
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
[System.IO.File]::WriteAllText(
  (Join-Path $StateDir "last-backup.txt"),
  $BackupRoot,
  $Utf8NoBom
)

Write-Host ""
Write-Host "Installed: ReveNew Control Center Polish V4.2" -ForegroundColor Green
Write-Host "Backup: $BackupRoot" -ForegroundColor Cyan
Write-Host "Dark palette: untouched by V4." -ForegroundColor DarkGray
Write-Host ""

if (-not $SkipVerify) {
  $Verify = Join-Path $PSScriptRoot "verify.ps1"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Verify -Repo $Repo
  if ($LASTEXITCODE -ne 0) {
    throw "Verification failed. Use rollback.ps1 to restore the backup above."
  }
}
