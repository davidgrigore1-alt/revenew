#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Page = Join-Path $Root 'src\app\(protected)\dashboard\page.tsx'
$Css  = Join-Path $Root 'src\app\globals.css'

if (-not (Test-Path -LiteralPath $Page)) { throw "Missing file: $Page" }
if (-not (Test-Path -LiteralPath $Css))  { throw "Missing file: $Css" }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $Root ".manual-ui-backups\control-center-premium-resume-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Copy-Item -LiteralPath $Page -Destination (Join-Path $backupDir 'page.tsx') -Force
Copy-Item -LiteralPath $Css  -Destination (Join-Path $backupDir 'globals.css') -Force

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$pageText = [System.IO.File]::ReadAllText($Page, $utf8NoBom)
$cssText  = [System.IO.File]::ReadAllText($Css,  $utf8NoBom)

function Replace-Exact {
    param(
        [string]$Text,
        [string]$Old,
        [string]$New,
        [string]$Label
    )
    if (-not $Text.Contains($Old)) {
        throw "SAFE STOP: expected block not found: $Label"
    }
    $count = ([regex]::Matches($Text, [regex]::Escape($Old))).Count
    if ($count -ne 1) {
        throw "SAFE STOP: expected exactly one block for '$Label', found $count"
    }
    Write-Host "OK  $Label" -ForegroundColor Green
    return $Text.Replace($Old, $New)
}

function Insert-After-Exact {
    param(
        [string]$Text,
        [string]$Anchor,
        [string]$Insert,
        [string]$Label
    )
    if ($Text.Contains($Insert.Trim())) {
        Write-Host "SKIP $Label already present" -ForegroundColor DarkYellow
        return $Text
    }
    if (-not $Text.Contains($Anchor)) {
        throw "SAFE STOP: anchor not found: $Label"
    }
    $count = ([regex]::Matches($Text, [regex]::Escape($Anchor))).Count
    if ($count -ne 1) {
        throw "SAFE STOP: expected exactly one anchor for '$Label', found $count"
    }
    Write-Host "OK  $Label" -ForegroundColor Green
    return $Text.Replace($Anchor, $Anchor + "`r`n`r`n" + $Insert)
}

# ---------------------------------------------------------------------------
# 1. Disclosure summaries: clearer hierarchy and integrated action affordance
# ---------------------------------------------------------------------------

$old = @'
            <summary className="control-center-disclosure-summary focus-ring flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
              <span className="text-sm font-semibold">Pregătire și aprobare intervenții</span>
              <span aria-hidden="true" className="control-center-disclosure-chevron">⌄</span>
            </summary>
'@

$new = @'
            <summary className="control-center-disclosure-summary focus-ring flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[rgb(var(--foreground))]">
                  Pregătire și aprobare intervenții
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-[rgb(var(--text-muted))]">
                  Revizuiește intervențiile pregătite înainte de orice aplicare.
                </span>
              </span>

              <span className="inline-flex shrink-0 items-center gap-2.5">
                <span className="hidden text-[11px] font-semibold text-[rgb(var(--text-muted))] sm:inline group-open:hidden">
                  Deschide
                </span>
                <span className="hidden text-[11px] font-semibold text-[rgb(var(--primary))] sm:group-open:inline">
                  Închide
                </span>
                <span aria-hidden="true" className="control-center-disclosure-chevron">⌄</span>
              </span>
            </summary>
'@

$pageText = Replace-Exact $pageText $old $new "Disclosure: intervention preparation"

$old = @'
            <summary className="control-center-disclosure-summary focus-ring flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
              <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">Alte semnale și decizii comerciale</span>
              <span aria-hidden="true" className="control-center-disclosure-chevron">⌄</span>
            </summary>
'@

$new = @'
            <summary className="control-center-disclosure-summary focus-ring flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[rgb(var(--text-secondary))]">
                  Alte semnale și decizii comerciale
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-[rgb(var(--text-muted))]">
                  Semnale secundare care pot schimba ordinea de intervenție.
                </span>
              </span>

              <span className="inline-flex shrink-0 items-center gap-2.5">
                <span className="hidden text-[11px] font-semibold text-[rgb(var(--text-muted))] sm:inline group-open:hidden">
                  Deschide
                </span>
                <span className="hidden text-[11px] font-semibold text-[rgb(var(--primary))] sm:group-open:inline">
                  Închide
                </span>
                <span aria-hidden="true" className="control-center-disclosure-chevron">⌄</span>
              </span>
            </summary>
'@

$pageText = Replace-Exact $pageText $old $new "Disclosure: secondary signals"

# Refine analyst subtitle only; no AI behavior changes.
$old = @'
                  Întreabă ce s-a schimbat, de ce contează
                  sau pregătește următorul pas.
'@
$new = @'
                  Verifică schimbările, blocajele și următorul pas sigur.
'@
$pageText = Replace-Exact $pageText $old $new "Analyst disclosure subtitle"

# ---------------------------------------------------------------------------
# 2. Chevron optical centering
# ---------------------------------------------------------------------------

$old = @'
  transform: rotate(45deg);
  transform-origin: 50% 50%;
'@
$new = @'
  transform: translateY(-1px) rotate(45deg);
  transform-origin: 50% 50%;
