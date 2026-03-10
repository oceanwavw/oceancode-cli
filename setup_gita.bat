@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM Setup gita to manage all OceanWave git repositories
REM ============================================================

set "ROOT=%~dp0.."
set "VENV_PATH=%~dp0.venv"

echo.
echo ========================================
echo Gita Setup for OceanWave Repositories
echo ========================================
echo.

REM Check if uv is available
where uv >nul 2>&1
if errorlevel 1 (
    echo ERROR: uv is not installed or not in PATH
    echo Install uv: https://docs.astral.sh/uv/getting-started/installation/
    pause
    exit /b 1
)

REM Create venv if it doesn't exist
if not exist "%VENV_PATH%\Scripts\activate.bat" (
    echo Creating scripts venv...
    uv venv "%VENV_PATH%" --python 3.12
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Install gita if not present
if not exist "%VENV_PATH%\Scripts\gita.exe" (
    echo Installing gita...
    uv pip install --python "%VENV_PATH%\Scripts\python.exe" gita
    if errorlevel 1 (
        echo ERROR: Failed to install gita
        pause
        exit /b 1
    )
)

REM Activate virtual environment
call "%VENV_PATH%\Scripts\activate.bat"

REM Clear existing gita repos (if any)
echo.
echo [1/2] Clearing existing gita configuration...
gita rm oceancap oceandata oceanquant oceanseed oceanshed oceanutil jsonldb oceanfarm oceanseed_app oceanfarm_app oceanhub_app oceanwave_dash oceanreact oceandata_gui oceanpyqt oceanapp oceandata-cli oceanlab-cli data_configs signal_samples scripts 2>nul
echo.

REM Register all repositories
echo [2/2] Registering all git repositories with gita...
cd /d "%ROOT%"

REM Core libraries
gita add -a lib\oceancap
gita add -a lib\oceandata
gita add -a lib\oceanquant
gita add -a lib\oceanseed
gita add -a lib\oceanshed
gita add -a lib\oceanutil
gita add -a lib\jsonldb
gita add -a lib\oceanfarm

REM Back-ends
gita add -a lib\back_ends\oceanseed_app
gita add -a lib\back_ends\oceanfarm_app
gita add -a lib\back_ends\oceanhub_app

REM Front-ends
gita add -a lib\front_ends\oceanwave_dash
gita add -a lib\front_ends\oceanreact
gita add -a lib\front_ends\oceandata_gui
gita add -a lib\front_ends\oceanpyqt
gita add -a lib\front_ends\oceanapp

REM CLI tools
gita add -a lib\cli\oceandata-cli
gita add -a lib\cli\oceanlab-cli

REM Hubs
gita add -a hubs\data_configs
gita add -a hubs\signal_samples

REM Scripts
gita add -a scripts

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Registered repositories:
gita ll
echo.
echo You can now use:
echo   - gita pull     : Pull all repos
echo   - gita push     : Push all repos
echo   - gita st       : Show status of all repos
echo   - gita fetch    : Fetch all repos
echo   - gita ll       : List all repos with branch info
echo.
echo Or use the wrapper scripts:
echo   - git_pull_all.bat
echo   - git_push_all.bat
echo   - git_status_all.bat
echo   - git_fetch_all.bat
echo.
pause
