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
  Write-Host "== typecheck ==" -ForegroundColor Cyan
  & npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) {
    throw "typecheck failed with exit code $LASTEXITCODE"
  }

  Write-Host "== lint ==" -ForegroundColor Cyan
  & npm.cmd run lint
  if ($LASTEXITCODE -ne 0) {
    throw "lint failed with exit code $LASTEXITCODE"
  }

  if (Test-Path -LiteralPath "tests\execution-control-center.test.mjs") {
    Write-Host "== focused tests ==" -ForegroundColor Cyan
    & node --test tests/execution-control-center.test.mjs
    if ($LASTEXITCODE -ne 0) {
      throw "focused tests failed with exit code $LASTEXITCODE"
    }
  }

  Write-Host "== git diff --check ==" -ForegroundColor Cyan
  & git diff --check
  if ($LASTEXITCODE -ne 0) {
    throw "git diff --check failed with exit code $LASTEXITCODE"
  }

  if ($Build) {
    Write-Host "== build ==" -ForegroundColor Cyan
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "build failed with exit code $LASTEXITCODE"
    }
  }

  Write-Host ""
  Write-Host "Automated verification passed." -ForegroundColor Green
}
finally {
  Pop-Location
}
