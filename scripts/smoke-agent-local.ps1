$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$baseUrl = $env:LAUNCHREEL_E2E_BASE_URL
if (-not $baseUrl) { $baseUrl = "http://127.0.0.1:3000" }

function Get-PublicConfig {
  try {
    return Invoke-RestMethod "$baseUrl/api/public-config" -TimeoutSec 5
  } catch {
    return $null
  }
}

$started = $false
$config = Get-PublicConfig
if ($config -and -not $config.localFree) {
  throw "A server is already running at $baseUrl but local free mode is not enabled."
}

if (-not $config) {
  $env:LAUNCHREEL_LOCAL_FREE_MODE = "true"
  $proc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "-p", "3000") -WorkingDirectory $root -WindowStyle Hidden -PassThru
  $started = $true
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 2
    $config = Get-PublicConfig
  } while ((-not $config) -and (Get-Date) -lt $deadline)
  if (-not $config) {
    if ($proc) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    throw "LaunchReel dev server did not start at $baseUrl."
  }
}

if (-not $config.localFree) {
  throw "Expected local free mode from /api/public-config."
}

try {
  Push-Location $root
  $env:LAUNCHREEL_E2E_BASE_URL = $baseUrl
  node scripts/e2e-agent-local.js
  if ($LASTEXITCODE -ne 0) {
    throw "Agent local smoke failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
  if ($started) {
    $owners = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($owner in $owners) {
      if ($owner -and (Get-Process -Id $owner -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
      }
    }
    if ($proc) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  }
}
