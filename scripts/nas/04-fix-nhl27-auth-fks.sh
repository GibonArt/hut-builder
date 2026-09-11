#!/usr/bin/env bash
# Drop FK cards/bonus → auth.users na NHL27 (sdílené Auth NHL26).
# Bez toho INSERT karty padá: „Nelze uložit — odkazuješ na neexistující údaj.“
#
# Usage:
#   ./scripts/nas/04-fix-nhl27-auth-fks.sh
#   COMPOSE_DIR=/volume1/docker/supabase-nhl27 ./scripts/nas/04-fix-nhl27-auth-fks.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$REPO_DIR/supabase/fix_cards_user_id_bez_fk_auth.sql"
COMPOSE_DIR="${COMPOSE_DIR:-/volume1/docker/supabase-nhl27}"
DB_USER="${DB_USER:-supabase_admin}"
DB_NAME="${DB_NAME:-postgres}"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Chybí $SQL_FILE — nejdřív git pull v hut-builder." >&2
  exit 1
fi
if [[ ! -d "$COMPOSE_DIR" ]]; then
  echo "Chybí compose dir: $COMPOSE_DIR" >&2
  exit 1
fi

echo "Repo SQL: $SQL_FILE"
echo "Compose:  $COMPOSE_DIR"
echo ""

# Zkopíruj SQL do kontejneru (host -f path často uvnitř kontejneru neexistuje)
TMP_IN_CONTAINER="/tmp/fix_cards_user_id_bez_fk_auth.sql"
cd "$COMPOSE_DIR"
# shellcheck disable=SC2002
cat "$SQL_FILE" | sudo docker compose exec -T db tee "$TMP_IN_CONTAINER" >/dev/null

echo "Spouštím psql…"
sudo docker compose exec -T db \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -f "$TMP_IN_CONTAINER"

echo ""
echo "Hotovo. Zkus znovu uložit kartu na /nhl27 (rebuild hut není potřeba)."
