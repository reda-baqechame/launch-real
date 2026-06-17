$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$scanRoot = Join-Path $root "security-scans"
$scanId = Get-Date -Format "yyyyMMdd-HHmmss"
$scanDir = Join-Path $scanRoot $scanId
New-Item -ItemType Directory -Force -Path $scanDir | Out-Null

Push-Location $root
try {
  $audit = npm audit --omit=dev --json | Out-String
  $status = $LASTEXITCODE
  $auditPath = Join-Path $scanDir "npm-audit.json"
  $audit | Set-Content -Path $auditPath -Encoding UTF8

  $checks = @()
  $checks += @{ name = "npm audit --omit=dev"; ok = ($status -eq 0); artifact = $auditPath }
  $checks += @{ name = "agent SSRF gate present"; ok = [bool](Select-String -Path "src/app/api/agent/route.ts","src/lib/agent-operator.ts" -Pattern "context.route|validatePublicHttpsUrl|blockedbyclient" -Quiet) }
  $checks += @{ name = "local free production lockout present"; ok = [bool](Select-String -Path "src/lib/local-free.ts" -Pattern "NODE_ENV.*production|process.env.NODE_ENV !== `"production`"" -Quiet) }
  $checks += @{ name = "credential sentinel eval present"; ok = [bool](Select-String -Path "scripts/e2e-agent-local.js","scripts/agent-evals-local.js" -Pattern "sentinel|Credential sentinel" -Quiet) }
  $checks += @{ name = "production auth required for agent jobs"; ok = [bool](Select-String -Path "src/app/api/agent/jobs/route.ts" -Pattern "NODE_ENV.*production|requireAuthUserId" -Quiet) }

  $failed = @($checks | Where-Object { -not $_.ok })
  $md = @()
  $md += "# LaunchReel security scan"
  $md += ""
  $md += "Scan id: $scanId"
  $md += ""
  $md += "This is an automated local security gate. It complements, but does not replace, the full Codex Security multi-phase review."
  $md += ""
  $md += "## Checks"
  foreach ($check in $checks) {
    $mark = if ($check.ok) { "PASS" } else { "FAIL" }
    $md += "- $mark - $($check.name)"
  }
  $md += ""
  $md += "## Result"
  $md += if ($failed.Count -eq 0) { "No automated release-blocking failures found." } else { "$($failed.Count) automated security check(s) failed." }
  $reportPath = Join-Path $scanDir "report.md"
  $md | Set-Content -Path $reportPath -Encoding UTF8

  $html = "<!doctype html><html><head><meta charset='utf-8'><title>LaunchReel security scan</title></head><body><pre>$([System.Net.WebUtility]::HtmlEncode(($md -join [Environment]::NewLine)))</pre></body></html>"
  $html | Set-Content -Path (Join-Path $scanDir "report.html") -Encoding UTF8

  @{ ok = ($failed.Count -eq 0); scanDir = $scanDir; failed = $failed.Count } | ConvertTo-Json
  if ($failed.Count -gt 0) { throw "Security scan failed." }
} finally {
  Pop-Location
}