'@
$cssText = Replace-Exact $cssText $old $new "Chevron closed optical centering"

$old = @'
  transform: rotate(225deg);
}
'@
$new = @'
  transform: translateY(1px) rotate(225deg);
}
'@
$cssText = Replace-Exact $cssText $old $new "Chevron open optical centering"

# ---------------------------------------------------------------------------
# 3. Analyst surface: narrower, more deliberate, no dark color changes
# ---------------------------------------------------------------------------

$old = @'
.control-center-ask-surface { padding: .125rem; }
.control-center-ask-surface .product-work-surface { box-shadow: none; }
'@

$new = @'
.control-center-ask-surface {
  width: min(100%, 68rem);
  margin-inline: auto;
  padding: .25rem 0 .125rem;
}

.control-center-ask-surface .product-work-surface {
  box-shadow: none;
}

:root:not(.dark) .control-center-ask-surface .product-work-surface {
  border-color: rgb(220 224 229);
  background: rgb(255 255 255);
}
'@

$cssText = Replace-Exact $cssText $old $new "Analyst surface composition"

# ---------------------------------------------------------------------------
# 4. Connected context: use full width
# ---------------------------------------------------------------------------

$old = @'
.control-center-source-grid {
  max-width: 68rem;
}
'@
$new = @'
.control-center-source-grid {
  width: 100%;
  max-width: none;
}
'@
$cssText = Replace-Exact $cssText $old $new "Connected context full-width grid"

# ---------------------------------------------------------------------------
# 5. Premium light-mode refinements only.
#    Dark mode colors remain on the existing dark token system.
# ---------------------------------------------------------------------------

$anchor = @'
.dark .control-center-source-card {
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .02);
}
'@

$insert = @'
/* Control Center premium light-mode refinements — intentionally light-only */
:root:not(.dark) .control-center-source-card {
  min-height: 7.25rem;
  border-color: rgb(197 221 212);
  background: rgb(255 255 255);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255),
    0 2px 10px rgb(20 25 34 / .024);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}

:root:not(.dark) .control-center-source-card:hover {
  border-color: rgb(158 205 187);
  transform: translateY(-1px);
}

:root:not(.dark) .control-center-next-action {
  border-color: rgb(217 183 94 / .62);
  background: linear-gradient(180deg, rgb(255 252 243), rgb(255 249 232));
  box-shadow:
    inset 3px 0 0 rgb(var(--gold-500) / .82),
    0 4px 16px rgb(108 79 19 / .035);
}

:root:not(.dark) .control-center-lower-panel {
  border-color: rgb(221 224 228);
  background: rgb(255 255 255);
  box-shadow: 0 2px 10px rgb(20 25 34 / .018);
}

:root:not(.dark) .control-center-truth-strip .control-center-metric:first-child {
  min-width: 11rem;
  border-color: rgb(var(--interaction-border) / .56);
  background: rgb(255 255 255);
  box-shadow: inset 0 0 0 1px rgb(var(--interaction) / .025);
}

:root:not(.dark) .control-center-truth-strip .control-center-metric:nth-child(2) {
  border-color: rgb(214 166 107 / .48);
  background: rgb(255 252 247);
}

:root:not(.dark) .control-center-truth-strip .control-center-metric:nth-child(3),
:root:not(.dark) .control-center-truth-strip .control-center-metric:nth-child(4) {
  background: rgb(255 255 255);
}

:root:not(.dark) .control-center-disclosure-summary {
  min-height: 3.35rem;
}

:root:not(.dark) .control-center-disclosure[open] > .control-center-disclosure-summary {
  background: rgb(249 250 251);
}

:root:not(.dark) .control-center-disclosure-content {
  border-top-color: rgb(226 229 233);
}

@media (max-width: 767px) {
  :root:not(.dark) .control-center-source-card:hover {
    transform: none;
  }
}
'@

$cssText = Insert-After-Exact $cssText $anchor $insert "Light-only premium depth refinements"

# ---------------------------------------------------------------------------
# Save as UTF-8 without BOM (project encoding).
# ---------------------------------------------------------------------------
[System.IO.File]::WriteAllText($Page, $pageText, $utf8NoBom)
[System.IO.File]::WriteAllText($Css,  $cssText,  $utf8NoBom)

Write-Host ""
Write-Host "Files updated safely." -ForegroundColor Cyan
Write-Host "Backup: $backupDir" -ForegroundColor DarkGray
Write-Host ""

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
Push-Location $Root
try {
    Write-Host "Running typecheck..." -ForegroundColor Cyan
    & npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) { throw "typecheck failed with exit code $LASTEXITCODE" }

    Write-Host "Running lint..." -ForegroundColor Cyan
    & npm.cmd run lint
    if ($LASTEXITCODE -ne 0) { throw "lint failed with exit code $LASTEXITCODE" }

    Write-Host "Running git diff --check..." -ForegroundColor Cyan
    & git diff --check
    if ($LASTEXITCODE -ne 0) { throw "git diff --check failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "DONE - Control Center premium resume pass installed." -ForegroundColor Green
Write-Host "Dark-mode palette was not redefined." -ForegroundColor Green
Write-Host "Refresh the browser with Ctrl+Shift+R and inspect light + dark mode." -ForegroundColor Yellow
