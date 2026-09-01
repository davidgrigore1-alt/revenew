#Requires -Version 5.1

param(
  [string]$Repo = "C:\Projects\ReveNew"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$StateFile = Join-Path $PSScriptRoot ".state\last-backup.txt"
if (-not (Test-Path -LiteralPath $StateFile)) {
  throw "No V4 backup state found. Nothing was rolled back."
}

$BackupRoot = [System.IO.File]::ReadAllText($StateFile, [System.Text.Encoding]::UTF8).Trim()
if (-not (Test-Path -LiteralPath $BackupRoot)) {
  throw "Backup directory no longer exists: $BackupRoot"
}

$MetaPath = Join-Path $BackupRoot "_backup.json"
if (-not (Test-Path -LiteralPath $MetaPath)) {
  throw "Backup metadata missing: $MetaPath"
}

$Meta = Get-Content -LiteralPath $MetaPath -Raw | ConvertFrom-Json

$restore = @(
  "src\components\dashboard\ExecutionControlCenter.tsx",
  "src\app\(protected)\dashboard\page.tsx",
  "src\app\globals.css"
)

foreach ($Relative in $restore) {
  $Source = Join-Path $BackupRoot $Relative
  $Destination = Join-Path $Repo $Relative

  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Backup source missing: $Source"
  }

  Copy-Item -LiteralPath $Source -Destination $Destination -Force
  Write-Host "RESTORED $Relative" -ForegroundColor Green
}

$TestRel = "tests\control-center-polish-v4.test.mjs"
$TestDestination = Join-Path $Repo $TestRel

if ($Meta.test_existed) {
  $TestSource = Join-Path $BackupRoot $TestRel
  if (-not (Test-Path -LiteralPath $TestSource)) {
    throw "Original test backup missing: $TestSource"
  }
  Copy-Item -LiteralPath $TestSource -Destination $TestDestination -Force
  Write-Host "RESTORED $TestRel" -ForegroundColor Green
} else {
  if (Test-Path -LiteralPath $TestDestination) {
    Remove-Item -LiteralPath $TestDestination -Force
    Write-Host "REMOVED package-added $TestRel" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Rollback complete." -ForegroundColor Green
Write-Host "Restored from: $BackupRoot" -ForegroundColor Cyan
