#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect OS for correct venv path
OS="$(uname -s)"
case "$OS" in
    Darwin*|Linux*) VENV_DIR="venv-linux" ;;
    *)              VENV_DIR="venv" ;;
esac

source "$SCRIPT_DIR/../lib/front_ends/oceandata_gui/$VENV_DIR/bin/activate"
python "$SCRIPT_DIR/../lib/front_ends/oceandata_gui/oceandata_gui/main.py"
