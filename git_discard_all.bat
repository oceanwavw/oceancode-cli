@echo off
REM Discard all changes on main branch in all OceanWave v1 repositories
REM WARNING: This will permanently discard all uncommitted changes!

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Discard All Changes - OceanWave v1
echo ========================================
echo.
echo WARNING: This will permanently discard all uncommitted changes on main branch!
echo.

set /p "CONFIRM=Are you sure? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

set "REPOS=lib\jsonldb lib\oceancap lib\oceandata lib\oceanquant lib\oceanseed lib\oceanshed lib\oceanutil lib\oceanfarm lib\back_ends\oceanseed_app lib\back_ends\oceanfarm_app lib\back_ends\oceanhub_app lib\front_ends\oceanwave_dash lib\front_ends\oceanreact lib\front_ends\oceandata_gui lib\front_ends\oceanpyqt lib\front_ends\oceanapp lib\cli\oceandata-cli lib\cli\oceanlab-cli hubs\data_configs hubs\signal_samples scripts"

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        echo.
        echo ======================================
        echo Discarding changes in %%r
        echo ======================================

        cd /d "%~dp0..\%%r"

        REM Checkout main branch first
        git checkout main >nul 2>&1

        REM Reset staged changes
        git reset HEAD .

        REM Discard all changes
        git checkout -- .

        REM Remove untracked files (optional - commented out for safety)
        REM git clean -fd

        echo Done.
    ) else (
        echo WARNING: %%r is not a git repo. Skipping...
    )
)

echo.
echo ========================================
echo Discard Complete!
echo ========================================
echo.

cd /d "%~dp0"
pause
