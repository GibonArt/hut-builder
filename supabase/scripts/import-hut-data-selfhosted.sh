#!/usr/bin/env bash
# Import public dat HUT Builder do lokálního Supabase (PG 15).
#
#   ./supabase/scripts/import-hut-data-selfhosted.sh \
#     export/hut-builder-public-data-pg15.sql \
#     /volume1/docker/supabase-project

set -euo pipefail

SQL_FILE="${1:?Chybí cesta k .sql souboru}"
SUPABASE_PROJECT_DIR="${2:-/volume1/docker/supabase-project}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=lib/filter-pg17-dump.sh
source "$SCRIPT_DIR/lib/filter-pg17-dump.sh"

if [[ ! -f "$SQL_FILE" && -f "$REPO_DIR/$SQL_FILE" ]]; then
  SQL_FILE="$REPO_DIR/$SQL_FILE"
fi
if [[ -f "$SQL_FILE" && "$SQL_FILE" != /* ]]; then
  SQL_FILE="$(cd "$(dirname "$SQL_FILE")" && pwd)/$(basename "$SQL_FILE")"
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Chyba: soubor neexistuje: $SQL_FILE" >&2
  exit 1
fi

if [[ ! -f "$SUPABASE_PROJECT_DIR/docker-compose.yml" ]]; then
  echo "Chyba: chybí docker-compose.yml v $SUPABASE_PROJECT_DIR" >&2
  exit 1
fi

cd "$SUPABASE_PROJECT_DIR"

# shellcheck source=lib/db-psql.sh
source "$SCRIPT_DIR/lib/db-psql.sh"
DB_USER="$(resolve_supabase_db_user "$SUPABASE_PROJECT_DIR")"
DB_CID="$(docker compose ps -q db)"

if [[ -z "$DB_CID" ]]; then
  echo "Chyba: kontejner db neběží (docker compose ps)." >&2
  exit 1
fi

echo "DB uživatel: $DB_USER"

echo "Mažu existující data HUT Builder v public…"
run_supabase_psql "$SUPABASE_PROJECT_DIR" < "$REPO_DIR/supabase/scripts/truncate-hut-public-data.sql"

IMPORT_TMP="$(mktemp /tmp/hut-builder-import.XXXXXX.sql)"
trap 'rm -f "$IMPORT_TMP"' EXIT

{
  echo "SET session_replication_role = replica;"
  filter_pg17_dump_for_pg15 < "$SQL_FILE"
  echo "SET session_replication_role = DEFAULT;"
} > "$IMPORT_TMP"

echo "Importuji dump ($(wc -c < "$IMPORT_TMP" | tr -d ' ') B) přes psql -f v kontejneru…"
docker cp "$IMPORT_TMP" "${DB_CID}:/tmp/hut-builder-import.sql"
docker compose exec -T db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
  -f /tmp/hut-builder-import.sql
docker compose exec -T db rm -f /tmp/hut-builder-import.sql

echo ""
echo "Import hotovo. Ověř: SELECT count(*) FROM public.cards;"
