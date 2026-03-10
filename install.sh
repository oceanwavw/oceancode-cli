#!/bin/bash
# Clone all OceanWave v1 repositories (except scripts, which is cloned by setup.sh)
# Usage: install.sh [base_url]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "========================================"
echo "OceanWave v1 Install - Clone All Repos"
echo "========================================"
echo ""

# Check if base URL was provided as argument
if [ -n "$1" ]; then
    BASE_URL="$1"
else
    read -p "Enter your GitHub base URL (e.g., http://10.88.90.147:3000/oceanwave): " BASE_URL
fi

# Validate base URL was provided
if [ -z "$BASE_URL" ]; then
    echo "ERROR: No base URL provided"
    exit 1
fi

# Remove trailing slash if present
BASE_URL="${BASE_URL%/}"

echo "Using base URL: $BASE_URL"
echo ""
read -p "Press Enter to continue..."

# Create directories if they don't exist
mkdir -p "$ROOT/lib"
mkdir -p "$ROOT/lib/front_ends"
mkdir -p "$ROOT/lib/back_ends"
mkdir -p "$ROOT/lib/cli"
mkdir -p "$ROOT/hubs"

# Initialize counters and tracking lists
CLONED=0
SKIPPED=0
FAILED=0
SKIPPED_LIST=""
FAILED_LIST=""

echo ""
echo "========================================"
echo "Cloning Repositories"
echo "========================================"
echo ""

# Function to clone a single repo
clone_repo() {
    local REPO_NAME="$1"
    local TARGET_PATH="$2"
    local DISPLAY_NAME="$3"

    echo ""
    echo "======================================"
    echo "Cloning $REPO_NAME to $DISPLAY_NAME"
    echo "======================================"

    if [ -d "$TARGET_PATH" ]; then
        echo "Directory already exists. Skipping..."
        ((SKIPPED++)) || true
        SKIPPED_LIST="$SKIPPED_LIST $REPO_NAME"
    else
        if git clone "$BASE_URL/$REPO_NAME.git" "$TARGET_PATH"; then
            echo "SUCCESS: Cloned $REPO_NAME"
            ((CLONED++)) || true
        else
            echo "ERROR: Failed to clone $REPO_NAME"
            ((FAILED++)) || true
            FAILED_LIST="$FAILED_LIST $REPO_NAME"
        fi
    fi
}

# Function to print status for a single repo
print_status() {
    local PS_REPO="$1"
    local PS_DISPLAY="$2"
    local PS_PATH="$3"

    if [[ "$SKIPPED_LIST" == *" $PS_REPO"* ]]; then
        if [ -d "$PS_PATH/.git" ]; then
            echo "[SKIPPED] $PS_DISPLAY"
        else
            echo "[SKIPPED - no .git] $PS_DISPLAY"
        fi
        return
    fi

    if [[ "$FAILED_LIST" == *" $PS_REPO"* ]]; then
        echo "[FAILED] $PS_DISPLAY"
        return
    fi

    echo "[CLONED] $PS_DISPLAY"
}

# Clone configs repo
clone_repo configs "$ROOT/configs" configs

# Clone core library repos
for r in oceancap oceandata oceanquant oceanseed oceanshed oceanutil oceanfarm jsonldb; do
    clone_repo "$r" "$ROOT/lib/$r" "lib/$r"
done

# Clone backend repos
for r in oceanseed_app oceanfarm_app oceanhub_app; do
    clone_repo "$r" "$ROOT/lib/back_ends/$r" "lib/back_ends/$r"
done

# Clone frontend repos
for r in oceanwave_dash oceanreact; do
    clone_repo "$r" "$ROOT/lib/front_ends/$r" "lib/front_ends/$r"
done

# Clone legacy frontend repos
for r in oceandata_gui oceanpyqt oceanapp; do
    clone_repo "$r" "$ROOT/lib/front_ends/$r" "lib/front_ends/$r"
done

# Clone CLI tool repos
for r in oceandata-cli oceanlab-cli; do
    clone_repo "$r" "$ROOT/lib/cli/$r" "lib/cli/$r"
done

# Clone hub repos
for r in data_configs signal_samples; do
    clone_repo "$r" "$ROOT/hubs/$r" "hubs/$r"
done

# Create hub_config.toml from example if it doesn't exist
if [ ! -f "$SCRIPT_DIR/configs/hub_config.toml" ]; then
    if [ -f "$SCRIPT_DIR/configs/hub_config.example.toml" ]; then
        echo ""
        echo "Creating configs/hub_config.toml from example..."

        # Resolve ROOT to an absolute path
        ABS_ROOT="$(cd "$ROOT" && pwd)"

        # Copy and replace <YOUR_PATH> with the resolved root path
        sed "s|<YOUR_PATH>|$ABS_ROOT|g" "$SCRIPT_DIR/configs/hub_config.example.toml" > "$SCRIPT_DIR/configs/hub_config.toml"
        echo "Created configs/hub_config.toml with root: $ABS_ROOT"
    else
        echo "WARNING: configs/hub_config.example.toml not found, skipping config creation."
    fi
else
    echo "configs/hub_config.toml already exists. Skipping..."
fi

echo ""
echo "========================================"
echo "Install Complete!"
echo "========================================"
echo ""
echo "Summary: $CLONED cloned, $SKIPPED skipped, $FAILED failed"
echo ""

# Print summary for configs
print_status configs configs "$ROOT/configs"

# Print summary for core libs
for r in oceancap oceandata oceanquant oceanseed oceanshed oceanutil oceanfarm jsonldb; do
    print_status "$r" "lib/$r" "$ROOT/lib/$r"
done

# Print summary for backends
for r in oceanseed_app oceanfarm_app oceanhub_app; do
    print_status "$r" "lib/back_ends/$r" "$ROOT/lib/back_ends/$r"
done

# Print summary for frontends
for r in oceanwave_dash oceanreact; do
    print_status "$r" "lib/front_ends/$r" "$ROOT/lib/front_ends/$r"
done

# Print summary for legacy frontends
for r in oceandata_gui oceanpyqt oceanapp; do
    print_status "$r" "lib/front_ends/$r" "$ROOT/lib/front_ends/$r"
done

# Print summary for CLI tools
for r in oceandata-cli oceanlab-cli; do
    print_status "$r" "lib/cli/$r" "$ROOT/lib/cli/$r"
done

# Print summary for hubs
for r in data_configs signal_samples; do
    print_status "$r" "hubs/$r" "$ROOT/hubs/$r"
done

echo ""
echo "Next steps:"
echo "1. Run build_all.sh to build backends and frontends"
echo "2. Run setup_gita.sh to register repos with gita"
echo ""
