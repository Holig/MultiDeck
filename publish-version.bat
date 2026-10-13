@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ===================================================================
echo   MultiDeck - Publication Automatique de Version (GitHub Actions)
echo ===================================================================
echo.

set "TAG=%~1"
if "%TAG%"=="" (
    echo Derniers tags existants :
    git tag --sort=-v:refname 2>nul
    echo.
    set /p "TAG=Entrez le nouveau tag de version (ex: v1.1.0) : "
)

if "%TAG%"=="" (
    echo [ERREUR] Aucun tag specifie. Operation annulee.
    pause
    exit /b 1
)

set "MSG=%~2"
if "%MSG%"=="" (
    set /p "MSG=Entrez le message de commit [defaut: Corrections et ameliorations] : "
)

if "%MSG%"=="" (
    set "MSG=Corrections et ameliorations"
)

echo.
echo -------------------------------------------------------------------
echo  Tag de version     : %TAG%
echo  Message de commit  : %MSG%
echo -------------------------------------------------------------------
echo.

echo [1/4] Ajout des fichiers modifies (git add .)...
git add .

echo [2/4] Creation du commit (git commit)...
git commit -m "%MSG%" 2>nul

echo [3/4] Creation du tag local (%TAG%)...
git tag %TAG% 2>nul

echo [4/4] Envoi vers GitHub avec les tags (git push origin main --tags)...
git push origin main --tags
if errorlevel 1 (
    echo [ERREUR] Echec lors du git push.
    pause
    exit /b 1
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
