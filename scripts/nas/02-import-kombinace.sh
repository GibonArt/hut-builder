#!/bin/sh
# Krok 2/2 — kombinace z Hut Builderu → Supabase (bonus_kombinace_global)
# Může běžet desítky minut; NAS může zůstat zapnutý, Mac může spát.
set -e
DIR="$(dirname "$0")"
"$DIR/_docker-tsx.sh" scripts/importuj-hutbuilder-kombinace-do-supabase.ts "$@"
