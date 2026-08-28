#!/usr/bin/env bash
# Upraví pg_dump z cloud Supabase (PG 17) pro import do self-hosted Supabase (PG 15).
#
#   ./supabase/scripts/fix-pg17-dump-for-pg15.sh export/hut-builder-public-data.sql
# Vytvoří: export/hut-builder-public-data-pg15.sql

set -euo pipefail

# shellcheck source=lib/filter-pg17-dump.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/filter-pg17-dump.sh
source "$SCRIPT_DIR/lib/filter-pg17-dump.sh"

IN="${1:?Chybí vstupní .sql soubor}"
OUT="${2:-${IN%.sql}-pg15.sql}"

filter_pg17_dump_for_pg15 < "$IN" > "$OUT"

echo "Hotovo: $OUT ($(wc -l < "$OUT") řádků)"
echo "Import: ./supabase/scripts/import-hut-data-selfhosted.sh $OUT /volume1/docker/supabase-project"
