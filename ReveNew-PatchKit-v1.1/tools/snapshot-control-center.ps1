#Requires -Version 5.1

param(
  [string]$Repo = "C:\Projects\ReveNew"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $Repo)) {
  throw "Repo not found: $Repo"
}

$Kit = Split-Path -Parent $PSScriptRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutDir = Join-Path $Kit "snapshots\control-center-$Stamp"
$ZipPath = "$OutDir.zip"

$Targets = @(
  "src\app\(protected)\dashboard\page.tsx",
  "src\app\globals.css",
  "src\components\dashboard\ExecutionControlCenter.tsx",
  "src\components\dashboard\ControlCenterVisuals.tsx",
  "src\components\dashboard\HomeAskSurface.tsx",
  "src\components\dashboard\Sidebar.tsx",
  "src\components\dashboard\ShellNavigation.tsx",
  "src\components\dashboard\ControlCenterViews.tsx",
  "src\components\ui\SegmentedFilter.tsx",
  "tests\execution-control-center.test.mjs",
  "tests\visual-excellence.test.mjs",
  "package.json",
  "package-lock.json",
  "docs\a4-design-system.md",
  "docs\a4-reference-library.md"
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

foreach ($Relative in $Targets) {
  if ($Relative -like ".env*" -or $Relative -match "(^|\\)\.env") {
    continue
  }

  $Source = Join-Path $Repo $Relative
  if (Test-Path -LiteralPath $Source) {
    $Destination = Join-Path $OutDir $Relative
    $Parent = Split-Path -Parent $Destination
    if ($Parent) {
      New-Item -ItemType Directory -Force -Path $Parent | Out-Null
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
  }
}

Push-Location $Repo
try {
  git status --short |
    Out-File -LiteralPath (Join-Path $OutDir "_git-status.txt") -Encoding utf8

  git diff --stat |
    Out-File -LiteralPath (Join-Path $OutDir "_git-diff-stat.txt") -Encoding utf8

  $Focus = @(
    "src/app/(protected)/dashboard/page.tsx",
    "src/app/globals.css",
    "src/components/dashboard/ExecutionControlCenter.tsx",
    "src/components/dashboard/ControlCenterVisuals.tsx",
    "src/components/dashboard/HomeAskSurface.tsx",
    "src/components/dashboard/Sidebar.tsx",
    "src/components/dashboard/ShellNavigation.tsx"
  )

  git diff -- $Focus |
    Out-File -LiteralPath (Join-Path $OutDir "_focused-diff.patch") -Encoding utf8
}
finally {
  Pop-Location
}

$Meta = [ordered]@{
  generated_at = (Get-Date).ToString("o")
  repo = $Repo
  purpose = "ReveNew Control Center exact-source snapshot for safe UI patching"
  excludes_secrets = $true
  no_env_files = $true
  targets = $Targets
}

$Meta |
  ConvertTo-Json -Depth 5 |
  Out-File -LiteralPath (Join-Path $OutDir "_snapshot.json") -Encoding utf8

if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive `
  -Path (Join-Path $OutDir "*") `
  -DestinationPath $ZipPath `
  -CompressionLevel Optimal

Write-Host ""
Write-Host "Snapshot created successfully:" -ForegroundColor Green
Write-Host $ZipPath -ForegroundColor Cyan
Write-Host ""
Write-Host "Upload this ZIP to ChatGPT." -ForegroundColor Yellow
Write-Host "No .env files were copied." -ForegroundColor DarkGray
