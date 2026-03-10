@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: build_all.bat
:: Master build script - builds Python backend, Node.js frontends, and verifies
:: =============================================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."
set "VENV_PATH=%ROOT%\lib\front_ends\oceanwave_dash\venv-windows"
set "PYTHON_BIN=%VENV_PATH%\Scripts\python.exe"

echo.
echo ========================================
echo  OceanWave v1 - Full Build
echo ========================================
echo.

:: Record start time
set START_TIME=%TIME%

:: Pre-flight checks - auto-install missing tools via winget
echo ----------------------------------------
echo Pre-flight Checks
echo ----------------------------------------

where winget >nul 2>&1
if errorlevel 1 (
    echo ERROR: winget not found - required for auto-installing tools
    echo winget is built into Windows 10/11. Update via Microsoft Store if missing.
    goto :error
)

where uv >nul 2>&1
if errorlevel 1 (
    echo uv not found, installing...
    winget install --id astral-sh.uv -e --accept-source-agreements --accept-package-agreements
    call :refresh_path
    where uv >nul 2>&1 || (echo ERROR: uv install failed & goto :error)
    echo uv installed!
)

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js not found, installing...
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    call :refresh_path
    where node >nul 2>&1 || (echo ERROR: Node.js install failed & goto :error)
    echo Node.js installed!
)

where go >nul 2>&1
if errorlevel 1 (
    echo Go not found, installing...
    winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements
    call :refresh_path
    where go >nul 2>&1 || (echo ERROR: Go install failed & goto :error)
    echo Go installed!
)

where bun >nul 2>&1
if errorlevel 1 (
    echo Bun not found, installing...
    winget install --id Oven-sh.Bun -e --accept-source-agreements --accept-package-agreements
    call :refresh_path
    where bun >nul 2>&1 || (echo ERROR: Bun install failed & goto :error)
    echo Bun installed!
)

echo All pre-flight checks passed!
echo.

:: Step 1: Build Python backend
echo ========================================
echo Step 1/4: Building Python Backend
echo ========================================
echo.

call "%SCRIPT_DIR%build_backends.bat"
if errorlevel 1 (
    echo.
    echo ERROR: Backend build failed!
    goto :error
)

echo.

:: Step 2: Build Node.js frontends
echo ========================================
echo Step 2/4: Building Node.js Frontends
echo ========================================
echo.

call "%SCRIPT_DIR%build_frontends.bat"
if errorlevel 1 (
    echo.
    echo ERROR: Frontend build failed!
    goto :error
)

echo.

:: Step 3: Build CLI tools
echo ========================================
echo Step 3/4: Building CLI Tools
echo ========================================
echo.

call "%SCRIPT_DIR%build_cli.bat"
if errorlevel 1 (
    echo.
    echo ERROR: CLI build failed!
    goto :error
)

echo.

:: Step 4: Verify installation
echo ========================================
echo Step 4/4: Verifying Installation
echo ========================================
echo.

set "PASS=0"
set "FAIL=0"

:: Check Python venv (oceanwave_dash)
if exist "%VENV_PATH%" (
    echo [PASS] oceanwave_dash venv-windows exists
    set /a PASS+=1
) else (
    echo [FAIL] oceanwave_dash venv-windows missing
    set /a FAIL+=1
)

:: Check Python venv (oceandata_gui)
if exist "%ROOT%\lib\front_ends\oceandata_gui\venv-windows" (
    echo [PASS] oceandata_gui venv-windows exists
    set /a PASS+=1
) else (
    echo [FAIL] oceandata_gui venv-windows missing
    set /a FAIL+=1
)

:: Check Python packages
set "PACKAGES=jsonldb oceancap oceanutil oceandata oceanseed oceanquant oceanfarm oceanseed_app oceanfarm_app"
for %%p in (%PACKAGES%) do (
    "%PYTHON_BIN%" -c "import %%p" >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] %%p import failed
        set /a FAIL+=1
    ) else (
        echo [PASS] %%p
        set /a PASS+=1
    )
)

:: Check frontend builds
if exist "%ROOT%\lib\front_ends\oceanreact\dist" (
    echo [PASS] oceanreact dist exists
    set /a PASS+=1
) else (
    echo [FAIL] oceanreact dist missing
    set /a FAIL+=1
)

if exist "%ROOT%\lib\front_ends\oceanwave_dash\frontend\dist" (
    echo [PASS] oceanwave_dash frontend dist exists
    set /a PASS+=1
) else (
    echo [FAIL] oceanwave_dash frontend dist missing
    set /a FAIL+=1
)

if exist "%ROOT%\lib\front_ends\oceanwave_dash\node_modules" (
    echo [PASS] oceanwave_dash node_modules exists
    set /a PASS+=1
) else (
    echo [FAIL] oceanwave_dash node_modules missing
    set /a FAIL+=1
)

:: Check CLI binaries
if exist "%ROOT%\bin\win\oceandata.exe" (
    echo [PASS] oceandata.exe
    set /a PASS+=1
) else (
    echo [FAIL] oceandata.exe missing
    set /a FAIL+=1
)

if exist "%ROOT%\bin\win\oceanlab.exe" (
    echo [PASS] oceanlab.exe
    set /a PASS+=1
) else (
    echo [FAIL] oceanlab.exe missing
    set /a FAIL+=1
)

:: Note: Linux CLI binaries are built via build_cli.sh from WSL/Linux

echo.
echo Verification: %PASS% passed, %FAIL% failed

if %FAIL% gtr 0 (
    echo.
    echo WARNING: Some verification checks failed
)

:: Calculate elapsed time
set END_TIME=%TIME%

echo.
echo ========================================
echo  Build Completed!
echo ========================================
echo.
echo Start time: %START_TIME%
echo End time:   %END_TIME%
echo.
echo To start the application:
echo   cd %ROOT%\lib\front_ends\oceanwave_dash
echo   npm run dev
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo  Build FAILED
echo ========================================
echo.
pause
exit /b 1

:refresh_path
:: Reload PATH from registry so newly installed tools are found
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%b"
set "PATH=%SYS_PATH%;%USR_PATH%"
exit /b 0
