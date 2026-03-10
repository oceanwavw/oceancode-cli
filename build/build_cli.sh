#!/usr/bin/env bash
# =============================================================================
# build_cli.sh
# Build CLI tools for Linux: oceandata-cli (Go) and oceanlab-cli (Bun)
# Outputs binaries to /oceanwave/bin/linux/
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/../.."
LIB_ROOT="$ROOT/lib"
BIN_DIR="$ROOT/bin/linux"

echo ""
echo "========================================"
echo " Building CLI Tools (Linux)"
echo "========================================"
echo ""

# Pre-flight checks
if ! command -v go &> /dev/null; then
    echo "ERROR: go not found - install from https://go.dev/"
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo "ERROR: bun not found - install from https://bun.sh/"
    exit 1
fi

# Ensure output directory exists
mkdir -p "$BIN_DIR"

# Step 1: Build oceandata-cli (Go)
echo "----------------------------------------"
echo "Step 1/2: Building oceandata-cli (Go)"
echo "----------------------------------------"
echo ""

cd "$LIB_ROOT/cli/oceandata-cli"

echo "Downloading dependencies..."
go mod download

echo "Building for Linux..."
GOOS=linux GOARCH=amd64 go build -o "$BIN_DIR/oceandata" .

echo "oceandata-cli built!"
echo ""

# Step 2: Build oceanlab-cli (Bun/TypeScript)
echo "----------------------------------------"
echo "Step 2/2: Building oceanlab-cli (Bun)"
echo "----------------------------------------"
echo ""

cd "$LIB_ROOT/cli/oceanlab-cli"

echo "Installing dependencies..."
bun install

echo "Building for Linux..."
bun build src/cli.ts --compile --target=bun-linux-x64 --outfile dist/oceanlab

echo "Copying to bin..."
cp -f dist/oceanlab "$BIN_DIR/oceanlab"

echo "oceanlab-cli built!"

# Verify outputs
echo ""
echo "========================================"
echo " Verifying CLI Builds (Linux)"
echo "========================================"
echo ""

PASS=0
FAIL=0

if [ -f "$BIN_DIR/oceandata" ]; then
    echo "[PASS] oceandata"
    PASS=$((PASS + 1))
else
    echo "[FAIL] oceandata missing"
    FAIL=$((FAIL + 1))
fi

if [ -f "$BIN_DIR/oceanlab" ]; then
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
    echo "WARNING: Some builds failed"
    exit 1
fi

echo ""
echo "========================================"
echo " CLI Tools Built Successfully!"
echo "========================================"
echo ""
