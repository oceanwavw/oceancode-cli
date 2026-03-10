@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: build_backends.bat
:: Build Python backend using uv - creates ONE venv in oceanwave_dash
:: Uses uv to manage Python 3.12+ and package installation
:: =============================================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%..\.."
set "VENV_PATH=%ROOT%\lib\front_ends\oceanwave_dash\venv-windows"
set "PYTHON_BIN=%VENV_PATH%\Scripts\python.exe"
set "LIB_ROOT=%ROOT%\lib"
set "PYTHON_VERSION=3.12"

echo.
echo ========================================
echo  Building Python Backend (using uv)
echo ========================================
echo Root: %ROOT%
echo Venv: %VENV_PATH%
echo Python: %PYTHON_VERSION%
echo.

:: Check if uv is installed
where uv >nul 2>&1
if errorlevel 1 (
    echo ERROR: uv is not installed or not in PATH
    echo Install uv: https://docs.astral.sh/uv/getting-started/installation/
    exit /b 1
)

:: Step 1: Create virtual environment with Python 3.12
echo [1/4] Creating virtual environment with Python %PYTHON_VERSION%...

:: Remove existing venv if present
if exist "%VENV_PATH%" (
    echo Removing existing venv...
    rmdir /s /q "%VENV_PATH%"
)

:: Create new venv with uv using Python 3.12
uv venv "%VENV_PATH%" --python %PYTHON_VERSION%
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    echo Make sure Python %PYTHON_VERSION% is available. Run: uv python install %PYTHON_VERSION%
    exit /b 1
)

:: Verify Python executable exists
if not exist "%PYTHON_BIN%" (
    echo ERROR: Venv created but Python executable not found
    exit /b 1
)
echo Virtual environment created!

:: Check Python version in venv
echo.
for /f "tokens=2 delims= " %%v in ('"%PYTHON_BIN%" --version 2^>^&1') do echo Using Python %%v

:: Step 2: Install PyPI dependencies
echo.
echo [2/4] Installing PyPI dependencies...

set "PYPI_DEPS=loguru base36 scipy matplotlib plotly bokeh numba pandas numpy toml fastapi uvicorn pydantic httpx pytest pytest-asyncio requests pyyaml python-dateutil gitpython gita"

uv pip install --python "%PYTHON_BIN%" %PYPI_DEPS%
if errorlevel 1 (
    echo ERROR: Failed to install PyPI dependencies
    exit /b 1
)

:: Install pandas-ta
echo Installing pandas-ta...
uv pip install --python "%PYTHON_BIN%" pandas-ta==0.4.71b0 2>nul
if errorlevel 1 (
    echo Trying pandas-ta-classic instead...
    uv pip install --python "%PYTHON_BIN%" pandas-ta-classic
)

echo PyPI dependencies installed!

:: Step 3: Install local oceanwave packages in order
echo.
echo [3/4] Installing local packages...

echo   Installing jsonldb...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\jsonldb"
if errorlevel 1 goto :error_jsonldb

echo   Installing oceancap...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\oceancap"
if errorlevel 1 goto :error_oceancap

echo   Installing oceanutil...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\oceanutil"
if errorlevel 1 goto :error_oceanutil

echo   Installing oceandata...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\oceandata"
if errorlevel 1 goto :error_oceandata

echo   Installing oceanseed...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\oceanseed"
if errorlevel 1 goto :error_oceanseed

echo   Installing oceanquant...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\oceanquant"
if errorlevel 1 goto :error_oceanquant

:: Build and install oceanquant_rust extension
echo   Building oceanquant_rust (Rust extension)...

:: Check if Rust is available
where cargo >nul 2>&1
if errorlevel 1 (
    echo   Rust/Cargo not found, trying pre-built wheel...
    goto :try_wheel
)

