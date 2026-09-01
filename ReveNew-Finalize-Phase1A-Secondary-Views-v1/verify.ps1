#Requires -Version 5.1
param([string]$Repo = "C:\Projects\ReveNew")
$ErrorActionPreference = "Stop"
$Page = Join-Path $Repo 'src\app\(protected)\dashboard\page.tsx'
$Css  = Join-Path $Repo 'src\app\globals.css'
$Marker = 'REVENew FINALIZE PHASE 1A - SECONDARY CONTROL CENTER VIEWS'
$pageText = [System.IO.File]::ReadAllText($Page, [System.Text.Encoding]::UTF8)
$cssText  = [System.IO.File]::ReadAllText($Css, [System.Text.Encoding]::UTF8)

if (([regex]::Matches($pageText, [regex]::Escape('control-center-secondary-canvas'))).Count -ne 2) { throw 'VERIFY FAIL: expected 2 scoped secondary canvases.' }
if (-not $cssText.Contains($Marker)) { throw 'VERIFY FAIL: CSS marker missing.' }
if (-not $cssText.Contains(':root:not(.dark) .product-desktop:has(.control-center-secondary-canvas)')) { throw 'VERIFY FAIL: light-only palette scope missing.' }
if ($cssText.Contains('.dark .product-desktop:has(.control-center-secondary-canvas)')) { throw 'VERIFY FAIL: dark palette override detected.' }

Push-Location $Repo
try {
  npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm.cmd run lint
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  git diff --check -- 'src/app/(protected)/dashboard/page.tsx' 'src/app/globals.css'
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally { Pop-Location }

Write-Host 'VERIFY OK - Phase 1A is structurally installed and validation is green.' -ForegroundColor Green
