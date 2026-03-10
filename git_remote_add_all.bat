@echo off
REM Add a remote to all OceanWave v1 repositories
REM Usage: git_remote_add_all.bat [remote_name] [base_url]

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Add Remote to All OceanWave v1 Repositories
echo ========================================
echo.

REM Check if remote name was provided as argument
if not "%~1"=="" (
    set "REMOTE_NAME=%~1"
) else (
    REM Prompt for remote name
    set /p "REMOTE_NAME=Enter remote name (e.g., origin, upstream): "
)

REM Validate remote name was provided
if "%REMOTE_NAME%"=="" (
    echo ERROR: No remote name provided
    pause
    exit /b 1
)

REM Check if base URL was provided as argument
if not "%~2"=="" (
    set "BASE_URL=%~2"
) else (
    REM Prompt for base URL
    set /p "BASE_URL=Enter base URL (e.g., https://github.com/oceanwave): "
)

REM Validate base URL was provided
if "%BASE_URL%"=="" (
    echo ERROR: No base URL provided
    pause
    exit /b 1
)

REM Remove trailing slash if present
if "%BASE_URL:~-1%"=="/" set "BASE_URL=%BASE_URL:~0,-1%"

echo.
echo Remote name: %REMOTE_NAME%
echo Base URL: %BASE_URL%
echo.
pause

set "REPOS=lib\jsonldb lib\oceancap lib\oceandata lib\oceanquant lib\oceanseed lib\oceanshed lib\oceanutil lib\oceanfarm lib\back_ends\oceanseed_app lib\back_ends\oceanfarm_app lib\back_ends\oceanhub_app lib\front_ends\oceanwave_dash lib\front_ends\oceanreact lib\front_ends\oceandata_gui lib\front_ends\oceanpyqt lib\front_ends\oceanapp lib\cli\oceandata-cli lib\cli\oceanlab-cli hubs\data_configs hubs\signal_samples scripts"

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        echo.
        echo ======================================
        echo Adding remote to %%r
        echo ======================================

        cd /d "%~dp0..\%%r"

        REM Extract repo name from path (get last component)
        for %%f in ("%%r") do set "REPO_NAME=%%~nxf"

        REM Check if remote already exists
        git remote get-url %REMOTE_NAME% >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo WARNING: Remote '%REMOTE_NAME%' already exists in %%r
            echo Current URL:
            git remote get-url %REMOTE_NAME%
            echo Skipping...
        ) else (
            REM Add the remote
            git remote add %REMOTE_NAME% "%BASE_URL%/!REPO_NAME!.git"
            if !ERRORLEVEL! EQU 0 (
                echo SUCCESS: Added remote '%REMOTE_NAME%' to %%r
                echo URL: %BASE_URL%/!REPO_NAME!.git
            ) else (
                echo ERROR: Failed to add remote '%REMOTE_NAME%' to %%r
            )
        )
    ) else (
        echo WARNING: %%r is not a git repo. Skipping...
    )
)

echo.
echo ========================================
echo Remote Add Complete!
echo ========================================
echo.
echo Summary of remotes:
echo.

for %%r in (%REPOS%) do (
    if exist "%~dp0..\%%r\.git" (
        cd /d "%~dp0..\%%r"
        echo [%%r]
        git remote -v 2>nul
        echo.
    )
)

cd /d "%~dp0"
pause
