#!/usr/bin/env bash
# Upraví pg_dump z cloud Supabase (PG 17) pro import do self-hosted Supabase (PG 15).
#
#   ./supabase/scripts/fix-pg17-dump-for-pg15.sh export/hut-builder-public-data.sql
# Vytvoří: export/hut-builder-public-data-pg15.sql

set -euo pipefail

IN="${1:?Chybí vstupní .sql soubor}"
OUT="${2:-${IN%.sql}-pg15.sql}"

sed \
  -e '/^\\restrict/d' \
  -e '/^\\unrestrict/d' \
  -e '/^SET transaction_timeout/d' \
  -e '/^ALTER TABLE.*DISABLE TRIGGER/d' \
  -e '/^ALTER TABLE.*ENABLE TRIGGER/d' \
  "$IN" > "$OUT"

echo "Hotovo: $OUT ($(wc -l < "$OUT") řádků)"
echo "Import: ./supabase/scripts/import-hut-data-selfhosted.sh $OUT /volume1/docker/supabase-project"
