#!/bin/bash
# =============================================================================
# sync_to_prod.sh
# Selectively sync ONLY essential source files from dev to prod
# Copies only: source folders + pyproject.toml/setup.py (no tests, examples, docs, etc.)
#
# Configuration: Set SOURCE and TARGET below before running
#
# Libraries synced:
#   Core: jsonldb, oceancap, oceandata, oceanfarm, oceanquant, oceanseed, oceanutil, oceanshed
#   Back-ends: oceanseed_app, oceanfarm_app, oceanhub_app
#   Front-ends: oceanwave_dash, oceanreact, oceandata_gui, oceanpyqt, oceanapp
#   CLI: oceandata-cli, oceanlab-cli
#   Hubs: data_configs, signal_samples
#   Scripts folder (excluding configs/hub_config.toml and sync_to_prod.sh)
# =============================================================================

# ============================================
# CONFIGURATION - Edit these paths as needed
# ============================================
SOURCE="$HOME/oceanwave"
TARGET="$HOME/oceanwave_app/oceanwave_v1.0"

# ============================================
# End of configuration
# ============================================

echo ""
echo "========================================"
echo " Syncing Source Files: Dev to Prod"
echo "========================================"
echo "Source: $SOURCE"
echo "Target: $TARGET"
echo ""

# Validate source exists
if [ ! -d "$SOURCE" ]; then
    echo "ERROR: Source directory does not exist: $SOURCE"
    exit 1
fi

# Create target directory if it doesn't exist
if [ ! -d "$TARGET" ]; then
    echo "Creating target directory..."
    mkdir -p "$TARGET"
fi

# Common excludes for rsync
EXCLUDE_OPTS="--exclude=__pycache__ --exclude=.git --exclude=node_modules --exclude=dist --exclude=.claude --exclude=.specdev --exclude=.pytest_cache --exclude=.venv --exclude=.ruff_cache --exclude=.serena --exclude=.vscode --exclude=.apidoc --exclude=.journal --exclude=.obsidian --exclude=*.pyc --exclude=.DS_Store"

# ============================================
# Back-ends (3)
# ============================================
echo "[1/21] Syncing lib/back_ends/oceanseed_app..."
mkdir -p "$TARGET/lib/back_ends/oceanseed_app"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/back_ends/oceanseed_app/oceanseed_app/" "$TARGET/lib/back_ends/oceanseed_app/oceanseed_app/"
cp -f "$SOURCE/lib/back_ends/oceanseed_app/pyproject.toml" "$TARGET/lib/back_ends/oceanseed_app/" 2>/dev/null || true
cp -f "$SOURCE/lib/back_ends/oceanseed_app/README.md" "$TARGET/lib/back_ends/oceanseed_app/" 2>/dev/null || true
cp -f "$SOURCE/lib/back_ends/oceanseed_app/.gitignore" "$TARGET/lib/back_ends/oceanseed_app/" 2>/dev/null || true

echo "[2/21] Syncing lib/back_ends/oceanfarm_app..."
mkdir -p "$TARGET/lib/back_ends/oceanfarm_app"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/back_ends/oceanfarm_app/oceanfarm_app/" "$TARGET/lib/back_ends/oceanfarm_app/oceanfarm_app/"
cp -f "$SOURCE/lib/back_ends/oceanfarm_app/pyproject.toml" "$TARGET/lib/back_ends/oceanfarm_app/" 2>/dev/null || true
cp -f "$SOURCE/lib/back_ends/oceanfarm_app/README.md" "$TARGET/lib/back_ends/oceanfarm_app/" 2>/dev/null || true
cp -f "$SOURCE/lib/back_ends/oceanfarm_app/.gitignore" "$TARGET/lib/back_ends/oceanfarm_app/" 2>/dev/null || true

echo "[3/21] Syncing lib/back_ends/oceanhub_app..."
mkdir -p "$TARGET/lib/back_ends/oceanhub_app"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/back_ends/oceanhub_app/oceanhub_app/" "$TARGET/lib/back_ends/oceanhub_app/oceanhub_app/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/back_ends/oceanhub_app/launch_scripts/" "$TARGET/lib/back_ends/oceanhub_app/launch_scripts/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/back_ends/oceanhub_app/postman_scripts/" "$TARGET/lib/back_ends/oceanhub_app/postman_scripts/"
cp -f "$SOURCE/lib/back_ends/oceanhub_app/pyproject.toml" "$TARGET/lib/back_ends/oceanhub_app/" 2>/dev/null || true
cp -f "$SOURCE/lib/back_ends/oceanhub_app/README.md" "$TARGET/lib/back_ends/oceanhub_app/" 2>/dev/null || true
cp -f "$SOURCE/lib/back_ends/oceanhub_app/.gitignore" "$TARGET/lib/back_ends/oceanhub_app/" 2>/dev/null || true

