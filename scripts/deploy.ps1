param(
    [string]$Branch = "develop",
    [switch]$SkipPushDevelop
)

$RepoPath = Split-Path -Parent $PSScriptRoot

function Show-Popup($Title, $Message, $Icon) {
    $popup = New-Object -ComObject WScript.Shell
    $type = if ($Icon -eq "error") { 16 } else { 64 }
    $null = $popup.Popup($Message, 0, $Title, $type + 4096)
}

function Get-LatestRunId {
    $json = gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId 2>&1 | Out-String
    try {
        $parsed = $json | ConvertFrom-Json
        return [int]$parsed[0].databaseId
    } catch { return $null }
}

function Get-RunStatus {
    $json = gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId,status,conclusion 2>&1 | Out-String
    try {
        $parsed = $json | ConvertFrom-Json
        return $parsed[0]
    } catch { return $null }
}

try {
    Push-Location $RepoPath

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Thessara Deploy + CI/CD Monitor" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $currentBranch = git rev-parse --abbrev-ref HEAD
    Write-Host "[1/5] Branch atual: $currentBranch" -ForegroundColor Yellow

    if (-not $SkipPushDevelop -and $currentBranch -eq $Branch) {
        Write-Host "[2/5] Push $Branch..." -ForegroundColor Yellow
        git push origin $Branch
        if (-not $?) { throw "Falhou push da $Branch" }
    }

    Write-Host "[3/5] Fazendo checkout da main e merge..." -ForegroundColor Yellow
    if ((git rev-parse --abbrev-ref HEAD) -ne "main") {
        git checkout main 2>&1 | Out-Null
        if (-not $?) { throw "Falhou checkout da main" }
    } else {
        Write-Host "  Ja esta na main" -ForegroundColor Gray
    }

    git merge $Branch 2>&1 | Out-Null
    if (-not $?) {
        $err = git merge $Branch 2>&1
        throw "Falhou merge: $err"
    }

    $runIdBefore = Get-LatestRunId
    Write-Host "  Run ID anterior: $runIdBefore" -ForegroundColor Gray

    Write-Host "[4/5] Push da main (CI/CD sera disparado)..." -ForegroundColor Yellow
    git push origin main
    if (-not $?) { throw "Falhou push da main" }

    Write-Host "[5/5] Voltando para $Branch..." -ForegroundColor Yellow
    git checkout $Branch 2>&1 | Out-Null

    Write-Host "`nAguardando CI/CD no GitHub Actions..." -ForegroundColor Green

    Start-Sleep -Seconds 8

    $timeout = 300
    $elapsed = 0
    $done = $false
    $lastStatus = ""

    while (-not $done -and $elapsed -lt $timeout) {
        $run = Get-RunStatus
        if ($run -and $run.databaseId -ne $runIdBefore) {
            if ($run.status -ne $lastStatus) {
                Write-Host "  Status: $($run.status)" -ForegroundColor Gray
                $lastStatus = $run.status
            }
            if ($run.status -eq "completed") {
                $done = $true
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
                break
            }
        }
        Start-Sleep -Seconds 10
        $elapsed += 10
    }

    if (-not $done) {
        Write-Host "`nTempo limite excedido (5 min)." -ForegroundColor Red
        Show-Popup "Thessara Deploy - Timeout" "Tempo limite excedido. Verifique o GitHub Actions manualmente." "error"
    }

} catch {
    Write-Host "`nERRO: $_" -ForegroundColor Red
    Show-Popup "Thessara Deploy - Erro" "Erro: $_" "error"
} finally {
    Pop-Location
}
