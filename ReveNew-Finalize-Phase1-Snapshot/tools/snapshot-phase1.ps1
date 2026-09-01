param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
  Write-Host ""
  Write-Host "SAFE STOP: $Message" -ForegroundColor Red
  exit 1
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Get-Location).Path
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$PackageJson = Join-Path $RepoRoot "package.json"

if (-not (Test-Path -LiteralPath $PackageJson)) {
  Fail "package.json not found. Run this from C:\Projects\ReveNew or pass -RepoRoot."
}

$srcRoot = Join-Path $RepoRoot "src"
if (-not (Test-Path -LiteralPath $srcRoot)) {
  Fail "src folder not found."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outRoot = Join-Path $RepoRoot (".finalize-snapshots\phase1-" + $stamp)
$filesRoot = Join-Path $outRoot "files"
New-Item -ItemType Directory -Force -Path $filesRoot | Out-Null

$patterns = @(
  "Brief comercial",
  "Brief executiv",
  "Revizuire comercial",
  "Activitatea mea",
  "Agenda de decizie",
  "view=executive",
  "view=review",
  "searchParams.view",
  "ExecutionControlCenter",
  "ControlCenter",
  "HomeAskSurface"
)

$allowedExtensions = @(".ts", ".tsx", ".css", ".mjs", ".js", ".json")
$denyNamePatterns = @(".env", "secret", "credential", "private-key", "service-role")

$candidates = Get-ChildItem -LiteralPath $srcRoot -Recurse -File | Where-Object {
  $allowedExtensions -contains $_.Extension.ToLowerInvariant()
}

$selected = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::OrdinalIgnoreCase)
$matchLines = New-Object System.Collections.Generic.List[string]

foreach ($file in $candidates) {
  $relative = $file.FullName.Substring($RepoRoot.Length).TrimStart('\','/')
  $lower = $relative.ToLowerInvariant()

  $denied = $false
  foreach ($deny in $denyNamePatterns) {
    if ($lower.Contains($deny)) {
      $denied = $true
      break
    }
  }
  if ($denied) { continue }

  try {
    $content = [System.IO.File]::ReadAllText($file.FullName)
  } catch {
    continue
  }

  foreach ($pattern in $patterns) {
    if ($content.IndexOf($pattern, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
      [void]$selected.Add($relative)
      $matchLines.Add(($relative + " :: " + $pattern))
    }
  }
}

$knownFiles = @(
  "src\app\(protected)\dashboard\page.tsx",
  "src\app\globals.css",
  "src\components\dashboard\ExecutionControlCenter.tsx",
  "src\components\dashboard\ControlCenterVisuals.tsx",
  "src\components\dashboard\HomeAskSurface.tsx",
  "src\components\dashboard\Sidebar.tsx",
  "src\components\dashboard\ShellNavigation.tsx",
  "package.json",
  "tsconfig.json"
)

foreach ($relative in $knownFiles) {
  $full = Join-Path $RepoRoot $relative
  if (Test-Path -LiteralPath $full) {
    [void]$selected.Add($relative)
  }
}

$testRoot = Join-Path $RepoRoot "tests"
if (Test-Path -LiteralPath $testRoot) {
  Get-ChildItem -LiteralPath $testRoot -File | Where-Object {
    $_.Name -match "control|dashboard|visual|executive|review|activity"
  } | ForEach-Object {
    $relative = $_.FullName.Substring($RepoRoot.Length).TrimStart('\','/')
    [void]$selected.Add($relative)
  }
}

if ($selected.Count -eq 0) {
  Fail "No relevant source files were discovered."
}

foreach ($relative in ($selected | Sort-Object)) {
  $source = Join-Path $RepoRoot $relative
  if (-not (Test-Path -LiteralPath $source)) { continue }

  $dest = Join-Path $filesRoot $relative
  $destDir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item -LiteralPath $source -Destination $dest -Force
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add("ReveNew Finalize Phase 1 snapshot")
$manifest.Add(("Created: " + (Get-Date).ToString("s")))
$manifest.Add(("Repo: " + $RepoRoot))
$manifest.Add("")
$manifest.Add("FILES")
foreach ($relative in ($selected | Sort-Object)) {
  $manifest.Add($relative)
}
$manifest.Add("")
$manifest.Add("DISCOVERY MATCHES")
foreach ($line in ($matchLines | Sort-Object -Unique)) {
  $manifest.Add($line)
}
$manifest.Add("")
$manifest.Add("SAFETY")
$manifest.Add("- No .env files are copied.")
$manifest.Add("- No secret/credential/service-role named files are copied.")
$manifest.Add("- Script is read-only for project source.")
[System.IO.File]::WriteAllLines((Join-Path $outRoot "manifest.txt"), $manifest)

try {
  $gitStatus = & git -C $RepoRoot status --short 2>&1
  [System.IO.File]::WriteAllLines((Join-Path $outRoot "git-status.txt"), [string[]]$gitStatus)
} catch {
  [System.IO.File]::WriteAllText((Join-Path $outRoot "git-status.txt"), "git status unavailable")
}

$preflight = @(
  "Snapshot-only preflight",
  ("package.json: " + (Test-Path -LiteralPath $PackageJson)),
  ("selected files: " + $selected.Count)
)
[System.IO.File]::WriteAllLines((Join-Path $outRoot "preflight.txt"), $preflight)

$zipPath = $outRoot + ".zip"
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -LiteralPath $outRoot -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "DONE - Phase 1 snapshot created." -ForegroundColor Green
Write-Host ("Files captured: " + $selected.Count)
Write-Host ("Folder: " + $outRoot)
Write-Host ("ZIP:    " + $zipPath)
Write-Host ""
Write-Host "Upload the ZIP here. No project source was modified." -ForegroundColor Yellow