# ============================================
# Front-ends (5) - selective sync of source files only
# ============================================
echo "[4/21] Syncing lib/front_ends/oceanwave_dash..."
mkdir -p "$TARGET/lib/front_ends/oceanwave_dash"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanwave_dash/electron/" "$TARGET/lib/front_ends/oceanwave_dash/electron/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanwave_dash/frontend/" "$TARGET/lib/front_ends/oceanwave_dash/frontend/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanwave_dash/scripts/" "$TARGET/lib/front_ends/oceanwave_dash/scripts/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanwave_dash/config/" "$TARGET/lib/front_ends/oceanwave_dash/config/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanwave_dash/backend/" "$TARGET/lib/front_ends/oceanwave_dash/backend/"
cp -f "$SOURCE/lib/front_ends/oceanwave_dash/package.json" "$TARGET/lib/front_ends/oceanwave_dash/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanwave_dash/electron-builder.json" "$TARGET/lib/front_ends/oceanwave_dash/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanwave_dash/.gitignore" "$TARGET/lib/front_ends/oceanwave_dash/" 2>/dev/null || true

echo "[5/21] Syncing lib/front_ends/oceanreact..."
mkdir -p "$TARGET/lib/front_ends/oceanreact"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanreact/src/" "$TARGET/lib/front_ends/oceanreact/src/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanreact/public/" "$TARGET/lib/front_ends/oceanreact/public/"
cp -f "$SOURCE/lib/front_ends/oceanreact/package.json" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/tsconfig.json" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/tsconfig.app.json" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/tsconfig.lib.json" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/tsconfig.node.json" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/vite.config.ts" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/tailwind.config.js" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/postcss.config.js" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/eslint.config.js" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/components.json" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/index.html" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanreact/.gitignore" "$TARGET/lib/front_ends/oceanreact/" 2>/dev/null || true

echo "[6/21] Syncing lib/front_ends/oceandata_gui..."
mkdir -p "$TARGET/lib/front_ends/oceandata_gui"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceandata_gui/oceandata_gui/" "$TARGET/lib/front_ends/oceandata_gui/oceandata_gui/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceandata_gui/scripts/" "$TARGET/lib/front_ends/oceandata_gui/scripts/"
cp -f "$SOURCE/lib/front_ends/oceandata_gui/.gitignore" "$TARGET/lib/front_ends/oceandata_gui/" 2>/dev/null || true

echo "[7/21] Syncing lib/front_ends/oceanpyqt..."
mkdir -p "$TARGET/lib/front_ends/oceanpyqt"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanpyqt/src/" "$TARGET/lib/front_ends/oceanpyqt/src/"
cp -f "$SOURCE/lib/front_ends/oceanpyqt/pyproject.toml" "$TARGET/lib/front_ends/oceanpyqt/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanpyqt/README.md" "$TARGET/lib/front_ends/oceanpyqt/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanpyqt/.gitignore" "$TARGET/lib/front_ends/oceanpyqt/" 2>/dev/null || true

echo "[8/21] Syncing lib/front_ends/oceanapp..."
mkdir -p "$TARGET/lib/front_ends/oceanapp"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/front_ends/oceanapp/oceanapp/" "$TARGET/lib/front_ends/oceanapp/oceanapp/"
cp -f "$SOURCE/lib/front_ends/oceanapp/pyproject.toml" "$TARGET/lib/front_ends/oceanapp/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanapp/README.md" "$TARGET/lib/front_ends/oceanapp/" 2>/dev/null || true
cp -f "$SOURCE/lib/front_ends/oceanapp/.gitignore" "$TARGET/lib/front_ends/oceanapp/" 2>/dev/null || true

