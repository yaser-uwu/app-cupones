$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ProjectRoot "frontend"
$EnvFile = Join-Path $FrontendDir ".env"

if (-not (Test-Path $EnvFile)) {
    Write-Host "Primero ejecuta: .\setup.ps1" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $EnvFile -Raw
if ($envContent -match "PENDIENTE") {
    Write-Host "Falta la anon key. Ejecuta: .\setup.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "Iniciando frontend en http://localhost:5173 ..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Set-Location $FrontendDir
npm run dev
