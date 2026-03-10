#!/bin/bash
# Commit all changes on main branch in all OceanWave v1 repositories
# Usage: git_commit_all.sh "Your commit message"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "========================================"
echo "Git Status - All Repositories (main branch)"
echo "========================================"
echo ""

REPOS="lib/jsonldb lib/oceancap lib/oceandata lib/oceanquant lib/oceanseed lib/oceanshed lib/oceanutil lib/oceanfarm lib/back_ends/oceanseed_app lib/back_ends/oceanfarm_app lib/back_ends/oceanhub_app lib/front_ends/oceanwave_dash lib/front_ends/oceanreact lib/front_ends/oceandata_gui lib/front_ends/oceanpyqt lib/front_ends/oceanapp lib/cli/oceandata-cli lib/cli/oceanlab-cli hubs/data_configs hubs/signal_samples scripts"

# Show status for all repos
for r in $REPOS; do
    if [ -d "$ROOT/$r/.git" ]; then
        cd "$ROOT/$r"

        # Checkout main branch first
        git checkout main >/dev/null 2>&1

        # Check if there are any changes
        if git status --short 2>/dev/null | grep -q .; then
            echo "[$r] - HAS CHANGES"
            git status --short
            echo ""
        fi
    fi
done

echo ""
echo "========================================"
echo ""

# Check if commit message was provided as argument
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    read -p "Enter commit message: " COMMIT_MSG
fi

# Validate commit message was provided
if [ -z "$COMMIT_MSG" ]; then
    echo "ERROR: No commit message provided"
    exit 1
fi

echo ""
echo "========================================"
echo "Adding and Committing All Repositories (main branch)"
echo "========================================"
echo ""
echo "Commit message: $COMMIT_MSG"
echo ""

for r in $REPOS; do
    if [ -d "$ROOT/$r/.git" ]; then
        echo ""
        echo "======================================"
        echo "Processing $r"
        echo "======================================"

        cd "$ROOT/$r"

        # Checkout main branch first
        git checkout main >/dev/null 2>&1

        # Add all files
        git add -A

        # Try to commit (will fail if nothing to commit, which is fine)
        if git commit -m "$COMMIT_MSG"; then
            echo "SUCCESS: Committed changes in $r"
        else
            echo "INFO: No changes to commit in $r"
        fi
    fi
done

echo ""
echo "========================================"
echo "Commit Complete!"
echo "========================================"
echo ""
echo "Summary of all repositories:"
echo ""

for r in $REPOS; do
    if [ -d "$ROOT/$r/.git" ]; then
        cd "$ROOT/$r"
        echo "[$r]"
        git log -1 --oneline 2>/dev/null || echo "  No commits yet"
        echo ""
    fi
done

cd "$SCRIPT_DIR"
