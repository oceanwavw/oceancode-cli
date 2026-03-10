@echo off
REM Show status of main branch in all OceanWave v1 repositories

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Git Status - All Repositories (main branch)
echo ========================================
echo.

set "REPOS=lib\jsonldb lib\oceancap lib\oceandata lib\oceanquant lib\oceanseed lib\oceanshed lib\oceanutil lib\oceanfarm lib\back_ends\oceanseed_app lib\back_ends\oceanfarm_app lib\back_ends\oceanhub_app lib\front_ends\oceanwave_dash lib\front_ends\oceanreact lib\front_ends\oceandata_gui lib\front_ends\oceanpyqt lib\front_ends\oceanapp lib\cli\oceandata-cli lib\cli\oceanlab-cli hubs\data_configs hubs\signal_samples scripts"

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        cd /d "%~dp0..\%%r"

        REM Checkout main branch first
        git checkout main >nul 2>&1

        echo [%%r]
        git status --short
        echo.
    ) else (
        echo [%%r] - NOT A GIT REPO
        echo.
    )
)

cd /d "%~dp0"
pause
