@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: sync_to_prod.bat
:: Selectively sync ONLY essential source files from dev to prod
:: Copies only: source folders + pyproject.toml/setup.py (no tests, examples, docs, etc.)
::
:: Configuration: Set SOURCE and TARGET below before running
::
:: Libraries synced:
::   Core: jsonldb, oceancap, oceandata, oceanfarm, oceanquant, oceanseed, oceanutil, oceanshed
::   Back-ends: oceanseed_app, oceanfarm_app, oceanhub_app
::   Front-ends: oceanwave_dash, oceanreact, oceandata_gui, oceanpyqt, oceanapp
::   CLI: oceandata-cli, oceanlab-cli
::   Hubs: data_configs, signal_samples
::   Scripts folder (excluding configs/hub_config.toml and sync_to_prod.bat)
:: =============================================================================

:: ============================================
:: CONFIGURATION - Edit these paths as needed
:: ============================================
set "SOURCE=H:\oceanwave"
set "TARGET=H:\oceanwave_app\oceanwave_v1.0"

:: ============================================
:: End of configuration
:: ============================================

echo.
echo ========================================
echo  Syncing Source Files: Dev to Prod
echo ========================================
echo Source: %SOURCE%
echo Target: %TARGET%
echo.

:: Validate source exists
if not exist "%SOURCE%" (
    echo ERROR: Source directory does not exist: %SOURCE%
    exit /b 1
)

:: Create target directory if it doesn't exist
if not exist "%TARGET%" (
    echo Creating target directory...
    mkdir "%TARGET%"
)

:: Common excludes for source folders
set "EXCLUDE_DIRS=/XD __pycache__ .git node_modules dist .claude .specdev .pytest_cache .venv .ruff_cache .serena .vscode .apidoc .journal .obsidian"
set "EXCLUDE_FILES=/XF *.pyc .DS_Store"

:: Robocopy flags: /E=recursive, /NFL=no file list, /NDL=no dir list, /NJH=no header, /NJS=no summary
set "ROBO_FLAGS=/E %EXCLUDE_DIRS% %EXCLUDE_FILES% /NFL /NDL /NJH /NJS /nc /ns /np"

:: ============================================
:: Back-ends (3)
:: ============================================
echo [1/21] Syncing lib/back_ends/oceanseed_app...
if not exist "%TARGET%\lib\back_ends\oceanseed_app" mkdir "%TARGET%\lib\back_ends\oceanseed_app"
robocopy "%SOURCE%\lib\back_ends\oceanseed_app\oceanseed_app" "%TARGET%\lib\back_ends\oceanseed_app\oceanseed_app" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\back_ends\oceanseed_app\pyproject.toml" "%TARGET%\lib\back_ends\oceanseed_app\" >nul 2>&1
copy /Y "%SOURCE%\lib\back_ends\oceanseed_app\README.md" "%TARGET%\lib\back_ends\oceanseed_app\" >nul 2>&1
copy /Y "%SOURCE%\lib\back_ends\oceanseed_app\.gitignore" "%TARGET%\lib\back_ends\oceanseed_app\" >nul 2>&1

echo [2/21] Syncing lib/back_ends/oceanfarm_app...
if not exist "%TARGET%\lib\back_ends\oceanfarm_app" mkdir "%TARGET%\lib\back_ends\oceanfarm_app"
robocopy "%SOURCE%\lib\back_ends\oceanfarm_app\oceanfarm_app" "%TARGET%\lib\back_ends\oceanfarm_app\oceanfarm_app" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\back_ends\oceanfarm_app\pyproject.toml" "%TARGET%\lib\back_ends\oceanfarm_app\" >nul 2>&1
copy /Y "%SOURCE%\lib\back_ends\oceanfarm_app\README.md" "%TARGET%\lib\back_ends\oceanfarm_app\" >nul 2>&1
copy /Y "%SOURCE%\lib\back_ends\oceanfarm_app\.gitignore" "%TARGET%\lib\back_ends\oceanfarm_app\" >nul 2>&1

echo [3/21] Syncing lib/back_ends/oceanhub_app...
if not exist "%TARGET%\lib\back_ends\oceanhub_app" mkdir "%TARGET%\lib\back_ends\oceanhub_app"
robocopy "%SOURCE%\lib\back_ends\oceanhub_app\oceanhub_app" "%TARGET%\lib\back_ends\oceanhub_app\oceanhub_app" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\back_ends\oceanhub_app\launch_scripts" "%TARGET%\lib\back_ends\oceanhub_app\launch_scripts" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\back_ends\oceanhub_app\postman_scripts" "%TARGET%\lib\back_ends\oceanhub_app\postman_scripts" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\back_ends\oceanhub_app\pyproject.toml" "%TARGET%\lib\back_ends\oceanhub_app\" >nul 2>&1
copy /Y "%SOURCE%\lib\back_ends\oceanhub_app\README.md" "%TARGET%\lib\back_ends\oceanhub_app\" >nul 2>&1
copy /Y "%SOURCE%\lib\back_ends\oceanhub_app\.gitignore" "%TARGET%\lib\back_ends\oceanhub_app\" >nul 2>&1

