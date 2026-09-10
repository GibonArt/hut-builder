#!/bin/sh
# Ověření počtu kombinací v Supabase po importu (stejné .env jako import).
# Použití: ./03-over-kombinace.sh [--sezona=nhl26|nhl27]
set -e
DIR="$(dirname "$0")"
"$DIR/_docker-tsx.sh" scripts/over-kombinace-v-db.ts "$@"