# ============================================
# Core libraries (8) - only source + config
# ============================================
echo "[9/21] Syncing lib/jsonldb..."
mkdir -p "$TARGET/lib/jsonldb"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/jsonldb/jsonldb/" "$TARGET/lib/jsonldb/jsonldb/"
cp -f "$SOURCE/lib/jsonldb/setup.py" "$TARGET/lib/jsonldb/" 2>/dev/null || true
cp -f "$SOURCE/lib/jsonldb/pyproject.toml" "$TARGET/lib/jsonldb/" 2>/dev/null || true
cp -f "$SOURCE/lib/jsonldb/README.md" "$TARGET/lib/jsonldb/" 2>/dev/null || true
cp -f "$SOURCE/lib/jsonldb/.gitignore" "$TARGET/lib/jsonldb/" 2>/dev/null || true

echo "[10/21] Syncing lib/oceancap..."
mkdir -p "$TARGET/lib/oceancap"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceancap/oceancap/" "$TARGET/lib/oceancap/oceancap/"
cp -f "$SOURCE/lib/oceancap/setup.py" "$TARGET/lib/oceancap/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceancap/pyproject.toml" "$TARGET/lib/oceancap/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceancap/README.md" "$TARGET/lib/oceancap/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceancap/.gitignore" "$TARGET/lib/oceancap/" 2>/dev/null || true

echo "[11/21] Syncing lib/oceandata..."
mkdir -p "$TARGET/lib/oceandata"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceandata/oceandata/" "$TARGET/lib/oceandata/oceandata/"
cp -f "$SOURCE/lib/oceandata/pyproject.toml" "$TARGET/lib/oceandata/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceandata/README.md" "$TARGET/lib/oceandata/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceandata/.gitignore" "$TARGET/lib/oceandata/" 2>/dev/null || true

echo "[12/21] Syncing lib/oceanfarm..."
mkdir -p "$TARGET/lib/oceanfarm"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanfarm/oceanfarm/" "$TARGET/lib/oceanfarm/oceanfarm/"
cp -f "$SOURCE/lib/oceanfarm/pyproject.toml" "$TARGET/lib/oceanfarm/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanfarm/README.md" "$TARGET/lib/oceanfarm/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanfarm/.gitignore" "$TARGET/lib/oceanfarm/" 2>/dev/null || true

echo "[13/21] Syncing lib/oceanquant..."
mkdir -p "$TARGET/lib/oceanquant"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanquant/oceanquant/" "$TARGET/lib/oceanquant/oceanquant/"
cp -f "$SOURCE/lib/oceanquant/setup.py" "$TARGET/lib/oceanquant/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanquant/pyproject.toml" "$TARGET/lib/oceanquant/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanquant/README.md" "$TARGET/lib/oceanquant/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanquant/.gitignore" "$TARGET/lib/oceanquant/" 2>/dev/null || true
# Copy rust folder for oceanquant_rust extension (exclude target/ build artifacts)
rsync -a --exclude=target --exclude=__pycache__ --exclude=*.pyc --exclude=.DS_Store "$SOURCE/lib/oceanquant/oceanquant/rust/" "$TARGET/lib/oceanquant/oceanquant/rust/"

echo "[14/21] Syncing lib/oceanseed..."
mkdir -p "$TARGET/lib/oceanseed"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanseed/oceanseed/" "$TARGET/lib/oceanseed/oceanseed/"
cp -f "$SOURCE/lib/oceanseed/pyproject.toml" "$TARGET/lib/oceanseed/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanseed/README.md" "$TARGET/lib/oceanseed/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanseed/.gitignore" "$TARGET/lib/oceanseed/" 2>/dev/null || true

echo "[15/21] Syncing lib/oceanutil..."
mkdir -p "$TARGET/lib/oceanutil"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanutil/oceanutil/" "$TARGET/lib/oceanutil/oceanutil/"
cp -f "$SOURCE/lib/oceanutil/setup.py" "$TARGET/lib/oceanutil/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanutil/pyproject.toml" "$TARGET/lib/oceanutil/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanutil/README.md" "$TARGET/lib/oceanutil/" 2>/dev/null || true
cp -f "$SOURCE/lib/oceanutil/.gitignore" "$TARGET/lib/oceanutil/" 2>/dev/null || true