:: ============================================
:: Front-ends (5) - selective sync of source files only
:: ============================================
echo [4/21] Syncing lib/front_ends/oceanwave_dash...
if not exist "%TARGET%\lib\front_ends\oceanwave_dash" mkdir "%TARGET%\lib\front_ends\oceanwave_dash"

:: Sync only essential folders for oceanwave_dash
robocopy "%SOURCE%\lib\front_ends\oceanwave_dash\electron" "%TARGET%\lib\front_ends\oceanwave_dash\electron" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\front_ends\oceanwave_dash\frontend" "%TARGET%\lib\front_ends\oceanwave_dash\frontend" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\front_ends\oceanwave_dash\scripts" "%TARGET%\lib\front_ends\oceanwave_dash\scripts" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\front_ends\oceanwave_dash\config" "%TARGET%\lib\front_ends\oceanwave_dash\config" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\front_ends\oceanwave_dash\backend" "%TARGET%\lib\front_ends\oceanwave_dash\backend" %ROBO_FLAGS%

:: Copy root config files for oceanwave_dash
copy /Y "%SOURCE%\lib\front_ends\oceanwave_dash\package.json" "%TARGET%\lib\front_ends\oceanwave_dash\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanwave_dash\electron-builder.json" "%TARGET%\lib\front_ends\oceanwave_dash\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanwave_dash\.gitignore" "%TARGET%\lib\front_ends\oceanwave_dash\" >nul 2>&1

echo [5/21] Syncing lib/front_ends/oceanreact...
if not exist "%TARGET%\lib\front_ends\oceanreact" mkdir "%TARGET%\lib\front_ends\oceanreact"

:: Sync only essential folders for oceanreact
robocopy "%SOURCE%\lib\front_ends\oceanreact\src" "%TARGET%\lib\front_ends\oceanreact\src" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\front_ends\oceanreact\public" "%TARGET%\lib\front_ends\oceanreact\public" %ROBO_FLAGS%

:: Copy root config files for oceanreact
copy /Y "%SOURCE%\lib\front_ends\oceanreact\package.json" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\tsconfig.json" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\tsconfig.app.json" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\tsconfig.lib.json" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\tsconfig.node.json" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\vite.config.ts" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\tailwind.config.js" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\postcss.config.js" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\eslint.config.js" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\components.json" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\index.html" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanreact\.gitignore" "%TARGET%\lib\front_ends\oceanreact\" >nul 2>&1

echo [6/21] Syncing lib/front_ends/oceandata_gui...
if not exist "%TARGET%\lib\front_ends\oceandata_gui" mkdir "%TARGET%\lib\front_ends\oceandata_gui"
robocopy "%SOURCE%\lib\front_ends\oceandata_gui\oceandata_gui" "%TARGET%\lib\front_ends\oceandata_gui\oceandata_gui" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\front_ends\oceandata_gui\scripts" "%TARGET%\lib\front_ends\oceandata_gui\scripts" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\front_ends\oceandata_gui\.gitignore" "%TARGET%\lib\front_ends\oceandata_gui\" >nul 2>&1

echo [7/21] Syncing lib/front_ends/oceanpyqt...
if not exist "%TARGET%\lib\front_ends\oceanpyqt" mkdir "%TARGET%\lib\front_ends\oceanpyqt"
robocopy "%SOURCE%\lib\front_ends\oceanpyqt\src" "%TARGET%\lib\front_ends\oceanpyqt\src" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\front_ends\oceanpyqt\pyproject.toml" "%TARGET%\lib\front_ends\oceanpyqt\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanpyqt\README.md" "%TARGET%\lib\front_ends\oceanpyqt\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanpyqt\.gitignore" "%TARGET%\lib\front_ends\oceanpyqt\" >nul 2>&1

echo [8/21] Syncing lib/front_ends/oceanapp...
if not exist "%TARGET%\lib\front_ends\oceanapp" mkdir "%TARGET%\lib\front_ends\oceanapp"
robocopy "%SOURCE%\lib\front_ends\oceanapp\oceanapp" "%TARGET%\lib\front_ends\oceanapp\oceanapp" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\front_ends\oceanapp\pyproject.toml" "%TARGET%\lib\front_ends\oceanapp\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanapp\README.md" "%TARGET%\lib\front_ends\oceanapp\" >nul 2>&1
copy /Y "%SOURCE%\lib\front_ends\oceanapp\.gitignore" "%TARGET%\lib\front_ends\oceanapp\" >nul 2>&1

