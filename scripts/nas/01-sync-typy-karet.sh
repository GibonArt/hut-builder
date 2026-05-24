#!/bin/sh
# Krok 1/2 — typy karet z Combo Finderu → Supabase (hut_typy_karet_dynamic)
set -e
DIR="$(dirname "$0")"
"$DIR/_docker-tsx.sh" scripts/sync-typy-karet-do-supabase.ts
