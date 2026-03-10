#!/bin/bash
# Show status of main branch in all OceanWave v1 repositories

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "========================================"
echo "Git Status - All Repositories (main branch)"
echo "========================================"
echo ""

REPOS="lib/jsonldb lib/oceancap lib/oceandata lib/oceanquant lib/oceanseed lib/oceanshed lib/oceanutil lib/oceanfarm lib/back_ends/oceanseed_app lib/back_ends/oceanfarm_app lib/back_ends/oceanhub_app lib/front_ends/oceanwave_dash lib/front_ends/oceanreact lib/front_ends/oceandata_gui lib/front_ends/oceanpyqt lib/front_ends/oceanapp lib/cli/oceandata-cli lib/cli/oceanlab-cli hubs/data_configs hubs/signal_samples scripts"

for r in $REPOS; do
    if [ -d "$ROOT/$r/.git" ]; then
        cd "$ROOT/$r"

        # Checkout main branch first
        git checkout main >/dev/null 2>&1

        echo "[$r]"
        git status --short
        echo ""
    else
        echo "[$r] - NOT A GIT REPO"
        echo ""
    fi
done

cd "$SCRIPT_DIR"
