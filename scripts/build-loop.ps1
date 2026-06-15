# LaunchReel agent build loop — runs verify and emits next backlog task.
# Usage: .\scripts\build-loop.ps1

$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")

function Get-NextBacklogTask {
    $backlog = Join-Path (Get-Location) "BUILD_BACKLOG.md"
    if (-not (Test-Path $backlog)) { return $null }
    foreach ($line in Get-Content $backlog) {
        if ($line -match '^\s*-\s*\[\s\]\s*(.+)$') {
            return $Matches[1].Trim()
        }
    }
    return $null
}

Write-Host "== LaunchReel build loop tick ==" -ForeGroundColor Cyan

npm run verify 2>&1 | Out-Host
$verifyExit = $LASTEXITCODE

$nextTask = Get-NextBacklogTask
if (-not $nextTask) {
    $nextTask = "Backlog complete — run verify only; propose new tasks in BUILD_BACKLOG.md if needed"
}

$prompt = "LaunchReel build-loop tick. Read BUILD_BACKLOG.md and docs/BUILD_LOOP.md. "
$prompt += "If verifyExit is not 0, fix build/lint first. "
$prompt += "Else implement ONE task: $nextTask. "
$prompt += "Mark completed tasks [x], run npm run verify, keep changes minimal."

$payload = @{
    prompt = $prompt
    verifyExit = $verifyExit
    nextTask = $nextTask
} | ConvertTo-Json -Compress

Write-Output ('AGENT_LOOP_WAKE_BUILD ' + $payload)

exit $verifyExit
