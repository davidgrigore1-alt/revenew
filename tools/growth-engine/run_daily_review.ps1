# Runs ONLY local research and preview creation; never sends an email.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
py -3 growth_v1.py init
if ($LASTEXITCODE -ne 0) { throw 'Could not initialize growth database' }
py -3 growth_v1.py batch --limit 10
if ($LASTEXITCODE -ne 0) { throw 'Could not process safe review batch' }
py -3 growth_v1.py dashboard
if ($LASTEXITCODE -ne 0) { throw 'Could not render review board' }
py -3 growth_v1.py export
if ($LASTEXITCODE -ne 0) { throw 'Could not export prospects' }
Write-Host 'ReveNew Growth Engine review board generated. No messages were sent.'
