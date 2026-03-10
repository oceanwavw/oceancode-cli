@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: build_frontends.bat
:: Build Node.js frontends (oceanreact library and oceanwave_dash Electron app)
:: Uses npm for package management
:: =============================================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."

echo.
echo ========================================
echo  Building Node.js Frontends
echo ========================================
echo Root: %ROOT%
echo.

:: Check if node and npm are installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: node is not installed or not in PATH
    echo Please install Node.js: https://nodejs.org/
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install npm with Node.js
    exit /b 1
)

:: Step 1: Build oceanreact library (required by oceanwave_dash)
echo.
echo ----------------------------------------
echo Step 1: Building oceanreact Library
echo ----------------------------------------

pushd "%ROOT%\lib\front_ends\oceanreact"

echo Installing dependencies...
call npm install
if errorlevel 1 (
    popd
    goto :error_oceanreact_install
)

echo Building oceanreact library...
call npm run build
if errorlevel 1 (
    popd
    goto :error_oceanreact_build
)

echo Verifying dist folder exists...
if not exist "dist" (
    popd
    goto :error_oceanreact_dist
)

popd
echo oceanreact build complete!

:: Step 2: Build oceanwave_dash Electron app
echo.
echo ----------------------------------------
echo Step 2: Building oceanwave_dash Electron App
echo ----------------------------------------

pushd "%ROOT%\lib\front_ends\oceanwave_dash"

echo Installing root dependencies...
call npm install
if errorlevel 1 (
    popd
    goto :error_dash_install_root
)

echo Installing frontend dependencies...
call npm run install:frontend
if errorlevel 1 (
    popd
    goto :error_dash_install_frontend
)

echo Installing local oceanreact dependency...
call npm run install:oceanreact-local
if errorlevel 1 (
    popd
    goto :error_dash_install_oceanreact
)

echo Building frontend...
call npm run build:frontend
if errorlevel 1 (
    popd
    goto :error_dash_build_frontend
)

echo Verifying frontend dist folder exists...
if not exist "frontend\dist" (
    popd
    goto :error_dash_dist
)

popd
echo oceanwave_dash build complete!

echo.
echo ========================================
echo  All Frontends Built Successfully!
echo ========================================
echo.
exit /b 0

:: Error handlers
:error_oceanreact_install
echo ERROR: Failed to install oceanreact dependencies
exit /b 1

:error_oceanreact_build
echo ERROR: Failed to build oceanreact library
exit /b 1

:error_oceanreact_dist
echo ERROR: oceanreact dist folder not created
exit /b 1

:error_dash_install_root
echo ERROR: Failed to install oceanwave_dash root dependencies
exit /b 1

:error_dash_install_frontend
echo ERROR: Failed to install oceanwave_dash frontend dependencies
exit /b 1

:error_dash_install_oceanreact
echo ERROR: Failed to install local oceanreact dependency
exit /b 1

:error_dash_build_frontend
echo ERROR: Failed to build oceanwave_dash frontend
exit /b 1

:error_dash_dist
echo ERROR: oceanwave_dash frontend dist folder not created
exit /b 1
