param(
  [string]$ForwardTo = $env:STRIPE_FORWARD_TO
)

if (-not $ForwardTo) {
  $ForwardTo = "localhost:3333/webhook/stripe"
}

function Resolve-StripeCli {
  $localStripe = Join-Path (Split-Path $PSScriptRoot -Parent) ".local-tools\stripe\stripe.exe"

  if (Test-Path $localStripe) {
    return $localStripe
  }

  $command = Get-Command stripe -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  $wingetPackageRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
  $wingetStripe = Get-ChildItem -Path $wingetPackageRoot -Recurse -Filter stripe.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName

  if ($wingetStripe) {
    return $wingetStripe
  }

  return $null
}

$stripeExecutable = Resolve-StripeCli

if (-not $stripeExecutable) {
  Write-Host "Stripe CLI nao encontrada." -ForegroundColor Red
  Write-Host ""
  Write-Host "Instale a Stripe CLI e rode novamente:" -ForegroundColor Yellow
  Write-Host "  winget install --id Stripe.StripeCLI"
  Write-Host ""
  Write-Host "Depois autentique:"
  Write-Host "  npm run stripe:login"
  Write-Host ""
  exit 1
}

Write-Host "Encaminhando webhooks Stripe para http://$ForwardTo" -ForegroundColor Green
Write-Host ""
Write-Host "Copie o segredo whsec_... exibido pela Stripe CLI e coloque no backend/.env:" -ForegroundColor Yellow
Write-Host "  STRIPE_WEBHOOK_SECRET=whsec_..."
Write-Host ""
Write-Host "Eventos esperados pelo backend:"
Write-Host "  payment_intent.succeeded"
Write-Host "  payment_intent.payment_failed"
Write-Host "  payment_intent.canceled"
Write-Host ""

$configDir = Join-Path (Split-Path $PSScriptRoot -Parent) ".local-tools\stripe-config"
$configPath = Join-Path $configDir "config.toml"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$env:HOME = $configDir
$env:XDG_CONFIG_HOME = $configDir

if (-not $env:STRIPE_API_KEY) {
  $backendEnvPath = Join-Path (Split-Path $PSScriptRoot -Parent) "backend\.env"

  if (Test-Path $backendEnvPath) {
    $stripeSecret = Get-Content -LiteralPath $backendEnvPath |
      Where-Object { $_ -match '^STRIPE_SECRET_KEY=' } |
      Select-Object -First 1

    if ($stripeSecret) {
      $candidate = $stripeSecret -replace '^STRIPE_SECRET_KEY=', ''

      if ($candidate -and -not $candidate.Contains('xxxxx')) {
        $env:STRIPE_API_KEY = $candidate
      }
    }
  }
}

& $stripeExecutable "--config=$configPath" listen --forward-to $ForwardTo
