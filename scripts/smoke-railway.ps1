param(
  [string]$BaseUrl = $env:RAILWAY_APP_URL,
  [switch]$RequireProviders
)

$ErrorActionPreference = "Stop"

if (-not $BaseUrl) {
  throw "Set RAILWAY_APP_URL or pass -BaseUrl https://your-app.up.railway.app"
}

$BaseUrl = $BaseUrl.TrimEnd("/")
if ($BaseUrl -notmatch "^https?://") {
  throw "BaseUrl must start with http:// or https://"
}

function Invoke-Json($method, $url, $body = $null) {
  $params = @{
    Uri = $url
    Method = $method
    TimeoutSec = 30
    Headers = @{ "Accept" = "application/json" }
  }
  if ($null -ne $body) {
    $params.ContentType = "application/json"
    $params.Body = ($body | ConvertTo-Json -Depth 8)
  }
  Invoke-RestMethod @params
}

$publicConfig = Invoke-Json "GET" "$BaseUrl/api/public-config"
if ($publicConfig.localFree) {
  throw "Railway deployment reports localFree=true. Local free mode must not be active in production."
}

$checks = @(
  @{ name = "public config reachable"; ok = $true; value = $publicConfig },
  @{ name = "local free disabled"; ok = (-not [bool]$publicConfig.localFree); value = $publicConfig.localFree }
)

try {
  Invoke-Json "POST" "$BaseUrl/api/audit" @{
    url = "https://example.com"
    description = "Railway production smoke probe"
    audience = "LaunchReel operators"
  } | Out-Null
  $checks += @{ name = "signed-out audit route protection"; ok = $false; value = "unexpected success" }
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  $checks += @{ name = "signed-out audit route protection"; ok = ($status -in @(400, 401, 503)); value = $status }
}

if ($RequireProviders) {
  $requiredProviderFlags = @("clerk", "database", "cloudSync", "serverTts", "serverTranscribe")
  foreach ($flag in $requiredProviderFlags) {
    $value = [bool]$publicConfig.$flag
    $checks += @{ name = "provider flag $flag"; ok = $value; value = $value }
  }
}

$failed = @($checks | Where-Object { -not $_.ok })
$result = @{
  ok = ($failed.Count -eq 0)
  baseUrl = $BaseUrl
  checkedAt = (Get-Date).ToString("o")
  requireProviders = [bool]$RequireProviders
  checks = $checks
}

$result | ConvertTo-Json -Depth 10
if ($failed.Count -gt 0) {
  throw "Railway smoke failed $($failed.Count) check(s)."
}
