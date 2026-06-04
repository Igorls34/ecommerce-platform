param(
    [int]$TimeoutSeconds = 300,
    [switch]$WaitForNewRun
)

function Show-Popup($Title, $Message, $Icon) {
    $popup = New-Object -ComObject WScript.Shell
    $type = if ($Icon -eq "error") { 16 } else { 64 }
    $null = $popup.Popup($Message, 0, $Title, $type + 4096)
}

function Get-RunInfo {
    $json = gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId,status,conclusion 2>&1 | Out-String
    try { return $json | ConvertFrom-Json | Select-Object -First 1 } catch { return $null }
}

Write-Host "Monitorando CI/CD da main..." -ForegroundColor Cyan

$runBefore = Get-RunInfo
$targetId = $null
$elapsed = 0
$lastStatus = ""

if ($WaitForNewRun -and $runBefore) {
    Write-Host "  Run atual: $($runBefore.databaseId) ($($runBefore.status))" -ForegroundColor Gray
    Write-Host "  Aguardando novo push + CI/CD iniciar..." -ForegroundColor Yellow
}

while ($elapsed -lt $TimeoutSeconds) {
    $run = Get-RunInfo
    if ($run) {
        if ($WaitForNewRun -and -not $targetId) {
            if ($run.databaseId -ne $runBefore.databaseId) {
                $targetId = $run.databaseId
                Write-Host "  Nova run detectada: $targetId ($($run.status))" -ForegroundColor Green
                $lastStatus = $run.status
            }
        } else {
            if (-not $targetId) { $targetId = $run.databaseId }
        }

        if ($targetId -and $run.databaseId -eq $targetId) {
            if ($run.status -ne $lastStatus) {
                Write-Host "  Status: $($run.status)" -ForegroundColor Gray
                $lastStatus = $run.status
            }
            if ($run.status -eq "completed") {
                if ($run.conclusion -eq "success") {
                    Write-Host "`n========================================" -ForegroundColor Green
                    Write-Host "  ✅ DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
                    Write-Host "========================================" -ForegroundColor Green
                    Show-Popup "Thessara Deploy - Sucesso" "Deploy concluido com sucesso!" "info"
                } else {
                    Write-Host "`n========================================" -ForegroundColor Red
                    Write-Host "  ❌ DEPLOY FALHOU: $($run.conclusion)" -ForegroundColor Red
                    Write-Host "========================================" -ForegroundColor Red
                    Show-Popup "Thessara Deploy - Erro" "Deploy FALHOU: $($run.conclusion)" "error"
                }
                return
            }
        }
    }
    Start-Sleep -Seconds 10
    $elapsed += 10
}

Write-Host "`n⏱  Tempo limite excedido." -ForegroundColor Red
Show-Popup "Thessara Deploy - Timeout" "CI/CD nao completou em $TimeoutSeconds segundos." "error"
