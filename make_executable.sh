#!/bin/bash
# Make all shell scripts executable
# Usage: chmod +x make_executable.sh && ./make_executable.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Making all .sh files executable..."

# Scripts in main directory
chmod +x "$SCRIPT_DIR"/*.sh

# Scripts in build subdirectory
if [ -d "$SCRIPT_DIR/build" ]; then
    chmod +x "$SCRIPT_DIR/build"/*.sh
fi

echo ""
echo "Done. The following scripts are now executable:"
echo ""
echo "=== scripts/ ==="
ls -la "$SCRIPT_DIR"/*.sh
echo ""
echo "=== scripts/build/ ==="
ls -la "$SCRIPT_DIR/build"/*.sh 2>/dev/null || echo "(no .sh files in build/)"
