#!/usr/bin/env bash
# =============================================================================
# build_frontends.sh
# Build Node.js frontends (oceanreact library and oceanwave_dash Electron app)
# Uses npm for package management
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/../.."

echo ""
echo "========================================"
echo " Building Node.js Frontends"
echo "========================================"
echo "Root: $ROOT"
echo ""

# Check if node and npm are installed
if ! command -v node &> /dev/null; then
    echo "ERROR: node is not installed or not in PATH"
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed or not in PATH"
    echo "Please install npm with Node.js"
    exit 1
fi

# Step 1: Build oceanreact library (required by oceanwave_dash)
echo ""
echo "----------------------------------------"
echo "Step 1: Building oceanreact Library"
echo "----------------------------------------"

cd "$ROOT/lib/front_ends/oceanreact"

echo "Installing dependencies..."
npm install

echo "Building oceanreact library..."
npm run build

echo "Verifying dist folder exists..."
if [ ! -d "dist" ]; then
    echo "ERROR: oceanreact dist folder not created"
    exit 1
fi

echo "oceanreact build complete!"

# Step 2: Build oceanwave_dash Electron app
echo ""
echo "----------------------------------------"
echo "Step 2: Building oceanwave_dash Electron App"
echo "----------------------------------------"

cd "$ROOT/lib/front_ends/oceanwave_dash"

echo "Installing root dependencies..."
npm install

echo "Installing frontend dependencies..."
npm run install:frontend

echo "Installing local oceanreact dependency..."
npm run install:oceanreact-local

echo "Building frontend..."
npm run build:frontend

echo "Verifying frontend dist folder exists..."
if [ ! -d "frontend/dist" ]; then
    echo "ERROR: oceanwave_dash frontend dist folder not created"
    exit 1
fi

echo "oceanwave_dash build complete!"

echo ""
echo "========================================"
echo " All Frontends Built Successfully!"
echo "========================================"
echo ""
