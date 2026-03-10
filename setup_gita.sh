#!/bin/bash
# Setup gita to manage all OceanWave git repositories

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
VENV_PATH="$SCRIPT_DIR/.venv"

echo ""
echo "========================================"
echo "Gita Setup for OceanWave Repositories"
echo "========================================"
echo ""

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo "ERROR: uv is not installed or not in PATH"
    echo "Install uv: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi

# Create venv if it doesn't exist
if [ ! -f "$VENV_PATH/bin/activate" ]; then
    echo "Creating scripts venv..."
    if ! uv venv "$VENV_PATH" --python 3.12; then
        echo "ERROR: Failed to create virtual environment"
        exit 1
    fi
fi

# Install gita if not present
if [ ! -f "$VENV_PATH/bin/gita" ]; then
    echo "Installing gita..."
    if ! uv pip install --python "$VENV_PATH/bin/python" gita; then
        echo "ERROR: Failed to install gita"
        exit 1
    fi
fi

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Clear existing gita repos (if any)
echo ""
echo "[1/2] Clearing existing gita configuration..."
gita rm oceancap oceandata oceanquant oceanseed oceanshed oceanutil jsonldb oceanfarm oceanseed_app oceanfarm_app oceanhub_app oceanwave_dash oceanreact oceandata_gui oceanpyqt oceanapp oceandata-cli oceanlab-cli data_configs signal_samples scripts 2>/dev/null || true
echo ""

# Register all repositories
echo "[2/2] Registering all git repositories with gita..."
cd "$ROOT"

# Core libraries
gita add -a lib/oceancap
gita add -a lib/oceandata
gita add -a lib/oceanquant
gita add -a lib/oceanseed
gita add -a lib/oceanshed
gita add -a lib/oceanutil
gita add -a lib/jsonldb
gita add -a lib/oceanfarm

# Back-ends
gita add -a lib/back_ends/oceanseed_app
gita add -a lib/back_ends/oceanfarm_app
gita add -a lib/back_ends/oceanhub_app

# Front-ends
gita add -a lib/front_ends/oceanwave_dash
gita add -a lib/front_ends/oceanreact
gita add -a lib/front_ends/oceandata_gui
gita add -a lib/front_ends/oceanpyqt
gita add -a lib/front_ends/oceanapp

# CLI tools
gita add -a lib/cli/oceandata-cli
gita add -a lib/cli/oceanlab-cli

# Hubs
gita add -a hubs/data_configs
gita add -a hubs/signal_samples

# Scripts
gita add -a scripts

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Registered repositories:"
gita ll
echo ""
echo "You can now use:"
echo "  - gita pull     : Pull all repos"
echo "  - gita push     : Push all repos"
echo "  - gita st       : Show status of all repos"
echo "  - gita fetch    : Fetch all repos"
echo "  - gita ll       : List all repos with branch info"
echo ""
echo "Or use the wrapper scripts:"
echo "  - git_pull_all.sh"
echo "  - git_push_all.sh"
echo "  - git_status_all.sh"
echo "  - git_fetch_all.sh"
echo ""
