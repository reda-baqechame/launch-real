$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$examplePath = Join-Path $root ".env.example"
$targetPath = Join-Path $root ".env.local"

if (-not (Test-Path -LiteralPath $examplePath)) {
  throw ".env.example was not found."
}

$exampleLines = Get-Content -LiteralPath $examplePath
$envNames = @()
foreach ($line in $exampleLines) {
  if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=") {
    $envNames += $Matches[1]
  }
}
$envNames = @($envNames | Select-Object -Unique)

if (-not (Test-Path -LiteralPath $targetPath)) {
  Copy-Item -LiteralPath $examplePath -Destination $targetPath
  Write-Host "Created .env.local from .env.example with blank provider slots."
  Write-Host "Paste secrets into .env.local only. Do not commit it."
  exit 0
}

$existingLines = Get-Content -LiteralPath $targetPath
$existingNames = @{}
foreach ($line in $existingLines) {
  if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=") {
    $existingNames[$Matches[1]] = $true
  }
}

$missing = @($envNames | Where-Object { -not $existingNames.ContainsKey($_) })
if ($missing.Count -eq 0) {
  Write-Host ".env.local already has all known LaunchReel env slots."
  exit 0
}

$append = @("", "# Added by npm run prepare:env on $(Get-Date -Format s)")
foreach ($name in $missing) {
  $append += "$name="
}
Add-Content -LiteralPath $targetPath -Value $append

Write-Host "Updated .env.local with missing blank provider slots:"
$missing | ForEach-Object { Write-Host " - $_" }
Write-Host "Existing values were preserved and not printed."
