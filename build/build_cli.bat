@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: build_cli.bat
:: Build CLI tools for Windows: oceandata-cli (Go) and oceanlab-cli (Bun)
:: Outputs binaries to /oceanwave/bin/win/
:: =============================================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."
set "LIB_ROOT=%ROOT%\lib"
set "BIN_DIR=%ROOT%\bin\win"

echo.
echo ========================================
echo  Building CLI Tools (Windows)
echo ========================================
echo.

:: Pre-flight checks - auto-install missing tools via winget
where go >nul 2>&1
if errorlevel 1 (
    echo Go not found, installing...
    winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements
    call :refresh_path
    where go >nul 2>&1 || (echo ERROR: Go install failed & exit /b 1)
    echo Go installed!
)

where bun >nul 2>&1
if errorlevel 1 (
    echo Bun not found, installing...
    winget install --id Oven-sh.Bun -e --accept-source-agreements --accept-package-agreements
    call :refresh_path
    where bun >nul 2>&1 || (echo ERROR: Bun install failed & exit /b 1)
    echo Bun installed!
)

:: Ensure output directory exists
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

:: Step 1: Build oceandata-cli (Go)
echo ----------------------------------------
echo Step 1/2: Building oceandata-cli (Go)
echo ----------------------------------------
echo.

pushd "%LIB_ROOT%\cli\oceandata-cli"

echo Downloading dependencies...
go mod download
if errorlevel 1 (
    popd
    echo ERROR: Failed to download Go dependencies
    exit /b 1
)

echo Building for Windows...
set GOOS=windows
set GOARCH=amd64
go build -o "%BIN_DIR%\oceandata.exe" .
if errorlevel 1 (
    popd
    echo ERROR: Failed to build oceandata-cli
    exit /b 1
)

popd
echo oceandata-cli built!
echo.

:: Step 2: Build oceanlab-cli (Bun/TypeScript)
echo ----------------------------------------
echo Step 2/2: Building oceanlab-cli (Bun)
echo ----------------------------------------
echo.

pushd "%LIB_ROOT%\cli\oceanlab-cli"

echo Installing dependencies...
call bun install
if errorlevel 1 (
    popd
    echo ERROR: Failed to install oceanlab-cli dependencies
    exit /b 1
)

echo Building for Windows...
call bun build src/cli.ts --compile --target=bun-windows-x64 --outfile dist/oceanlab.exe
if errorlevel 1 (
    popd
    echo ERROR: Failed to build oceanlab-cli
    exit /b 1
)

echo Copying to bin...
copy /y "dist\oceanlab.exe" "%BIN_DIR%\oceanlab.exe" >nul

popd
echo oceanlab-cli built!

:: Verify outputs
echo.
echo ========================================
echo  Verifying CLI Builds (Windows)
echo ========================================
echo.

set "PASS=0"
set "FAIL=0"

if exist "%BIN_DIR%\oceandata.exe" (
    echo [PASS] oceandata.exe
    set /a PASS+=1
) else (
    echo [FAIL] oceandata.exe missing
    set /a FAIL+=1
)

if exist "%BIN_DIR%\oceanlab.exe" (
    echo [PASS] oceanlab.exe
    set /a PASS+=1
) else (
    echo [FAIL] oceanlab.exe missing
    set /a FAIL+=1
)

echo.
echo Verification: %PASS% passed, %FAIL% failed

if %FAIL% gtr 0 (
    echo.
    echo WARNING: Some builds failed
    exit /b 1
)

echo.
echo ========================================
echo  CLI Tools Built Successfully!
echo ========================================
echo.
exit /b 0

:refresh_path
:: Reload PATH from registry so newly installed tools are found
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USR_PATH=%%b"
set "PATH=%SYS_PATH%;%USR_PATH%"
exit /b 0
