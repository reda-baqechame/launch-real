# Fixed-interval build loop for Cursor agent sessions (default 15 minutes).
# Usage: .\scripts\start-build-loop.ps1 [intervalSeconds]

param(
    [int]$IntervalSeconds = 900
)

$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Starting LaunchReel build loop every ${IntervalSeconds}s. Ctrl+C to stop." -ForeGroundColor Green

while ($true) {
    & (Join-Path $PSScriptRoot "build-loop.ps1")
    Start-Sleep -Seconds $IntervalSeconds
}
