@echo off
REM Commit all changes on main branch in all OceanWave v1 repositories
REM Usage: git_commit_all.bat "Your commit message"

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Git Status - All Repositories (main branch)
echo ========================================
echo.

set "REPOS=lib\jsonldb lib\oceancap lib\oceandata lib\oceanquant lib\oceanseed lib\oceanshed lib\oceanutil lib\oceanfarm lib\back_ends\oceanseed_app lib\back_ends\oceanfarm_app lib\back_ends\oceanhub_app lib\front_ends\oceanwave_dash lib\front_ends\oceanreact lib\front_ends\oceandata_gui lib\front_ends\oceanpyqt lib\front_ends\oceanapp lib\cli\oceandata-cli lib\cli\oceanlab-cli hubs\data_configs hubs\signal_samples scripts"

REM Show status for all repos
for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        cd /d "%~dp0..\%%r"

        REM Checkout main branch first
        git checkout main >nul 2>&1

        REM Check if there are any changes
        git status --short 2>nul | findstr /r "." >nul
        if !ERRORLEVEL! EQU 0 (
            echo [%%r] - HAS CHANGES
            git status --short
            echo.
        )
    )
)

echo.
echo ========================================
echo.

REM Check if commit message was provided as argument
if not "%~1"=="" (
    set "COMMIT_MSG=%~1"
) else (
    REM Prompt for commit message
    set /p "COMMIT_MSG=Enter commit message: "
)

REM Validate commit message was provided
if "%COMMIT_MSG%"=="" (
    echo ERROR: No commit message provided
    pause
    exit /b 1
)

echo.
echo ========================================
echo Adding and Committing All Repositories (main branch)
echo ========================================
echo.
echo Commit message: %COMMIT_MSG%
echo.

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        echo.
        echo ======================================
        echo Processing %%r
        echo ======================================

        cd /d "%~dp0..\%%r"

        REM Checkout main branch first
        git checkout main >nul 2>&1

        REM Add all files
        git add -A

        REM Try to commit (will fail if nothing to commit, which is fine)
        git commit -m "%COMMIT_MSG%"

        if !ERRORLEVEL! EQU 0 (
            echo SUCCESS: Committed changes in %%r
        ) else (
            echo INFO: No changes to commit in %%r
        )
    )
)

echo.
echo ========================================
echo Commit Complete!
echo ========================================
echo.
echo Summary of all repositories:
echo.

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        cd /d "%~dp0..\%%r"
        echo [%%r]
        git log -1 --oneline 2>nul || echo "  No commits yet"
        echo.
    )
)

cd /d "%~dp0"
pause
