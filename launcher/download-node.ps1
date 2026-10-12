# Script de téléchargement automatique de Node.js autonome (Standalone) pour distribution 100% sans prérequis

$nodeDir = Join-Path $PSScriptRoot "..\node"
if (-not (Test-Path $nodeDir)) {
    New-Item -ItemType Directory -Path $nodeDir -Force | Out-Null
}

$nodeExe = Join-Path $nodeDir "node.exe"

if (Test-Path $nodeExe) {
    Write-Host "Node.js autonome déjà présent dans $nodeExe" -ForegroundColor Green
    exit 0
}

Write-Host "Téléchargement de Node.js officiel autonome (x64 Windows)..." -ForegroundColor Cyan
$nodeUrl = "https://nodejs.org/dist/v20.18.0/win-x64/node.exe"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeExe -UseBasicParsing
    Write-Host "Node.js téléchargé avec succès dans $nodeExe !" -ForegroundColor Green
} catch {
    Write-Host "Avertissement : Impossible de télécharger automatiquement node.exe : $_" -ForegroundColor Yellow
}
