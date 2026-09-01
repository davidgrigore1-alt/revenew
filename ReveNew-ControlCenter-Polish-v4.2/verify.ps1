#Requires -Version 5.1

param(
  [string]$Repo = "C:\Projects\ReveNew",
  [switch]$Build
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $Repo)) {
  throw "Repo not found: $Repo"
}

Push-Location $Repo
try {
  Write-Host "== source contract test ==" -ForegroundColor Cyan
  & node --test tests/control-center-polish-v4.test.mjs
  if ($LASTEXITCODE -ne 0) { throw "V4 source contract test failed" }

  Write-Host "== existing Control Center tests ==" -ForegroundColor Cyan
  & node --test tests/execution-control-center.test.mjs
  if ($LASTEXITCODE -ne 0) { throw "Existing Control Center tests failed" }

  Write-Host "== typecheck ==" -ForegroundColor Cyan
  & npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) { throw "typecheck failed" }

  Write-Host "== lint ==" -ForegroundColor Cyan
  & npm.cmd run lint
  if ($LASTEXITCODE -ne 0) { throw "lint failed" }

  Write-Host "== git diff --check ==" -ForegroundColor Cyan
  & git diff --check
  if ($LASTEXITCODE -ne 0) { throw "git diff --check failed" }

  if ($Build) {
    Write-Host "== production build ==" -ForegroundColor Cyan
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
  }

  Write-Host ""
  Write-Host "ALL REQUESTED V4 CHECKS PASSED." -ForegroundColor Green
}
finally {
  Pop-Location
}
