@echo off
REM Force push main branch of all OceanWave v1 repositories to specified remote
REM Usage: git_force_push_all.bat [remote_name]

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Force Push All OceanWave v1 Repositories
echo ========================================
echo.
echo WARNING: This will FORCE PUSH and overwrite remote history!
echo.

REM Check if remote name was provided as argument
if not "%~1"=="" (
    set "REMOTE=%~1"
) else (
    set /p "REMOTE=Enter remote name to force push to (e.g., origin): "
)

REM Validate remote name was provided
if "%REMOTE%"=="" (
    echo ERROR: No remote name provided
    pause
    exit /b 1
)

echo.
echo Remote: %REMOTE%
echo Branch: main
echo.
pause

set "REPOS=lib\jsonldb lib\oceancap lib\oceandata lib\oceanquant lib\oceanseed lib\oceanshed lib\oceanutil lib\oceanfarm lib\back_ends\oceanseed_app lib\back_ends\oceanfarm_app lib\back_ends\oceanhub_app lib\front_ends\oceanwave_dash lib\front_ends\oceanreact lib\front_ends\oceandata_gui lib\front_ends\oceanpyqt lib\front_ends\oceanapp lib\cli\oceandata-cli lib\cli\oceanlab-cli hubs\data_configs hubs\signal_samples scripts"

set "PASS=0"
set "FAIL=0"
set "SKIP=0"

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        echo.
        echo ======================================
        echo %%r
        echo ======================================

        cd /d "%~dp0..\%%r"

        REM Check if remote exists
        git remote get-url %REMOTE% >nul 2>&1
        if !ERRORLEVEL! NEQ 0 (
            echo WARNING: Remote '%REMOTE%' not found. Skipping...
            set /a SKIP+=1
        ) else (
            git checkout main >nul 2>&1
            git push --force %REMOTE% main
            if !ERRORLEVEL! EQU 0 (
                echo SUCCESS: Force pushed to %REMOTE%/main
                set /a PASS+=1
            ) else (
                echo ERROR: Failed to force push
                set /a FAIL+=1
            )
        )
    ) else (
        echo SKIP: %%r is not a git repo.
        set /a SKIP+=1
    )
)

echo.
echo ========================================
echo Force Push Complete!
echo ========================================
echo.
echo Results: %PASS% pushed, %FAIL% failed, %SKIP% skipped
echo.

cd /d "%~dp0"
pause
