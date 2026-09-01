#Requires -Version 5.1
param([string]$Repo = "C:\Projects\ReveNew")
$ErrorActionPreference = "Stop"
$root = Join-Path $Repo '.manual-ui-backups'
$backup = Get-ChildItem -LiteralPath $root -Directory -Filter 'finalize-phase1a-*' | Sort-Object Name -Descending | Select-Object -First 1
if (-not $backup) { throw 'No finalize-phase1a backup found.' }
$pageSource = Join-Path $backup.FullName 'src\app\(protected)\dashboard\page.tsx'
$cssSource  = Join-Path $backup.FullName 'src\app\globals.css'
$pageDest = Join-Path $Repo 'src\app\(protected)\dashboard\page.tsx'
$cssDest  = Join-Path $Repo 'src\app\globals.css'
if (-not (Test-Path -LiteralPath $pageSource) -or -not (Test-Path -LiteralPath $cssSource)) { throw 'Backup is incomplete; refusing rollback.' }
Copy-Item -LiteralPath $pageSource -Destination $pageDest -Force
Copy-Item -LiteralPath $cssSource -Destination $cssDest -Force
Write-Host "Rollback complete from: $($backup.FullName)" -ForegroundColor Green
