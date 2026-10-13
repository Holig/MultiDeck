@echo off
setlocal
echo ========================================================
echo  MultiDeck - Installation des composants Playwright
echo ========================================================

cd /d "%~dp0\.."

set "NODE_EXE=node.exe"
if exist "node\node.exe" (
    set "NODE_EXE=%CD%\node\node.exe"
)

set "CLI_JS=%CD%\server\node_modules\playwright\cli.js"
if not exist "%CLI_JS%" (
    if exist "node_modules\playwright\cli.js" (
        set "CLI_JS=%CD%\node_modules\playwright\cli.js"
    )
)

if exist "%CLI_JS%" (
    echo [MultiDeck] Installation des moteurs Playwright (Firefox et Chromium)...
    "%NODE_EXE%" "%CLI_JS%" install firefox chromium
) else (
    echo [ATTENTION] cli.js Playwright introuvable.
)

exit /b 0
