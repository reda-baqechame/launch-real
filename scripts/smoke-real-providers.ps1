$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$required = @(
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ONE_LAUNCH",
  "STRIPE_PRICE_FOUNDER_PRO",
  "STRIPE_PRICE_STUDIO",
  "RENDER_WEBHOOK_SECRET",
  "OAUTH_STATE_SECRET"
)

function Test-EnvName($name) {
  if ([Environment]::GetEnvironmentVariable($name)) { return $true }
  $envFile = Join-Path $root ".env.local"
  if (Test-Path -LiteralPath $envFile) {
    return [bool](Select-String -LiteralPath $envFile -Pattern "^\s*$name\s*=\s*\S+" -Quiet)
  }
  return $false
}

$missing = @($required | Where-Object { -not (Test-EnvName $_) })
if ($missing.Count -gt 0) {
  Write-Host "Missing required production provider env vars:"
  $missing | ForEach-Object { Write-Host " - $_" }
  throw "Real-provider smoke cannot run until required provider keys are configured."
}

@{ ok = $true; checked = $required.Count; message = "Required provider env vars are present. Run hosted browser/provider smoke against your deployed or local production stack next." } | ConvertTo-Json
