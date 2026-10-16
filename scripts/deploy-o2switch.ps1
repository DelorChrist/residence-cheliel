# ==============================================================================
# Script de preparation et de deploiement pour o2switch - Residence Cheliel
# ==============================================================================
param (
    [switch]$SkipBuild,
    [string]$OutputDir = "deploy"
)

$ErrorActionPreference = "Stop"

Write-Host "`n[1/5] Initialisation du deploiement o2switch..." -ForegroundColor Cyan

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$targetDeployDir = Join-Path $projectRoot $OutputDir
if (Test-Path $targetDeployDir) {
    Remove-Item -Path $targetDeployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $targetDeployDir | Out-Null

# --- 1. BUILD DU FRONTEND (Vite PWA) ---
if (-not $SkipBuild) {
    Write-Host "`n[2/5] Compilation du Frontend (Vite + PWA + Production)..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Echec de la compilation du frontend."
        exit 1
    }
} else {
    Write-Host "`n[2/5] Build ignore." -ForegroundColor Gray
}

# Verification des fichiers cles dans dist/
$distPath = Join-Path $projectRoot "dist"
$htaccessSource = Join-Path $projectRoot "public\.htaccess"
$htaccessTarget = Join-Path $distPath ".htaccess"

if ((Test-Path $htaccessSource) -and (-not (Test-Path $htaccessTarget))) {
    Copy-Item $htaccessSource $htaccessTarget -Force
}

# --- 2. PACKAGING DU FRONTEND ---
Write-Host "`n[3/5] Creation de l'archive ZIP Frontend pour public_html..." -ForegroundColor Yellow
$frontendZip = Join-Path $targetDeployDir "residence-cheliel-frontend.zip"

Compress-Archive -Path "$distPath\*" -DestinationPath $frontendZip -Force
Write-Host "Archive Frontend creee : $frontendZip" -ForegroundColor Green

# --- 3. PACKAGING DU BACKEND (Node.js pour o2switch) ---
Write-Host "`n[4/5] Preparation et compression du Backend Node.js..." -ForegroundColor Yellow
$backendZip = Join-Path $targetDeployDir "residence-cheliel-backend.zip"
$tempBackendDir = Join-Path $targetDeployDir "_temp_backend"

New-Item -ItemType Directory -Path $tempBackendDir | Out-Null

Copy-Item (Join-Path $projectRoot "backend\src") (Join-Path $tempBackendDir "src") -Recurse
Copy-Item (Join-Path $projectRoot "backend\database") (Join-Path $tempBackendDir "database") -Recurse
Copy-Item (Join-Path $projectRoot "backend\scripts") (Join-Path $tempBackendDir "scripts") -Recurse
Copy-Item (Join-Path $projectRoot "backend\package.json") (Join-Path $tempBackendDir "package.json")
Copy-Item (Join-Path $projectRoot "backend\package-lock.json") (Join-Path $tempBackendDir "package-lock.json")
Copy-Item (Join-Path $projectRoot "backend\.env.example") (Join-Path $tempBackendDir ".env.example")

New-Item -ItemType Directory -Path (Join-Path $tempBackendDir "uploads") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempBackendDir "tmp") | Out-Null
New-Item -ItemType File -Path (Join-Path $tempBackendDir "tmp\restart.txt") | Out-Null

$backendGuide = @"
Instructions de mise en service Backend o2switch :
1. Uploader ce contenu dans le dossier de votre application Node.js (ex: api.residencescheliel.com).
2. Dans cPanel > Setup Node.js App :
   - Node.js version : 20.x ou 22.x
   - Application mode : Production
   - Application startup file : src/server.js
3. Creer le fichier .env en vous basant sur .env.example avec les acces MariaDB crees dans cPanel.
4. Cliquer sur 'Run NPM Install'.
5. Pour redemarrer l'API apres modification : toucher le fichier 'tmp/restart.txt' ou cliquer sur 'Restart' dans cPanel.
"@
Set-Content -Path (Join-Path $tempBackendDir "O2SWITCH_README.txt") -Value $backendGuide -Encoding UTF8

Compress-Archive -Path "$tempBackendDir\*" -DestinationPath $backendZip -Force
Remove-Item -Path $tempBackendDir -Recurse -Force
Write-Host "Archive Backend creee : $backendZip" -ForegroundColor Green

# --- 4. RESUME ---
Write-Host "`n[5/5] Preparation terminee avec succes !" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "FICHIERS PRETS POUR DEPLOIEMENT O2SWITCH :" -ForegroundColor Cyan
Write-Host "1. Frontend PWA : $frontendZip" -ForegroundColor Yellow
Write-Host "   -> A extraire dans le dossier public_html (ou sous-domaine frontend)" -ForegroundColor Gray
Write-Host "2. Backend API  : $backendZip" -ForegroundColor Yellow
Write-Host "   -> A extraire dans le dossier Node.js cPanel (ex: api.residencescheliel.com)" -ForegroundColor Gray
Write-Host "Consultez DEPLOIEMENT_O2SWITCH.md pour le guide complet pas-a-pas." -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