echo "[16/21] Syncing lib/oceanshed..."
mkdir -p "$TARGET/lib/oceanshed"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanshed/src/" "$TARGET/lib/oceanshed/src/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanshed/configs/" "$TARGET/lib/oceanshed/configs/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanshed/signals/" "$TARGET/lib/oceanshed/signals/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanshed/scripts/" "$TARGET/lib/oceanshed/scripts/"
cp -f "$SOURCE/lib/oceanshed/.gitignore" "$TARGET/lib/oceanshed/" 2>/dev/null || true
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/oceanshed/.oceanshed/" "$TARGET/lib/oceanshed/.oceanshed/"

# ============================================
# CLI tools (2) - source + build scripts only
# ============================================
echo "[17/21] Syncing lib/cli/oceandata-cli..."
mkdir -p "$TARGET/lib/cli/oceandata-cli"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/cli/oceandata-cli/cmd/" "$TARGET/lib/cli/oceandata-cli/cmd/"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/cli/oceandata-cli/internal/" "$TARGET/lib/cli/oceandata-cli/internal/"
cp -f "$SOURCE/lib/cli/oceandata-cli/main.go" "$TARGET/lib/cli/oceandata-cli/" 2>/dev/null || true
cp -f "$SOURCE/lib/cli/oceandata-cli/go.mod" "$TARGET/lib/cli/oceandata-cli/" 2>/dev/null || true
cp -f "$SOURCE/lib/cli/oceandata-cli/go.sum" "$TARGET/lib/cli/oceandata-cli/" 2>/dev/null || true
cp -f "$SOURCE/lib/cli/oceandata-cli/Makefile" "$TARGET/lib/cli/oceandata-cli/" 2>/dev/null || true
cp -f "$SOURCE/lib/cli/oceandata-cli/.gitignore" "$TARGET/lib/cli/oceandata-cli/" 2>/dev/null || true

echo "[18/21] Syncing lib/cli/oceanlab-cli..."
mkdir -p "$TARGET/lib/cli/oceanlab-cli"
rsync -a $EXCLUDE_OPTS "$SOURCE/lib/cli/oceanlab-cli/src/" "$TARGET/lib/cli/oceanlab-cli/src/"
cp -f "$SOURCE/lib/cli/oceanlab-cli/package.json" "$TARGET/lib/cli/oceanlab-cli/" 2>/dev/null || true
cp -f "$SOURCE/lib/cli/oceanlab-cli/tsconfig.json" "$TARGET/lib/cli/oceanlab-cli/" 2>/dev/null || true
cp -f "$SOURCE/lib/cli/oceanlab-cli/.gitignore" "$TARGET/lib/cli/oceanlab-cli/" 2>/dev/null || true

# ============================================
# Hubs (2)
# ============================================
echo "[19/21] Syncing hubs/data_configs..."
mkdir -p "$TARGET/hubs/data_configs"
rsync -a $EXCLUDE_OPTS "$SOURCE/hubs/data_configs/" "$TARGET/hubs/data_configs/"

echo "[20/21] Syncing hubs/signal_samples..."
mkdir -p "$TARGET/hubs/signal_samples"
rsync -a $EXCLUDE_OPTS "$SOURCE/hubs/signal_samples/" "$TARGET/hubs/signal_samples/"

# ============================================
# Scripts folder
# ============================================
echo "[21/21] Syncing scripts folder..."
mkdir -p "$TARGET/scripts"
rsync -a --exclude=__pycache__ --exclude=.git --exclude=.claude --exclude=.venv --exclude=*.pyc --exclude=.DS_Store --exclude=hub_config.toml --exclude=sync_to_prod.sh --exclude=sync_to_prod.bat "$SOURCE/scripts/" "$TARGET/scripts/"

echo ""
echo "========================================"
echo " Sync Completed Successfully!"
echo "========================================"
echo ""
echo "Synced from: $SOURCE"
echo "Synced to:   $TARGET"
echo ""
echo "Libraries:"
echo "  - Back-ends: oceanseed_app, oceanfarm_app, oceanhub_app"
echo "  - Front-ends: oceanwave_dash, oceanreact, oceandata_gui, oceanpyqt, oceanapp"
echo "  - CLI: oceandata-cli, oceanlab-cli"
echo "  - Core libs: jsonldb, oceancap, oceandata, oceanfarm, oceanquant, oceanseed, oceanutil, oceanshed"
echo "  - Hubs: data_configs, signal_samples"
echo "  - Scripts folder"
echo ""
