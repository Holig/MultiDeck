@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo   MultiDeck - Publication Automatique de Version (GitHub Actions)
echo ===================================================================
echo.

:: 1. Gestion du tag de version
set "TAG=%~1"
if "%TAG%"=="" (
    echo Derniers tags existants :
    git tag --sort=-v:refname | head -n 3 2>nul || git tag
    echo.
    set /p "TAG=Entrez le nouveau tag de version (ex: v1.0.1) : "
)

if "%TAG%"=="" (
    echo [ERREUR] Aucun tag specifie. Operation annulee.
    pause
    exit /b 1
)

:: 2. Gestion du message de commit
set "MSG=%~2"
if "%MSG%"=="" (
    set /p "MSG=Entrez le message de commit [defaut: Correction et améliorations] : "
)

if "%MSG%"=="" (
    set "MSG=Correction et améliorations"
)

echo.
echo -------------------------------------------------------------------
echo  Tag de version     : %TAG%
echo  Message de commit  : %MSG%
echo -------------------------------------------------------------------
echo.

:: 3. Execution des commandes Git
echo [1/4] Ajout des fichiers modifies (git add .)...
git add .
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec lors de git add.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/4] Creation du commit (git commit)...
git commit -m "%MSG%"
:: Note: si aucun fichier n'a change, git commit peut retourner 1, on continue

echo [3/4] Creation du tag local (%TAG%)...
git tag %TAG%
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec lors de la creation du tag %TAG% (le tag existe peut-etre deja).
    pause
    exit /b %ERRORLEVEL%
)

echo [4/4] Envoi vers GitHub avec les tags (git push origin main --tags)...
git push origin main --tags
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec lors du git push.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================================
echo   SUCCES TOTAL ! La version %TAG% a ete envoyee sur GitHub !
echo ===================================================================
echo.
echo GitHub Actions compile actuellement votre installateur dans le cloud.
echo.
echo Suivre la compilation : https://github.com/Holig/MultiDeck/actions
echo Voir la release prete  : https://github.com/Holig/MultiDeck/releases/tag/%TAG%
echo.
echo Le lien de telechargement direct pour vos utilisateurs :
echo https://github.com/Holig/MultiDeck/releases/latest/download/MultiDeck-Setup.exe
echo ===================================================================
echo.
pause
