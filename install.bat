@echo off
REM Clone all OceanWave v1 repositories (except scripts, which is cloned by setup.bat)
REM Usage: install.bat [base_url]

setlocal enabledelayedexpansion

set "ROOT=%~dp0.."

echo.
echo ========================================
echo OceanWave v1 Install - Clone All Repos
echo ========================================
echo.

REM Check if base URL was provided as argument
if not "%~1"=="" (
    set "BASE_URL=%~1"
) else (
    set /p "BASE_URL=Enter your GitHub base URL (e.g., http://10.88.90.147:3000/oceanwave): "
)

REM Validate base URL was provided
if "%BASE_URL%"=="" (
    echo ERROR: No base URL provided
    pause
    exit /b 1
)

REM Remove trailing slash if present
if "%BASE_URL:~-1%"=="/" set "BASE_URL=%BASE_URL:~0,-1%"

echo Using base URL: %BASE_URL%
echo.
pause

REM Create directories if they don't exist
if not exist "%ROOT%\lib" mkdir "%ROOT%\lib"
if not exist "%ROOT%\lib\front_ends" mkdir "%ROOT%\lib\front_ends"
if not exist "%ROOT%\lib\back_ends" mkdir "%ROOT%\lib\back_ends"
if not exist "%ROOT%\lib\cli" mkdir "%ROOT%\lib\cli"
if not exist "%ROOT%\hubs" mkdir "%ROOT%\hubs"

REM Initialize counters and tracking lists
set "CLONED=0"
set "SKIPPED=0"
set "FAILED=0"
set "SKIPPED_LIST="
set "FAILED_LIST="

echo.
echo ========================================
echo Cloning Repositories
echo ========================================
echo.

REM Clone configs repo
call :clone_repo configs "%ROOT%\configs" configs

REM Clone core library repos
for %%r in (oceancap oceandata oceanquant oceanseed oceanshed oceanutil oceanfarm jsonldb) do (
    call :clone_repo %%r "%ROOT%\lib\%%r" lib\%%r
)

REM Clone backend repos
for %%r in (oceanseed_app oceanfarm_app oceanhub_app) do (
    call :clone_repo %%r "%ROOT%\lib\back_ends\%%r" lib\back_ends\%%r
)

REM Clone frontend repos
for %%r in (oceanwave_dash oceanreact) do (
    call :clone_repo %%r "%ROOT%\lib\front_ends\%%r" lib\front_ends\%%r
)

REM Clone legacy frontend repos
for %%r in (oceandata_gui oceanpyqt oceanapp) do (
    call :clone_repo %%r "%ROOT%\lib\front_ends\%%r" lib\front_ends\%%r
)

REM Clone CLI tool repos
for %%r in (oceandata-cli oceanlab-cli) do (
    call :clone_repo %%r "%ROOT%\lib\cli\%%r" lib\cli\%%r
)

REM Clone hub repos
for %%r in (data_configs signal_samples) do (
    call :clone_repo %%r "%ROOT%\hubs\%%r" hubs\%%r
)

REM Create hub_config.toml from example if it doesn't exist
if not exist "%~dp0configs\hub_config.toml" (
    if exist "%~dp0configs\hub_config.example.toml" (
        echo.
        echo Creating configs\hub_config.toml from example...

        REM Resolve ROOT to an absolute path and replace forward slashes
        pushd "%ROOT%"
        set "ABS_ROOT=!CD!"
        popd
        set "ABS_ROOT=!ABS_ROOT:\=/!"

        REM Copy and replace <YOUR_PATH> with the resolved root path
        powershell -Command "(Get-Content '%~dp0configs\hub_config.example.toml') -replace '<YOUR_PATH>', '!ABS_ROOT!' | Set-Content '%~dp0configs\hub_config.toml'"
        echo Created configs\hub_config.toml with root: !ABS_ROOT!
    ) else (
        echo WARNING: configs\hub_config.example.toml not found, skipping config creation.
    )
) else (
    echo configs\hub_config.toml already exists. Skipping...
)

echo.
echo ========================================
echo Install Complete!
echo ========================================
echo.
echo Summary: %CLONED% cloned, %SKIPPED% skipped, %FAILED% failed
echo.

REM Print summary for configs
call :print_status configs configs "%ROOT%\configs"

REM Print summary for core libs
for %%r in (oceancap oceandata oceanquant oceanseed oceanshed oceanutil oceanfarm jsonldb) do (
    call :print_status %%r lib\%%r "%ROOT%\lib\%%r"
)

REM Print summary for backends
for %%r in (oceanseed_app oceanfarm_app oceanhub_app) do (
    call :print_status %%r lib\back_ends\%%r "%ROOT%\lib\back_ends\%%r"
)

REM Print summary for frontends
for %%r in (oceanwave_dash oceanreact) do (
    call :print_status %%r lib\front_ends\%%r "%ROOT%\lib\front_ends\%%r"
)

REM Print summary for legacy frontends
for %%r in (oceandata_gui oceanpyqt oceanapp) do (
    call :print_status %%r lib\front_ends\%%r "%ROOT%\lib\front_ends\%%r"
)

REM Print summary for CLI tools
for %%r in (oceandata-cli oceanlab-cli) do (
    call :print_status %%r lib\cli\%%r "%ROOT%\lib\cli\%%r"
)

REM Print summary for hubs
for %%r in (data_configs signal_samples) do (
    call :print_status %%r hubs\%%r "%ROOT%\hubs\%%r"
)

echo.
echo Next steps:
echo 1. Run build_all.bat to build backends and frontends
echo 2. Run setup_gita.bat to register repos with gita
echo.
pause
exit /b 0

:: ============================================
:: Subroutine: clone a single repo
:: Usage: call :clone_repo <repo_name> <target_path> <display_name>
:: ============================================
:clone_repo
set "REPO_NAME=%~1"
set "TARGET_PATH=%~2"
set "DISPLAY_NAME=%~3"

echo.
echo ======================================
echo Cloning %REPO_NAME% to %DISPLAY_NAME%
echo ======================================

if exist "%TARGET_PATH%" (
    echo Directory already exists. Skipping...
    set /a SKIPPED+=1
    set "SKIPPED_LIST=!SKIPPED_LIST! %REPO_NAME%"
) else (
    git clone "%BASE_URL%/%REPO_NAME%.git" "%TARGET_PATH%"
    if !ERRORLEVEL! EQU 0 (
        echo SUCCESS: Cloned %REPO_NAME%
        set /a CLONED+=1
    ) else (
        echo ERROR: Failed to clone %REPO_NAME%
        set /a FAILED+=1
        set "FAILED_LIST=!FAILED_LIST! %REPO_NAME%"
    )
)
exit /b 0

:: ============================================
:: Subroutine: print status for a single repo
:: Usage: call :print_status <repo_name> <display_name> <target_path>
:: ============================================
:print_status
set "PS_REPO=%~1"
set "PS_DISPLAY=%~2"
set "PS_PATH=%~3"

echo !SKIPPED_LIST! | findstr /i /c:" %PS_REPO%" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    if exist "%PS_PATH%\.git" (
        echo [SKIPPED] %PS_DISPLAY%
    ) else (
        echo [SKIPPED - no .git] %PS_DISPLAY%
    )
    exit /b 0
)

echo !FAILED_LIST! | findstr /i /c:" %PS_REPO%" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo [FAILED] %PS_DISPLAY%
    exit /b 0
)

echo [CLONED] %PS_DISPLAY%
exit /b 0