:: ============================================
:: Core libraries (8) - only source + config
:: ============================================
echo [9/21] Syncing lib/jsonldb...
if not exist "%TARGET%\lib\jsonldb" mkdir "%TARGET%\lib\jsonldb"
robocopy "%SOURCE%\lib\jsonldb\jsonldb" "%TARGET%\lib\jsonldb\jsonldb" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\jsonldb\setup.py" "%TARGET%\lib\jsonldb\" >nul 2>&1
copy /Y "%SOURCE%\lib\jsonldb\pyproject.toml" "%TARGET%\lib\jsonldb\" >nul 2>&1
copy /Y "%SOURCE%\lib\jsonldb\README.md" "%TARGET%\lib\jsonldb\" >nul 2>&1
copy /Y "%SOURCE%\lib\jsonldb\.gitignore" "%TARGET%\lib\jsonldb\" >nul 2>&1

echo [10/21] Syncing lib/oceancap...
if not exist "%TARGET%\lib\oceancap" mkdir "%TARGET%\lib\oceancap"
robocopy "%SOURCE%\lib\oceancap\oceancap" "%TARGET%\lib\oceancap\oceancap" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\oceancap\setup.py" "%TARGET%\lib\oceancap\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceancap\pyproject.toml" "%TARGET%\lib\oceancap\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceancap\README.md" "%TARGET%\lib\oceancap\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceancap\.gitignore" "%TARGET%\lib\oceancap\" >nul 2>&1

echo [11/21] Syncing lib/oceandata...
if not exist "%TARGET%\lib\oceandata" mkdir "%TARGET%\lib\oceandata"
robocopy "%SOURCE%\lib\oceandata\oceandata" "%TARGET%\lib\oceandata\oceandata" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\oceandata\pyproject.toml" "%TARGET%\lib\oceandata\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceandata\README.md" "%TARGET%\lib\oceandata\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceandata\.gitignore" "%TARGET%\lib\oceandata\" >nul 2>&1

echo [12/21] Syncing lib/oceanfarm...
if not exist "%TARGET%\lib\oceanfarm" mkdir "%TARGET%\lib\oceanfarm"
robocopy "%SOURCE%\lib\oceanfarm\oceanfarm" "%TARGET%\lib\oceanfarm\oceanfarm" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\oceanfarm\pyproject.toml" "%TARGET%\lib\oceanfarm\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanfarm\README.md" "%TARGET%\lib\oceanfarm\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanfarm\.gitignore" "%TARGET%\lib\oceanfarm\" >nul 2>&1

echo [13/21] Syncing lib/oceanquant...
if not exist "%TARGET%\lib\oceanquant" mkdir "%TARGET%\lib\oceanquant"
robocopy "%SOURCE%\lib\oceanquant\oceanquant" "%TARGET%\lib\oceanquant\oceanquant" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\oceanquant\setup.py" "%TARGET%\lib\oceanquant\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanquant\pyproject.toml" "%TARGET%\lib\oceanquant\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanquant\README.md" "%TARGET%\lib\oceanquant\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanquant\.gitignore" "%TARGET%\lib\oceanquant\" >nul 2>&1
:: Copy rust folder for oceanquant_rust extension (exclude target/ build artifacts)
robocopy "%SOURCE%\lib\oceanquant\oceanquant\rust" "%TARGET%\lib\oceanquant\oceanquant\rust" /E /XD target __pycache__ /XF *.pyc .DS_Store /NFL /NDL /NJH /NJS /nc /ns /np

echo [14/21] Syncing lib/oceanseed...
if not exist "%TARGET%\lib\oceanseed" mkdir "%TARGET%\lib\oceanseed"
robocopy "%SOURCE%\lib\oceanseed\oceanseed" "%TARGET%\lib\oceanseed\oceanseed" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\oceanseed\pyproject.toml" "%TARGET%\lib\oceanseed\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanseed\README.md" "%TARGET%\lib\oceanseed\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanseed\.gitignore" "%TARGET%\lib\oceanseed\" >nul 2>&1

echo [15/21] Syncing lib/oceanutil...
if not exist "%TARGET%\lib\oceanutil" mkdir "%TARGET%\lib\oceanutil"
robocopy "%SOURCE%\lib\oceanutil\oceanutil" "%TARGET%\lib\oceanutil\oceanutil" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\oceanutil\setup.py" "%TARGET%\lib\oceanutil\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanutil\pyproject.toml" "%TARGET%\lib\oceanutil\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanutil\README.md" "%TARGET%\lib\oceanutil\" >nul 2>&1
copy /Y "%SOURCE%\lib\oceanutil\.gitignore" "%TARGET%\lib\oceanutil\" >nul 2>&1

