@echo off
setlocal

echo ===================================================================
echo  MultiDeck — Generation du fichier Tout-en-Un (MultiDeck-Setup.exe)
echo ===================================================================

echo [1/4] Compilation complete du projet (Client + Serveur + Lanceur)...
call npm run build:all
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec lors du build:all
    exit /b %ERRORLEVEL%
)

echo [2/4] Verification du binaire autonome Node.js...
if not exist "node\node.exe" (
    powershell -ExecutionPolicy Bypass -File launcher\download-node.ps1
)

echo [3/4] Recherche du compilateur Inno Setup (ISCC.exe)...
set "ISCC="

where iscc >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "ISCC=iscc"
)

if "%ISCC%"=="" if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
)

if "%ISCC%"=="" if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
)

if "%ISCC%"=="" if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" (
    set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
)

if "%ISCC%"=="" (
    echo.
    echo -------------------------------------------------------------------
    echo [ATTENTION] Inno Setup 6 n'est pas encore installe sur votre PC.
    echo.
    echo Pour generer le fichier tout-en-un "MultiDeck-Setup.exe" :
    echo 1. Telechargez Inno Setup 6 gratuitement sur : https://jrsoftware.org/isdl.php
    echo 2. Installez-le en 30 secondes.
    echo 3. Relancez ce script : npm run build:installer
    echo -------------------------------------------------------------------
    echo.
    exit /b 1
)

echo [4/4] Generation du Setup avec Inno Setup...
"%ISCC%" MultiDeck-Setup.iss

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================================
    echo  [SUCCES TOTAL] Fichier tout-en-un genere avec succes !
    echo  Emplacement : installer_output\MultiDeck-Setup.exe
    echo ===================================================================
    echo.
) else (
    echo [ERREUR] Echec lors de la generation du setup Inno Setup.
    exit /b %ERRORLEVEL%
)
