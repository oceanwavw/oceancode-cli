#!/usr/bin/env bash
# =============================================================================
# build_backends.sh
# Build Python backend using uv - creates venvs for oceanwave_dash and
# oceandata_gui. Uses uv to manage Python 3.12+ and package installation.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/../.."
VENV_PATH="$ROOT/lib/front_ends/oceanwave_dash/venv-linux"
PYTHON_BIN="$VENV_PATH/bin/python"
LIB_ROOT="$ROOT/lib"
PYTHON_VERSION="3.12"

echo ""
echo "========================================"
echo " Building Python Backend (using uv)"
echo "========================================"
echo "Root: $ROOT"
echo "Venv: $VENV_PATH"
echo "Python: $PYTHON_VERSION"
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "ERROR: uv is not installed or not in PATH"
    echo "Install uv: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi

# Step 1: Create virtual environment with Python 3.12
echo "[1/6] Creating virtual environment with Python $PYTHON_VERSION..."

# Remove existing venv if present
if [ -d "$VENV_PATH" ]; then
    echo "Removing existing venv..."
    rm -rf "$VENV_PATH"
fi

# Create new venv with uv
uv venv "$VENV_PATH" --python "$PYTHON_VERSION"

# Verify Python executable exists
if [ ! -f "$PYTHON_BIN" ]; then
    echo "ERROR: Venv created but Python executable not found"
    exit 1
fi
echo "Virtual environment created!"

# Check Python version in venv
echo ""
"$PYTHON_BIN" --version

# Step 2: Install PyPI dependencies
echo ""
echo "[2/6] Installing PyPI dependencies..."

PYPI_DEPS="loguru base36 scipy matplotlib plotly bokeh numba pandas numpy toml fastapi uvicorn pydantic httpx pytest pytest-asyncio requests pyyaml python-dateutil gitpython gita"

uv pip install --python "$PYTHON_BIN" $PYPI_DEPS

# Install pandas-ta
echo "Installing pandas-ta..."
if ! uv pip install --python "$PYTHON_BIN" pandas-ta==0.4.71b0 2>/dev/null; then
    echo "Trying pandas-ta-classic instead..."
    uv pip install --python "$PYTHON_BIN" pandas-ta-classic
fi

echo "PyPI dependencies installed!"

# Step 3: Install local oceanwave packages in order
echo ""
echo "[3/6] Installing local packages..."

echo "  Installing jsonldb..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/jsonldb"

echo "  Installing oceancap..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/oceancap"

echo "  Installing oceanutil..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/oceanutil"

echo "  Installing oceandata..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/oceandata"

echo "  Installing oceanseed..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/oceanseed"

echo "  Installing oceanquant..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/oceanquant"

# Build and install oceanquant_rust extension
echo "  Building oceanquant_rust (Rust extension)..."

# Check for cargo, attempt install if missing
if ! command -v cargo &> /dev/null; then
    echo "  Rust/Cargo not found, attempting to install..."
    if curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; then
        # Source cargo env for current session
        if [ -f "$HOME/.cargo/env" ]; then
            source "$HOME/.cargo/env"
        fi
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
fi

if command -v cargo &> /dev/null; then
    echo "  Installing maturin..."
    if uv pip install --python "$PYTHON_BIN" maturin; then
        echo "  Running maturin develop..."
        ORIG_DIR="$(pwd)"
        cd "$LIB_ROOT/oceanquant/oceanquant/rust"
        VIRTUAL_ENV="$VENV_PATH" "$VENV_PATH/bin/maturin" develop --release || {
            echo "  WARNING: Maturin develop failed"
            echo "  The system will work but without Rust acceleration"
        }
        cd "$ORIG_DIR"
    else
        echo "  WARNING: Failed to install maturin"
    fi
else
    echo "  WARNING: Rust/Cargo not found and could not be installed"
    echo "  The system will work but without Rust acceleration"
    echo "  To install manually: https://rustup.rs/"
fi

echo "  Installing oceanfarm..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/oceanfarm"

echo "  Installing oceanseed_app[server]..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/back_ends/oceanseed_app[server]"

echo "  Installing oceanfarm_app..."
uv pip install --python "$PYTHON_BIN" -e "$LIB_ROOT/back_ends/oceanfarm_app"

# Step 4: Build oceanhub_app venv
echo ""
echo "[4/6] Building oceanhub_app venv..."
bash "$LIB_ROOT/back_ends/oceanhub_app/launch_scripts/linux/build_venv.sh"

echo "Local packages installed!"

# Step 5: Build oceandata_gui venv
echo ""
echo "========================================"
echo " Building OceanData GUI venv"
echo "========================================"
echo ""

bash "$LIB_ROOT/front_ends/oceandata_gui/scripts/setup_env.sh"

# Step 6: Verify installation
echo ""
echo "[6/6] Verifying installation..."

PACKAGES="oceancap oceanutil oceandata oceanseed oceanquant oceanfarm oceanseed_app oceanfarm_app"
for pkg in $PACKAGES; do
    if "$PYTHON_BIN" -c "import $pkg" 2>/dev/null; then
        echo "  [PASS] $pkg"
    else
        echo "  [FAIL] $pkg"
    fi
done

echo ""
echo "========================================"
echo " Backend Build Complete!"
echo "========================================"
echo ""
echo "Python executable: $PYTHON_BIN"
echo ""
echo "Start the backend with:"
echo "  \"$PYTHON_BIN\" -m oceanseed_app.cli --port 7007"
echo ""