echo [16/21] Syncing lib/oceanshed...
if not exist "%TARGET%\lib\oceanshed" mkdir "%TARGET%\lib\oceanshed"
robocopy "%SOURCE%\lib\oceanshed\src" "%TARGET%\lib\oceanshed\src" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\oceanshed\configs" "%TARGET%\lib\oceanshed\configs" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\oceanshed\signals" "%TARGET%\lib\oceanshed\signals" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\oceanshed\scripts" "%TARGET%\lib\oceanshed\scripts" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\oceanshed\.gitignore" "%TARGET%\lib\oceanshed\" >nul 2>&1
robocopy "%SOURCE%\lib\oceanshed\.oceanshed" "%TARGET%\lib\oceanshed\.oceanshed" %ROBO_FLAGS%

:: ============================================
:: CLI tools (2) - source + build scripts only
:: ============================================
echo [17/21] Syncing lib/cli/oceandata-cli...
if not exist "%TARGET%\lib\cli\oceandata-cli" mkdir "%TARGET%\lib\cli\oceandata-cli"
robocopy "%SOURCE%\lib\cli\oceandata-cli\cmd" "%TARGET%\lib\cli\oceandata-cli\cmd" %ROBO_FLAGS%
robocopy "%SOURCE%\lib\cli\oceandata-cli\internal" "%TARGET%\lib\cli\oceandata-cli\internal" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\cli\oceandata-cli\main.go" "%TARGET%\lib\cli\oceandata-cli\" >nul 2>&1
copy /Y "%SOURCE%\lib\cli\oceandata-cli\go.mod" "%TARGET%\lib\cli\oceandata-cli\" >nul 2>&1
copy /Y "%SOURCE%\lib\cli\oceandata-cli\go.sum" "%TARGET%\lib\cli\oceandata-cli\" >nul 2>&1
copy /Y "%SOURCE%\lib\cli\oceandata-cli\Makefile" "%TARGET%\lib\cli\oceandata-cli\" >nul 2>&1
copy /Y "%SOURCE%\lib\cli\oceandata-cli\.gitignore" "%TARGET%\lib\cli\oceandata-cli\" >nul 2>&1

echo [18/21] Syncing lib/cli/oceanlab-cli...
if not exist "%TARGET%\lib\cli\oceanlab-cli" mkdir "%TARGET%\lib\cli\oceanlab-cli"
robocopy "%SOURCE%\lib\cli\oceanlab-cli\src" "%TARGET%\lib\cli\oceanlab-cli\src" %ROBO_FLAGS%
copy /Y "%SOURCE%\lib\cli\oceanlab-cli\package.json" "%TARGET%\lib\cli\oceanlab-cli\" >nul 2>&1
copy /Y "%SOURCE%\lib\cli\oceanlab-cli\tsconfig.json" "%TARGET%\lib\cli\oceanlab-cli\" >nul 2>&1
copy /Y "%SOURCE%\lib\cli\oceanlab-cli\.gitignore" "%TARGET%\lib\cli\oceanlab-cli\" >nul 2>&1

:: ============================================
:: Hubs (2)
:: ============================================
echo [19/21] Syncing hubs/data_configs...
if not exist "%TARGET%\hubs\data_configs" mkdir "%TARGET%\hubs\data_configs"
robocopy "%SOURCE%\hubs\data_configs" "%TARGET%\hubs\data_configs" %ROBO_FLAGS%

echo [20/21] Syncing hubs/signal_samples...
if not exist "%TARGET%\hubs\signal_samples" mkdir "%TARGET%\hubs\signal_samples"
robocopy "%SOURCE%\hubs\signal_samples" "%TARGET%\hubs\signal_samples" %ROBO_FLAGS%

:: ============================================
:: Scripts folder
:: ============================================
echo [21/21] Syncing scripts folder...
if not exist "%TARGET%\scripts" mkdir "%TARGET%\scripts"
robocopy "%SOURCE%\scripts" "%TARGET%\scripts" /E /XD __pycache__ .git .claude .venv /XF *.pyc .DS_Store hub_config.toml sync_to_prod.bat sync_to_prod.sh /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo ========================================
echo  Sync Completed Successfully!
echo ========================================
echo.
echo Synced from: %SOURCE%
echo Synced to:   %TARGET%
echo.
echo Libraries:
echo   - Back-ends: oceanseed_app, oceanfarm_app, oceanhub_app
echo   - Front-ends: oceanwave_dash, oceanreact, oceandata_gui, oceanpyqt, oceanapp
echo   - CLI: oceandata-cli, oceanlab-cli
echo   - Core libs: jsonldb, oceancap, oceandata, oceanfarm, oceanquant, oceanseed, oceanutil, oceanshed
echo   - Hubs: data_configs, signal_samples
echo   - Scripts folder
echo.
exit /b 0

:error
echo.
echo ========================================
echo  ERROR: Sync failed!
echo ========================================
echo.
exit /b 1
