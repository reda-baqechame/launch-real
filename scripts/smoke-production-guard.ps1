$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$port = $env:LAUNCHREEL_PROD_GUARD_PORT
if (-not $port) { $port = "3011" }
$baseUrl = "http://127.0.0.1:$port"

Push-Location $root
try {
  $env:LAUNCHREEL_LOCAL_FREE_MODE = "true"
  $env:NEXT_PUBLIC_APP_URL = $baseUrl
  $proc = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "start", "--", "-p", $port) -WorkingDirectory $root -WindowStyle Hidden -PassThru
  try {
    $deadline = (Get-Date).AddSeconds(45)
    do {
      Start-Sleep -Seconds 2
      try { $cfg = Invoke-RestMethod "$baseUrl/api/public-config" -TimeoutSec 3 } catch { $cfg = $null }
    } while ((-not $cfg) -and (Get-Date) -lt $deadline)
    if (-not $cfg) { throw "Production guard server did not start at $baseUrl." }
    if ($cfg.localFree) { throw "localFree unexpectedly true under production start." }

    $body = @{
      url = "https://example.com"
      contextLine = "production guard"
      goal = "guard"
      avoid = @()
      stopWhen = "done"
    } | ConvertTo-Json

    try {
      Invoke-RestMethod "$baseUrl/api/agent/jobs" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10 | Out-Null
      throw "Agent job unexpectedly allowed signed-out production request."
    } catch {
      $status = $_.Exception.Response.StatusCode.value__
      if ($status -ne 401) { throw "Expected 401 from production agent job, got $status." }
    }

    @{ ok = $true; localFree = $cfg.localFree; signedOutAgentJob = 401 } | ConvertTo-Json
  } finally {
    if ($proc) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    $owners = Get-NetTCPConnection -LocalPort ([int]$port) -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($owner in $owners) {
      if ($owner) { Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue }
    }
  }
} finally {
  Pop-Location
}
