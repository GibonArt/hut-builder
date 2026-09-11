#!/usr/bin/env bash
# Drop FK cards/bonus → auth.users na DB, kam hut opravdu zapisuje NHL27.
#
# Častá chyba: skript běží na supabase-nhl27, ale SUPABASE_NHL27_URL míří jinam
# (jiný Kong port / starý stack) → appka pořád vidí cards_user_id_fkey.
#
# Usage:
#   ./scripts/nas/04-fix-nhl27-auth-fks.sh
#   COMPOSE_DIR=/volume1/docker/supabase-nhl27 ./scripts/nas/04-fix-nhl27-auth-fks.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$REPO_DIR/supabase/fix_cards_user_id_bez_fk_auth.sql"
HUT_DIR="${HUT_DIR:-/volume1/docker/hut-builder}"
DB_USER="${DB_USER:-supabase_admin}"
DB_NAME="${DB_NAME:-postgres}"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Chybí $SQL_FILE — nejdřív git pull v hut-builder." >&2
  exit 1
fi

echo "=== Hut env (cílový server pro zápis karet) ==="
NHL27_URL=""
if [[ -f "$HUT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  # Načti jen relevantní řádky (bez source celého .env — speciální znaky)
  NHL27_URL="$(grep -E '^[[:space:]]*SUPABASE_NHL27_URL=' "$HUT_DIR/.env" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  if [[ -z "$NHL27_URL" ]]; then
    NHL27_URL="$(grep -E '^[[:space:]]*NEXT_PUBLIC_SUPABASE_NHL27_URL=' "$HUT_DIR/.env" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  fi
  set +a
fi
echo "SUPABASE_NHL27_URL / NEXT_PUBLIC: ${NHL27_URL:-"(není v $HUT_DIR/.env)"}"

PORT=""
if [[ -n "$NHL27_URL" ]]; then
  # http://172.17.0.1:8002 → 8002
  PORT="$(printf '%s' "$NHL27_URL" | sed -n 's/.*:\([0-9][0-9]*\).*/\1/p' | head -1)"
fi
echo "Port z URL: ${PORT:-"(neznámý)"}"
echo ""

echo "=== Docker: kontejnery s Kong / db (hledej port $PORT) ==="
sudo docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Image}}' | head -1
sudo docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Image}}' | grep -Ei 'kong|supabase|postgres|8000|8002' || true
echo ""

run_fix_in_compose() {
  local compose_dir="$1"
  if [[ ! -d "$compose_dir" ]]; then
    echo "Přeskakuji (neexistuje): $compose_dir"
    return 0
  fi
  echo "----------------------------------------"
  echo "Opravuji: $compose_dir"
  echo "----------------------------------------"
  local tmp="/tmp/fix_cards_user_id_bez_fk_auth.sql"
  (
    cd "$compose_dir"
    cat "$SQL_FILE" | sudo docker compose exec -T db tee "$tmp" >/dev/null
    sudo docker compose exec -T db \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "select current_database() as db, inet_server_addr() as addr, current_setting('port') as port;"
    sudo docker compose exec -T db \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.cards'::regclass and contype = 'f';"
    sudo docker compose exec -T db \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -f "$tmp"
    sudo docker compose exec -T db \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.cards'::regclass and contype = 'f';"
  )
  echo ""
}

# Explicitní COMPOSE_DIR má přednost; jinak opravíme typické stacky.
if [[ -n "${COMPOSE_DIR:-}" ]]; then
  run_fix_in_compose "$COMPOSE_DIR"
else
  run_fix_in_compose "/volume1/docker/supabase-nhl27"
  run_fix_in_compose "/volume1/docker/supabase-project"
  # Další kandidáti (když port sedí na jiný compose)
  for d in /volume1/docker/supabase*; do
    [[ -d "$d" ]] || continue
    case "$d" in
      */supabase-nhl27|*/supabase-project) continue ;;
    esac
    run_fix_in_compose "$d"
  done
fi

echo "Hotovo. Zkontroluj výstup:"
echo "  1) URL v hut .env musí odpovídat Kong portu stacku, kde jsi viděl cards_user_id_fkey."
echo "  2) Po dropu musí být SELECT FK na cards prázdný (0 rows)."
echo "  3) Zkus znovu uložit kartu (rebuild hut není potřeba kvůli SQL)."
