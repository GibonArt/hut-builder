#!/bin/sh
# Celý postup na NAS: typy karet + import kombinací (bez prohlížeče).
set -e
DIR="$(dirname "$0")"

echo "=== Krok 1: typy karet ===" >&2
"$DIR/01-sync-typy-karet.sh"

echo "" >&2
echo "=== Krok 2: kombinace z Hut Builderu (dlouhé) ===" >&2
"$DIR/02-import-kombinace.sh"

echo "" >&2
echo "=== Import dokončen ===" >&2
