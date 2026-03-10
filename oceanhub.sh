#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/../lib/back_ends/oceanhub_app/launch_scripts/linux/oceanhub_app.sh" "$SCRIPT_DIR/configs/hub_config.toml"
