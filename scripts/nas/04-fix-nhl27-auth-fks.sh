#!/usr/bin/env bash
# Drop FK cards_user_id_fkey na skutečném NHL27 Postgresu.
#
# DŮLEŽITÉ: `docker compose exec db` v supabase-nhl27 dřív sahal na špatný
# Postgres (port 5433 / bez FK). Správný kontejner je supabase-nhl27-db (port 5434),
# kde FK je: REFERENCES users(id) — ne auth.users.
#
# Usage:
#   ./scripts/nas/04-fix-nhl27-auth-fks.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$REPO_DIR/supabase/fix_cards_user_id_bez_fk_auth.sql"
DB_USER="${DB_USER:-supabase_admin}"
DB_NAME="${DB_NAME:-postgres}"

# Preferuj pojmenované DB kontejnery (spolehlivější než compose exec).
DB_CONTAINERS=(
  "${NHL27_DB_CONTAINER:-supabase-nhl27-db}"
  "supabase-db"
)

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Chybí $SQL_FILE — nejdřív git pull." >&2
  exit 1
fi

run_on_container() {
  local ctn="$1"
  if ! sudo docker inspect "$ctn" >/dev/null 2>&1; then
    echo "Přeskakuji (kontejner neběží): $ctn"
    return 0
  fi

  echo "========================================"
  echo "Opravuji kontejner: $ctn"
  echo "========================================"

  sudo docker exec -i "$ctn" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "select current_database() as db, current_setting('port') as port;"

  echo "--- FK na cards PŘED ---"
  sudo docker exec -i "$ctn" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.cards'::regclass and contype = 'f';"

  # Natvrdo drop podle jména + cokoliv na users/auth.users
  sudo docker exec -i "$ctn" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'cards'
      and c.contype = 'f'
  loop
    execute format('alter table public.cards drop constraint %I', r.conname);
    raise notice 'Dropped cards.%', r.conname;
  end loop;
end $$;

alter table public.cards drop constraint if exists cards_user_id_fkey;
alter table public.bonus_kombinace_global drop constraint if exists bonus_kombinace_global_updated_by_fkey;
alter table public.bonus_kombinace_nastaveni drop constraint if exists bonus_kombinace_nastaveni_user_id_fkey;

notify pgrst, 'reload schema';
SQL

  echo "--- FK na cards PO (musí být 0 rows) ---"
  sudo docker exec -i "$ctn" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.cards'::regclass and contype = 'f';"

  echo ""
}

echo "Repo SQL (reference): $SQL_FILE"
echo ""

for ctn in "${DB_CONTAINERS[@]}"; do
  run_on_container "$ctn"
done

echo "Hotovo. Na supabase-nhl27-db musí být PO 0 FK. Pak ulož kartu (bez rebuildu)."
