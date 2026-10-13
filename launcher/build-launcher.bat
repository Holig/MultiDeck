@echo off
setlocal

echo ========================================================
echo  MultiDeck - Compilation du lanceur autonome (System Tray)
echo ========================================================

set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" (
    set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if not exist "%CSC%" (
    echo [ERREUR] Compilateur C# csc.exe introuvable.
    exit /b 1
)

if not exist "assets\icon.ico" (
    powershell -ExecutionPolicy Bypass -File launcher\generate-icon.ps1
)

echo Compilation de MultiDeck.exe avec "%CSC%"...
"%CSC%" /nologo /target:winexe /win32icon:assets\icon.ico /out:MultiDeck.exe /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll /reference:System.Net.Http.dll launcher\MultiDeckLauncher.cs launcher\AssemblyInfo.cs

if %ERRORLEVEL% EQU 0 (
    echo [SUCCES] MultiDeck.exe genere avec succes a la racine du projet !
) else (
    echo [ECHEC] Erreur lors de la compilation du lanceur.
    exit /b %ERRORLEVEL%
)

