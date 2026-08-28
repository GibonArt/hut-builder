#!/usr/bin/env bash
# Export dat HUT Builder z cloud Supabase (supabase.com) přes pg_dump v Dockeru.
#
# Před spuštěním nastav CLOUD_URI (Direct connection z Dashboard → Database → URI):
#   export CLOUD_URI='postgresql://postgres.[REF]:[HESLO]@db.[REF].supabase.co:5432/postgres'
#
# Na NAS:
#   cd /volume1/docker/hut-builder
#   export CLOUD_URI='...'
#   ./supabase/scripts/export-cloud-data.sh
#
# Výstup: export/hut-builder-public-data.sql (+ volitelně auth)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXPORT_DIR="${EXPORT_DIR:-$REPO_DIR/export}"
CLOUD_URI="${CLOUD_URI:-}"

if [[ -z "$CLOUD_URI" ]]; then
  echo "Chyba: nastav CLOUD_URI (Direct connection z supabase.com → Database)." >&2
  echo "Příklad:" >&2
  echo "  export CLOUD_URI='postgresql://postgres.xxx:heslo@db.xxx.supabase.co:5432/postgres'" >&2
  exit 1
fi

mkdir -p "$EXPORT_DIR"
cd "$EXPORT_DIR"

PUBLIC_OUT="hut-builder-public-data.sql"
AUTH_OUT="hut-builder-auth-data.sql"

echo "→ Export public dat HUT Builder do $EXPORT_DIR/$PUBLIC_OUT"
docker run --rm -v "$EXPORT_DIR:/out" postgres:17 \
  pg_dump "$CLOUD_URI" \
  --schema=public \
  --data-only \
  --no-owner \
  --table=public.cards \
  --table=public.ea_hraci_napoveda \
  --table=public.bonus_kombinace_global \
  --table=public.bonus_kombinace_nastaveni \
  --table=public.hut_typy_karet_dynamic \
  -f "/out/$PUBLIC_OUT"

echo ""
echo "→ Export auth (volitelné — stejné účty jako na cloudu)"
if [[ "${EXPORT_AUTH:-}" == "1" ]]; then
  docker run --rm -v "$EXPORT_DIR:/out" postgres:17 \
    pg_dump "$CLOUD_URI" \
    --schema=auth \
    --data-only \
    --no-owner \
    --table=auth.users \
    --table=auth.identities \
    -f "/out/$AUTH_OUT"
  echo "Auth export: $EXPORT_DIR/$AUTH_OUT"
  echo "Pozn.: při sdíleném supabase-project s hut-turnaj slouč uživatele ručně — viz docs/MIGRACE-CLOUD-NA-SELFHOSTED.md"
else
  echo "Přeskočeno (pro export auth nastav EXPORT_AUTH=1)."
fi

echo ""
echo "Hotovo: $EXPORT_DIR/$PUBLIC_OUT"
echo "Další krok (PG 15 na NAS):"
echo "  $REPO_DIR/supabase/scripts/fix-pg17-dump-for-pg15.sh $EXPORT_DIR/$PUBLIC_OUT"
