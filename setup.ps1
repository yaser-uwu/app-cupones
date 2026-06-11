# Ejecuta esto UNA sola vez para configurar todo
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendEnv = Join-Path $ProjectRoot "frontend\.env"
$SupabaseUrl = "https://zpracfzjnnvlkgqjydiq.supabase.co"
$ProjectRef = "zpracfzjnnvlkgqjydiq"

Write-Host ""
Write-Host "=== Configuracion Cupones de Pareja ===" -ForegroundColor Magenta
Write-Host ""

# 1. Anon key
Write-Host "1. Abre Supabase -> Settings -> API -> anon public" -ForegroundColor Cyan
Write-Host "   URL: https://supabase.com/dashboard/project/$ProjectRef/settings/api" -ForegroundColor DarkGray
Write-Host ""
$anonKey = Read-Host "Pega aqui tu ANON KEY y pulsa Enter"

if ([string]::IsNullOrWhiteSpace($anonKey)) {
    Write-Host "Error: necesitas la anon key." -ForegroundColor Red
    exit 1
}

@"
VITE_SUPABASE_URL=$SupabaseUrl
VITE_SUPABASE_ANON_KEY=$anonKey
"@ | Set-Content -Path $FrontendEnv -Encoding UTF8

Write-Host ""
Write-Host "frontend/.env creado" -ForegroundColor Green

# 2. SQL
Write-Host ""
Write-Host "2. Ejecuta el SQL en Supabase (SQL Editor)" -ForegroundColor Cyan
Write-Host "   URL: https://supabase.com/dashboard/project/$ProjectRef/sql/new" -ForegroundColor DarkGray
Write-Host ""

$combinedSql = Join-Path $ProjectRoot "supabase\setup_completo.sql"
$m1 = Get-Content (Join-Path $ProjectRoot "supabase\migrations\001_initial_schema.sql") -Raw
$m2 = Get-Content (Join-Path $ProjectRoot "supabase\migrations\002_rls_and_functions.sql") -Raw
($m1 + "`n`n" + $m2) | Set-Content -Path $combinedSql -Encoding UTF8

Write-Host "   SQL combinado en: supabase\setup_completo.sql" -ForegroundColor DarkGray
Write-Host "   Copialo y ejecutalo en el SQL Editor de Supabase." -ForegroundColor Yellow
Write-Host ""

$openSql = Read-Host "Abrir el SQL Editor en el navegador? (s/n)"
if ($openSql -eq "s") {
    Start-Process "https://supabase.com/dashboard/project/$ProjectRef/sql/new"
    Start-Process $combinedSql
}

# 3. URL config reminder
Write-Host ""
Write-Host "3. Verifica en Supabase -> Authentication -> URL Configuration:" -ForegroundColor Cyan
Write-Host "   Site URL:        http://localhost:5173" -ForegroundColor White
Write-Host "   Redirect URLs:   http://localhost:5173" -ForegroundColor White
Write-Host ""

Write-Host "Listo! Ahora ejecuta: .\start.ps1" -ForegroundColor Green
Write-Host ""
