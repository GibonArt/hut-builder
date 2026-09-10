#!/bin/sh
# Krok 1/2 — typy karet z Combo Finderu → Supabase (hut_typy_karet_dynamic)
# Použití: ./01-sync-typy-karet.sh [--sezona=nhl26|nhl27]
set -e
DIR="$(dirname "$0")"
"$DIR/_docker-tsx.sh" scripts/sync-typy-karet-do-supabase.ts "$@"
