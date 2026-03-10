#!/usr/bin/env bash
# =============================================================================
# build_all.sh
# Master build script - builds Python backend, Node.js frontends, CLI tools,
# and verifies the installation
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/../.."
VENV_PATH="$ROOT/lib/front_ends/oceanwave_dash/venv-linux"
PYTHON_BIN="$VENV_PATH/bin/python"

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Darwin*) OS_TYPE="macos" ;;
    Linux*)  OS_TYPE="linux" ;;
    *)       OS_TYPE="unknown" ;;
esac

echo ""
echo "========================================"
echo " OceanWave v1 - Full Build ($OS_TYPE)"
echo "========================================"
echo ""

# Record start time
START_TIME=$(date +%s)

# Function to install missing tools
install_tool() {
    local tool=$1
    echo ""
    echo "Attempting to install $tool..."

    case "$tool" in
        uv)
            curl -LsSf https://astral.sh/uv/install.sh | sh || return 1
            export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
            return 0
            ;;
        node|npm)
            if [ "$OS_TYPE" = "macos" ]; then
                if command -v brew &> /dev/null; then
                    brew install node || return 1
                    return 0
                else
                    echo "ERROR: Homebrew not found. Install from https://brew.sh/ then run: brew install node"
                    return 1
                fi
            else
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || return 1
                sudo apt-get install -y nodejs || return 1
                return 0
            fi
            ;;
        go)
            if [ "$OS_TYPE" = "macos" ]; then
                if command -v brew &> /dev/null; then
                    brew install go || return 1
                    return 0
                else
                    echo "ERROR: Homebrew not found. Install from https://brew.sh/ then run: brew install go"
                    return 1
                fi
            else
                sudo apt-get update || return 1
                sudo apt-get install -y golang-go || return 1
                return 0
            fi
            ;;
        bun)
            curl -fsSL https://bun.sh/install | bash || return 1
            export PATH="$HOME/.bun/bin:$PATH"
            return 0
            ;;
        cargo)
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y || return 1
            export PATH="$HOME/.cargo/bin:$PATH"
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Pre-flight checks with auto-install
echo "----------------------------------------"
echo "Pre-flight Checks"
echo "----------------------------------------"

TOOLS="uv node npm go bun"
MISSING=0

for tool in $TOOLS; do
    if command -v $tool &> /dev/null; then
        echo "[OK] $tool"
    else
        echo "[MISSING] $tool - attempting install..."
        if install_tool $tool; then
            # Re-check after install
            if command -v $tool &> /dev/null; then
                echo "[INSTALLED] $tool"
            else
                echo "[FAILED] $tool - could not install"
                MISSING=$((MISSING + 1))
            fi
        else
            MISSING=$((MISSING + 1))
        fi
    fi
done

if [ $MISSING -gt 0 ]; then
    echo ""
    echo "ERROR: $MISSING tool(s) could not be installed. Please install manually:"
    command -v uv &> /dev/null || echo "  uv:   https://docs.astral.sh/uv/"
    command -v node &> /dev/null || echo "  node: https://nodejs.org/"
    command -v npm &> /dev/null || echo "  npm:  (comes with Node.js)"
    command -v go &> /dev/null || echo "  go:   https://go.dev/"
    command -v bun &> /dev/null || echo "  bun:  https://bun.sh/"
    exit 1
fi

echo ""
echo "All pre-flight checks passed!"
echo ""

# Step 1: Build Python backend
echo "========================================"
echo "Step 1/4: Building Python Backend"
echo "========================================"
echo ""

bash "$SCRIPT_DIR/build_backends.sh"

echo ""

# Step 2: Build Node.js frontends
echo "========================================"
echo "Step 2/4: Building Node.js Frontends"
echo "========================================"
echo ""

bash "$SCRIPT_DIR/build_frontends.sh"

echo ""

# Step 3: Build CLI tools
echo "========================================"
echo "Step 3/4: Building CLI Tools"
echo "========================================"
echo ""

bash "$SCRIPT_DIR/build_cli.sh"

echo ""

# Step 4: Verify installation
echo "========================================"
echo "Step 4/4: Verifying Installation"
echo "========================================"
echo ""

PASS=0
FAIL=0

# Check Python venv (oceanwave_dash)
if [ -d "$VENV_PATH" ]; then
    echo "[PASS] oceanwave_dash venv-linux exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceanwave_dash venv-linux missing"
    FAIL=$((FAIL + 1))
fi

# Check Python venv (oceandata_gui)
if [ -d "$ROOT/lib/front_ends/oceandata_gui/venv-linux" ]; then
    echo "[PASS] oceandata_gui venv-linux exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceandata_gui venv-linux missing"
    FAIL=$((FAIL + 1))
fi

# Check Python packages
PACKAGES="jsonldb oceancap oceanutil oceandata oceanseed oceanquant oceanfarm oceanseed_app oceanfarm_app"
for pkg in $PACKAGES; do
    if "$PYTHON_BIN" -c "import $pkg" 2>/dev/null; then
        echo "[PASS] $pkg"
        PASS=$((PASS + 1))
    else
        echo "[FAIL] $pkg import failed"
        FAIL=$((FAIL + 1))
    fi
done

# Check frontend builds
if [ -d "$ROOT/lib/front_ends/oceanreact/dist" ]; then
    echo "[PASS] oceanreact dist exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceanreact dist missing"
    FAIL=$((FAIL + 1))
fi

if [ -d "$ROOT/lib/front_ends/oceanwave_dash/frontend/dist" ]; then
    echo "[PASS] oceanwave_dash frontend dist exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceanwave_dash frontend dist missing"
    FAIL=$((FAIL + 1))
fi

if [ -d "$ROOT/lib/front_ends/oceanwave_dash/node_modules" ]; then
    echo "[PASS] oceanwave_dash node_modules exists"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceanwave_dash node_modules missing"
    FAIL=$((FAIL + 1))
fi

# Check CLI binaries
if [ -f "$ROOT/bin/linux/oceandata" ]; then
    echo "[PASS] oceandata"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceandata missing"
    FAIL=$((FAIL + 1))
fi

if [ -f "$ROOT/bin/linux/oceanlab" ]; then
    echo "[PASS] oceanlab"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceanlab missing"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "Verification: $PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
    echo ""
    echo "WARNING: Some verification checks failed"
fi

# Calculate elapsed time
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo "========================================"
echo " Build Completed!"
echo "========================================"
echo ""
echo "Elapsed time: ${MINUTES}m ${SECONDS}s"
echo ""
echo "To start the application:"
echo "  cd $ROOT/lib/front_ends/oceanwave_dash"
echo "  npm run dev"
echo ""
