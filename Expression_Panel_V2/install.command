#!/usr/bin/env bash
# macOS double-clickable launcher for install.sh
cd "$(dirname "$0")" || exit 1
bash ./install.sh "$@"
