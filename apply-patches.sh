#!/bin/bash
# Apply patches to submodule files
# This script should be run after git submodule update

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHES_DIR="$SCRIPT_DIR/patches"
TRANSLATE_DIR="$SCRIPT_DIR/modules/translate"
TRANSLATORS_DIR="$SCRIPT_DIR/modules/translators"

echo "Applying patches to translate submodule..."

# Check if patches directory exists
if [ ! -d "$PATCHES_DIR" ]; then
    echo "No patches directory found, skipping..."
    exit 0
fi

cd "$TRANSLATE_DIR"
# Apply identity patch, term patch
if [ -f "$PATCHES_DIR/identity.patch" ]; then
    echo "Applying identity patch..."
    git apply --check "$PATCHES_DIR/identity.patch" 2>/dev/null && git apply "$PATCHES_DIR/identity.patch" || echo "Identity term fix patch already applied or failed"
fi
if [ -f "$PATCHES_DIR/term.patch" ]; then
    echo "Applying term patch..."
    git apply --check "$PATCHES_DIR/term.patch" 2>/dev/null && git apply "$PATCHES_DIR/term.patch" || echo "Term patch already applied or failed"
fi

cd "$TRANSLATORS_DIR"
# Apply doi date format patch
if [ -f "$PATCHES_DIR/doi-date-format.patch" ]; then
    echo "Applying DOI date format patch..."
    git apply --check "$PATCHES_DIR/doi-date-format.patch" 2>/dev/null && git apply "$PATCHES_DIR/doi-date-format.patch" || echo "DOI date format patch already applied or failed"
fi

echo "Patches applied successfully!"
