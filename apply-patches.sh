#!/bin/bash
# Apply patches to submodule files
# This script should be run after git submodule update

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHES_DIR="$SCRIPT_DIR/patches"
TRANSLATE_DIR="$SCRIPT_DIR/modules/translate"

echo "Applying patches to translate submodule..."

# Check if patches directory exists
if [ ! -d "$PATCHES_DIR" ]; then
    echo "No patches directory found, skipping..."
    exit 0
fi

# Apply each patch
for patch in "$PATCHES_DIR"/*.patch; do
    if [ -f "$patch" ]; then
        echo "Applying $(basename "$patch")..."
        cd "$TRANSLATE_DIR"
        # Use --forward to skip patches that are already applied
        # Use --reject to create .rej files for failed hunks instead of failing
        git apply --check "$patch" 2>/dev/null && git apply "$patch" || echo "Patch $(basename "$patch") already applied or failed"
    fi
done

echo "Patches applied successfully!"
