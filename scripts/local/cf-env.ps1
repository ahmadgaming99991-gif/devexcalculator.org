<#
.SYNOPSIS
  Loads this machine's Cloudflare API token into the current PowerShell session.

.DESCRIPTION
  Dot-source it, once per terminal, when you want to run wrangler by hand:

      . .\scripts\local\cf-env.ps1
      npx wrangler whoami
      npx wrangler deployments list

  npm scripts do not need this. `npm run deploy`, `npm run preview` and the
  rest already go through scripts/local/with-cf-auth.mjs, which does the same
  job for one child process instead of the whole session.

  Never run `wrangler login`. There is no OAuth session on this machine by
  design: the API token is the credential, and a browser login would create a
  second one that can point at a different Cloudflare account — which deploys
  a duplicate Worker rather than failing. See docs/local-credentials.md.

  The token is read into an environment variable and is never printed, logged,
  or written anywhere. Closing the terminal discards it.
#>

$ErrorActionPreference = 'Stop'

if ($MyInvocation.InvocationName -ne '.') {
    Write-Host ''
    Write-Host '  Dot-source this script, or the variable is discarded when it exits:' -ForegroundColor Yellow
    Write-Host '      . .\scripts\local\cf-env.ps1' -ForegroundColor Yellow
    Write-Host ''
}

$repoRoot = Split-Path -Parent $PSScriptRoot | Split-Path -Parent

# The resolver is shared with the Node wrapper so exactly one file knows where
# the token lives. Its CLI prints the PATH, never the contents.
$tokenFile = & node (Join-Path $repoRoot 'scripts\local\local-config.mjs') '--print-token-file'

if ([string]::IsNullOrWhiteSpace($tokenFile)) {
    Write-Host ''
    Write-Host '  No Cloudflare token file found.' -ForegroundColor Red
    Write-Host '  Point .claude/local.json at the existing file - see docs/local-credentials.md.'
    Write-Host '  Do NOT run `wrangler login`.'
    Write-Host ''
    return
}

$token = (Get-Content -Path $tokenFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "  Token file is empty: $tokenFile" -ForegroundColor Red
    return
}

$env:CLOUDFLARE_API_TOKEN = $token
$token = $null

# Pinned so a wrangler call cannot resolve to a different account than the one
# that owns the Worker. Not a secret - it is in docs/ already.
if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    $env:CLOUDFLARE_ACCOUNT_ID = & node (Join-Path $repoRoot 'scripts\local\local-config.mjs') '--print-account-id'
}

Write-Host ''
Write-Host '  CLOUDFLARE_API_TOKEN  loaded for this session (value not shown)' -ForegroundColor Green
Write-Host "  source file           $tokenFile"
Write-Host "  CLOUDFLARE_ACCOUNT_ID $env:CLOUDFLARE_ACCOUNT_ID"
Write-Host ''
