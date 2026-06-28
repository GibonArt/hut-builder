#!/bin/sh
# Ověření počtu kombinací v Supabase po importu (stejné .env jako import).
set -e
DIR="$(dirname "$0")"
"$DIR/_docker-tsx.sh" scripts/over-kombinace-v-db.ts "$@"
