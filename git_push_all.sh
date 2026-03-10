#!/bin/bash
# Push main branch of all OceanWave v1 repositories to specified remote
# Usage: git_push_all.sh [remote_name]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "========================================"
echo "Push All OceanWave v1 Repositories"
echo "========================================"
echo ""

# Check if remote name was provided as argument
if [ -n "$1" ]; then
    REMOTE="$1"
else
    read -p "Enter remote name to push to (e.g., origin): " REMOTE
fi

# Validate remote name was provided
if [ -z "$REMOTE" ]; then
    echo "ERROR: No remote name provided"
    exit 1
fi

echo ""
echo "Using remote: $REMOTE"
echo "Branch: main"
echo ""

REPOS="lib/jsonldb lib/oceancap lib/oceandata lib/oceanquant lib/oceanseed lib/oceanshed lib/oceanutil lib/oceanfarm lib/back_ends/oceanseed_app lib/back_ends/oceanfarm_app lib/back_ends/oceanhub_app lib/front_ends/oceanwave_dash lib/front_ends/oceanreact lib/front_ends/oceandata_gui lib/front_ends/oceanpyqt lib/front_ends/oceanapp lib/cli/oceandata-cli lib/cli/oceanlab-cli hubs/data_configs hubs/signal_samples scripts"

for r in $REPOS; do
    if [ -d "$ROOT/$r/.git" ]; then
        echo ""
        echo "======================================"
        echo "Pushing $r to $REMOTE/main"
        echo "======================================"

        cd "$ROOT/$r"

        # Check if remote exists
        if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
            echo "WARNING: Remote '$REMOTE' not found in $r. Skipping..."
        else
            # Checkout main branch and push to specified remote
            git checkout main >/dev/null 2>&1
            if git push "$REMOTE" main; then
                echo "SUCCESS: Pushed $r to $REMOTE/main"
            else
                echo "ERROR: Failed to push $r to $REMOTE/main"
            fi
        fi
    else
        echo "WARNING: $r is not a git repo. Skipping..."
    fi
done

echo ""
echo "========================================"
echo "Push Complete!"
echo "========================================"
echo ""

cd "$SCRIPT_DIR"
