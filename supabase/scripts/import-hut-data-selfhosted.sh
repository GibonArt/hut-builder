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
echo "DB uživatel: $DB_USER"

echo "Mažu existující data HUT Builder v public…"
run_supabase_psql "$SUPABASE_PROJECT_DIR" < "$REPO_DIR/supabase/scripts/truncate-hut-public-data.sql"

{
  echo "SET session_replication_role = replica;"
  cat "$SQL_FILE"
  echo "SET session_replication_role = DEFAULT;"
} | run_supabase_psql "$SUPABASE_PROJECT_DIR"

echo ""
echo "Import hotovo. Ověř: SELECT count(*) FROM public.cards;"
