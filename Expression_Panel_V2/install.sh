#!/usr/bin/env bash
# ==============================================================================
# AE Expression Panel - Universal ScriptUI Panels Installer (macOS)
# ==============================================================================
# Installs Expression Panel scripts to Adobe After Effects ScriptUI Panels on macOS.
# Supports interactive menu, direct version argument, or installing to all versions.
#
# Usage:
#   ./install.sh          # Interactive menu
#   ./install.sh 2026     # Install directly to After Effects 2026
#   ./install.sh all      # Install to all detected versions
# ==============================================================================

# Ensure working directory is the script's directory
cd "$(dirname "$0")" || exit 1
SOURCE_DIR="$(pwd)"

SCRIPTS=(
    "Expression_Panel_V2.jsx"
    "List_Jumper.jsx"
    "X Crop.jsx"
    "Anchor_Point_Control.jsx"
    "Sync_PSDs_Timeline.jsx"
    "BatchRendering.jsx"
    "SmartRig.jsx"
)

DETECTED_NAMES=()
DETECTED_PATHS=()
DETECTED_VERS=()

# Scan /Applications for Adobe After Effects installations
for dir in /Applications/Adobe\ After\ Effects\ *; do
    if [ -d "$dir" ]; then
        panels_dir="$dir/Scripts/ScriptUI Panels"
        if [ -d "$panels_dir" ] || [ -d "$dir/Scripts" ]; then
            name=$(basename "$dir")
            ver=$(echo "$name" | sed -E 's/^Adobe After Effects ?//')
            DETECTED_NAMES+=("$name")
            DETECTED_PATHS+=("$panels_dir")
            DETECTED_VERS+=("$ver")
        fi
    fi
done

TARGET_NAMES=()
TARGET_PATHS=()