:: Install maturin via uv (not pip, since uv venv doesn't include pip)
echo   Installing maturin...
uv pip install --python "%PYTHON_BIN%" maturin
if errorlevel 1 (
    echo   Failed to install maturin, trying pre-built wheel...
    goto :try_wheel
)

:: Run maturin develop directly (more reliable than build.py)
echo   Running maturin develop...
pushd "%LIB_ROOT%\oceanquant\oceanquant\rust"

:: Set VIRTUAL_ENV so maturin can find the venv
set "VIRTUAL_ENV=%VENV_PATH%"
"%VENV_PATH%\Scripts\maturin.exe" develop --release

if errorlevel 1 (
    popd
    echo   Maturin develop failed, trying pre-built wheel...
    goto :try_wheel
)
popd

:: Verify rust module installed
"%PYTHON_BIN%" -c "import oceanquant_rust" >nul 2>&1
if errorlevel 1 (
    echo   Rust module not found after build, trying pre-built wheel...
    goto :try_wheel
)
echo   oceanquant_rust built successfully!
goto :rust_done

:try_wheel
:: Try installing pre-built wheel as fallback
if exist "%LIB_ROOT%\oceanquant\oceanquant\rust\oceanquant_rust-0.1.0-cp38-abi3-win_amd64.whl" (
    echo   Installing pre-built wheel...
    uv pip install --python "%PYTHON_BIN%" "%LIB_ROOT%\oceanquant\oceanquant\rust\oceanquant_rust-0.1.0-cp38-abi3-win_amd64.whl"
    if errorlevel 1 (
        echo WARNING: Failed to install oceanquant_rust wheel
        echo The system may not work correctly without Rust acceleration
    ) else (
        echo   oceanquant_rust installed from pre-built wheel!
    )
) else (
    echo WARNING: No pre-built wheel found and build failed
    echo To build from source, install Rust: https://rustup.rs/
)

:rust_done

echo   Installing oceanfarm...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\oceanfarm"
if errorlevel 1 goto :error_oceanfarm

echo   Installing oceanseed_app[server]...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\back_ends\oceanseed_app[server]"
if errorlevel 1 goto :error_oceanseed_app

echo   Installing oceanfarm_app...
uv pip install --python "%PYTHON_BIN%" -e "%LIB_ROOT%\back_ends\oceanfarm_app"
if errorlevel 1 goto :error_oceanfarm_app

echo   Building oceanhub_app venv...
call "%LIB_ROOT%\back_ends\oceanhub_app\launch_scripts\win\build_venv.bat"
if errorlevel 1 goto :error_oceanhub_app

echo Local packages installed!

:: Step 5: Build oceandata_gui venv
echo.
echo ========================================
echo  Building OceanData GUI venv
echo ========================================
echo.

call "%LIB_ROOT%\front_ends\oceandata_gui\scripts\setup_env.bat"
if errorlevel 1 goto :error_oceandata_gui

:: Step 6: Verify installation
echo.
echo [6/6] Verifying installation...

set "PACKAGES=oceancap oceanutil oceandata oceanseed oceanquant oceanfarm oceanseed_app oceanfarm_app"
for %%p in (%PACKAGES%) do (
    "%PYTHON_BIN%" -c "import %%p" >nul 2>&1
    if errorlevel 1 (
        echo   [FAIL] %%p
    ) else (
        echo   [PASS] %%p
    )
)

echo.
echo ========================================
echo  Backend Build Complete!
echo ========================================
echo.
echo Python executable: %PYTHON_BIN%
echo.
echo Start the backend with:
echo   "%PYTHON_BIN%" -m oceanseed_app.cli --port 7007
echo.
exit /b 0

:: Error handlers
:error_jsonldb
echo ERROR: Failed to install jsonldb
exit /b 1

:error_oceancap
echo ERROR: Failed to install oceancap
exit /b 1

:error_oceanutil
echo ERROR: Failed to install oceanutil
exit /b 1

:error_oceandata
echo ERROR: Failed to install oceandata
exit /b 1

:error_oceanseed
echo ERROR: Failed to install oceanseed
exit /b 1

:error_oceanquant
echo ERROR: Failed to install oceanquant
exit /b 1

:error_oceanfarm
echo ERROR: Failed to install oceanfarm
exit /b 1

:error_oceanseed_app
echo ERROR: Failed to install oceanseed_app
exit /b 1

:error_oceanfarm_app
echo ERROR: Failed to install oceanfarm_app
exit /b 1

:error_oceanhub_app
echo ERROR: Failed to build oceanhub_app venv
exit /b 1

:error_oceandata_gui
echo ERROR: Failed to build oceandata_gui venv
exit /b 1
