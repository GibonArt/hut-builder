#!/usr/bin/env bash
# Drop FK cards/bonus → auth.users na Postgresu za NHL27.
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
  NHL27_URL="$(grep -E '^[[:space:]]*SUPABASE_NHL27_URL=' "$HUT_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  if [[ -z "$NHL27_URL" ]]; then
    NHL27_URL="$(grep -E '^[[:space:]]*NEXT_PUBLIC_SUPABASE_NHL27_URL=' "$HUT_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs || true)"
  fi
fi
echo "SUPABASE_NHL27_URL / NEXT_PUBLIC: ${NHL27_URL:-"(není v $HUT_DIR/.env)"}"
if [[ "$NHL27_URL" == https://* ]]; then
  echo "Port: 443 (HTTPS — DSM reverse proxy → Kong NHL27)"
elif [[ "$NHL27_URL" == http://* ]]; then
  PORT="$(printf '%s' "$NHL27_URL" | sed -n 's/.*:\([0-9][0-9]*\).*/\1/p' | head -1 || true)"
  echo "Port z URL: ${PORT:-80}"
else
  echo "Port: (neznámý)"
fi
echo ""

echo "=== Docker kontejnery (supabase / kong / db) ==="
# Pozor: `docker ps | head` + pipefail = SIGPIPE → skript dřív padal.
{
  sudo docker ps --format '{{.Names}}\t{{.Ports}}\t{{.Image}}' 2>/dev/null \
    | grep -Ei 'kong|supabase|postgres|8000|8002' \
    || echo "(žádný match — zkus: sudo docker ps)"
} || true
echo ""

run_fix_in_compose() {
  local compose_dir="$1"
  if [[ ! -d "$compose_dir" ]]; then
    echo "Přeskakuji (neexistuje): $compose_dir"
    return 0
  fi
  if [[ ! -f "$compose_dir/docker-compose.yml" && ! -f "$compose_dir/compose.yml" ]]; then
    echo "Přeskakuji (není compose): $compose_dir"
    return 0
  fi

  echo "----------------------------------------"
  echo "Opravuji: $compose_dir"
  echo "----------------------------------------"

  # Najdi službu DB (db / postgres)
  local db_svc=""
  if (cd "$compose_dir" && sudo docker compose ps --services 2>/dev/null | grep -qx 'db'); then
    db_svc="db"
  elif (cd "$compose_dir" && sudo docker compose ps --services 2>/dev/null | grep -qx 'postgres'); then
    db_svc="postgres"
  else
    echo "VAROVÁNÍ: v $compose_dir není služba db/postgres (běží compose?)."
    (cd "$compose_dir" && sudo docker compose ps 2>/dev/null || true)
    echo ""
    return 0
  fi

  local tmp="/tmp/fix_cards_user_id_bez_fk_auth.sql"
  if ! (
    cd "$compose_dir"
    cat "$SQL_FILE" | sudo docker compose exec -T "$db_svc" tee "$tmp" >/dev/null
    sudo docker compose exec -T "$db_svc" \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "select current_database() as db, inet_server_addr() as addr, current_setting('port') as port;"
    echo "--- FK na cards PŘED ---"
    sudo docker compose exec -T "$db_svc" \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.cards'::regclass and contype = 'f';"
    sudo docker compose exec -T "$db_svc" \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -f "$tmp"
    echo "--- FK na cards PO (musí být 0 rows) ---"
    sudo docker compose exec -T "$db_svc" \
      psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
      -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.cards'::regclass and contype = 'f';"
  ); then
    echo "VAROVÁNÍ: oprava v $compose_dir selhala (pokračuji dál)."
  fi
  echo ""
}

if [[ -n "${COMPOSE_DIR:-}" ]]; then
  run_fix_in_compose "$COMPOSE_DIR"
else
  run_fix_in_compose "/volume1/docker/supabase-nhl27"
  run_fix_in_compose "/volume1/docker/supabase-project"
  shopt -s nullglob
  for d in /volume1/docker/supabase*; do
    [[ -d "$d" ]] || continue
    case "$d" in
      */supabase-nhl27|*/supabase-project) continue ;;
    esac
    run_fix_in_compose "$d"
  done
  shopt -u nullglob
fi

echo "Hotovo."
echo "  • HTTPS supabase27.* → DSM proxy → Kong NHL27 → Postgres toho stacku."
echo "  • U stacku, kde bylo cards_user_id_fkey, musí být PO opravě 0 rows."
echo "  • Pak znovu ulož kartu na /nhl27."
