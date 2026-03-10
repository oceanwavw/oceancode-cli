@echo off
REM Push main branch of all OceanWave v1 repositories to specified remote
REM Usage: git_push_all.bat [remote_name]

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Push All OceanWave v1 Repositories
echo ========================================
echo.

REM Check if remote name was provided as argument
if not "%~1"=="" (
    set "REMOTE=%~1"
) else (
    REM Prompt for remote name
    set /p "REMOTE=Enter remote name to push to (e.g., origin): "
)

REM Validate remote name was provided
if "%REMOTE%"=="" (
    echo ERROR: No remote name provided
    pause
    exit /b 1
)

echo.
echo Using remote: %REMOTE%
echo Branch: main
echo.

set "REPOS=lib\jsonldb lib\oceancap lib\oceandata lib\oceanquant lib\oceanseed lib\oceanshed lib\oceanutil lib\oceanfarm lib\back_ends\oceanseed_app lib\back_ends\oceanfarm_app lib\back_ends\oceanhub_app lib\front_ends\oceanwave_dash lib\front_ends\oceanreact lib\front_ends\oceandata_gui lib\front_ends\oceanpyqt lib\front_ends\oceanapp lib\cli\oceandata-cli lib\cli\oceanlab-cli hubs\data_configs hubs\signal_samples scripts"

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        echo.
        echo ======================================
        echo Pushing %%r to %REMOTE%/main
        echo ======================================

        cd /d "%~dp0..\%%r"

        REM Check if remote exists
        git remote get-url %REMOTE% >nul 2>&1
        if !ERRORLEVEL! NEQ 0 (
            echo WARNING: Remote '%REMOTE%' not found in %%r. Skipping...
        ) else (
            REM Checkout main branch and push to specified remote
            git checkout main >nul 2>&1
            git push %REMOTE% main
            if !ERRORLEVEL! EQU 0 (
                echo SUCCESS: Pushed %%r to %REMOTE%/main
            ) else (
                echo ERROR: Failed to push %%r to %REMOTE%/main
            )
        )
    ) else (
        echo WARNING: %%r is not a git repo. Skipping...
    )
)

echo.
echo ========================================
echo Push Complete!
echo ========================================
echo.

cd /d "%~dp0"
pause