resolve_choice() {
    local choice="$1"
    choice=$(echo "$choice" | xargs)

    if [ -z "$choice" ]; then
        return 1
    fi

    # Option: All
    if [ "$choice" = "A" ] || [ "$choice" = "a" ] || [ "$choice" = "all" ] || [ "$choice" = "ALL" ]; then
        if [ ${#DETECTED_PATHS[@]} -eq 0 ]; then
            echo "[ERROR] No detected versions available."
            return 1
        fi
        TARGET_NAMES=("${DETECTED_NAMES[@]}")
        TARGET_PATHS=("${DETECTED_PATHS[@]}")
        return 0
    fi

    # Option: Custom
    if [ "$choice" = "C" ] || [ "$choice" = "c" ] || [ "$choice" = "custom" ] || [ "$choice" = "CUSTOM" ]; then
        read -r -p "Enter After Effects year (e.g. 2027) or full folder path: " custom_input
        custom_input=$(echo "$custom_input" | xargs)
        if [ -z "$custom_input" ]; then
            echo "[ERROR] No input specified."
            return 1
        fi
        resolve_custom "$custom_input"
        return $?
    fi

    # Match numeric index (1, 2, 3...)
    if [[ "$choice" =~ ^[0-9]+$ ]]; then
        local idx=$((choice - 1))
        if [ "$idx" -ge 0 ] && [ "$idx" -lt "${#DETECTED_PATHS[@]}" ]; then
            TARGET_NAMES+=("${DETECTED_NAMES[$idx]}")
            TARGET_PATHS+=("${DETECTED_PATHS[$idx]}")
            return 0
        fi
    fi

    # Match year/version name (e.g. 2024, 2026)
    for i in "${!DETECTED_VERS[@]}"; do
        if [ "${DETECTED_VERS[$i]}" = "$choice" ] || [ "${DETECTED_NAMES[$i]}" = "$choice" ]; then
            TARGET_NAMES+=("${DETECTED_NAMES[$i]}")
            TARGET_PATHS+=("${DETECTED_PATHS[$i]}")
            return 0
        fi
    done

    # Check direct year in /Applications
    local app_dir="/Applications/Adobe After Effects $choice"
    if [ -d "$app_dir" ]; then
        TARGET_NAMES+=("Adobe After Effects $choice")
        TARGET_PATHS+=("$app_dir/Scripts/ScriptUI Panels")
        return 0
    fi

    resolve_custom "$choice"
    return $?
}

resolve_custom() {
    local input="$1"
    if [ -d "$input/Scripts/ScriptUI Panels" ]; then
        TARGET_NAMES+=("Custom: $input")
        TARGET_PATHS+=("$input/Scripts/ScriptUI Panels")
        return 0
    elif [ -d "$input" ]; then
        TARGET_NAMES+=("Custom: $input")
        TARGET_PATHS+=("$input")
        return 0
    fi
    local candidate="/Applications/Adobe After Effects $input/Scripts/ScriptUI Panels"
    if [ -d "/Applications/Adobe After Effects $input" ]; then
        TARGET_NAMES+=("Adobe After Effects $input")
        TARGET_PATHS+=("$candidate")
        return 0
    fi

    echo "[ERROR] Target folder not found for: '$input'"
    return 1
}

# CLI Argument or Interactive Menu
CLI_ARG="$1"

if [ -n "$CLI_ARG" ]; then
    if ! resolve_choice "$CLI_ARG"; then
        echo "[ERROR] Could not resolve '$CLI_ARG' to an installed After Effects version."
        exit 1
    fi
else
    while true; do
        clear
        echo "==================================================================="
        echo "          AE Expression Panel - ScriptUI Panels Installer (macOS)"
        echo "==================================================================="
        echo "Source: $SOURCE_DIR"
        echo ""

        if [ ${#DETECTED_NAMES[@]} -gt 0 ]; then
            echo "Detected Adobe After Effects installations:"
            for i in "${!DETECTED_NAMES[@]}"; do
                echo "  [$((i + 1))] ${DETECTED_NAMES[$i]}"
            done
            if [ ${#DETECTED_NAMES[@]} -gt 1 ]; then
                echo "  [A] All detected versions"
            fi
            echo "  [C] Custom version or folder path (e.g. 2027)"
            echo ""
            read -r -p "Select version [1-${#DETECTED_NAMES[@]}, A, C] (Default: 1): " choice
            choice="${choice:-1}"
        else
            echo "No After Effects installations detected automatically in /Applications."
            echo ""
            read -r -p "Enter After Effects year/version (e.g. 2024, 2026): " choice
        fi

        if resolve_choice "$choice"; then
            break
        fi

        echo ""
        read -r -p "Press Enter to try again..."
    done
fi

echo ""
echo "==================================================================="
echo "Target installation(s) selected:"
for i in "${!TARGET_NAMES[@]}"; do
    echo "  - ${TARGET_NAMES[$i]} [${TARGET_PATHS[$i]}]"
done
echo "==================================================================="
echo ""

# Check if administrator privileges are required
NEED_SUDO=0
for dest in "${TARGET_PATHS[@]}"; do
    if [ -e "$dest" ]; then
        if [ ! -w "$dest" ]; then
            NEED_SUDO=1
            break
        fi
    else
        parent=$(dirname "$dest")
        if [ ! -w "$parent" ]; then
            NEED_SUDO=1
            break
        fi
    fi
done

SUDO_CMD=""
if [ "$NEED_SUDO" -eq 1 ]; then
    echo "Administrator privileges required to install to /Applications."
    echo "Please enter your macOS password if prompted by sudo:"
    SUDO_CMD="sudo"
    sudo -v || { echo "[ERROR] Administrator authentication failed."; exit 1; }
fi

# Execute installation
for i in "${!TARGET_PATHS[@]}"; do
    dest="${TARGET_PATHS[$i]}"
    name="${TARGET_NAMES[$i]}"

    echo "-------------------------------------------------------------------"
    echo "Installing to: $name"
    echo "Destination:   $dest"
    echo "-------------------------------------------------------------------"

    if [ ! -d "$dest" ]; then
        echo "Creating directory: $dest"
        $SUDO_CMD mkdir -p "$dest" || { echo "[ERROR] Failed to create $dest"; continue; }
    fi

    echo "Copying scripts..."
    for script in "${SCRIPTS[@]}"; do
        if [ -f "$SOURCE_DIR/$script" ]; then
            $SUDO_CMD rm -f "$dest/$script" 2>/dev/null
            $SUDO_CMD cp "$SOURCE_DIR/$script" "$dest/"
            echo "  [OK] Copied: $script"
        else
            echo "  [SKIP] File not found in source: $script"
        fi
    done
    echo ""
done

echo "==================================================================="
echo "Done - Scripts successfully installed to all selected targets!"
echo "==================================================================="
echo ""

if [ -z "$CLI_ARG" ]; then
    read -r -p "Press Enter to exit..."
fi
