#!/usr/bin/env bash
# Aplikuje schéma HUT Builder do self-hosted Supabase (Docker na NAS).
# Sdílený stack: /volume1/docker/supabase-project (stejný jako hut-turnaj).
#
# Jen schéma HUT (bez mazání hut-turnaj tabulek):
#   ./supabase/scripts/migrate-selfhosted.sh /volume1/docker/supabase-project
#
# Čistý start HUT tabulek (smaže jen HUT Builder data + schéma, pak znovu vytvoří):
#   ./supabase/scripts/migrate-selfhosted.sh --reset /volume1/docker/supabase-project

set -euo pipefail

RESET=0
SUPABASE_PROJECT_ARG=""
REPO_DIR=""

for arg in "$@"; do
  case "$arg" in
    --reset)
      RESET=1
      ;;
    *)
      if [[ -z "$SUPABASE_PROJECT_ARG" ]]; then
        SUPABASE_PROJECT_ARG="$arg"
      else
        REPO_DIR="$arg"
      fi
      ;;
  esac
done

SUPABASE_PROJECT_DIR="${SUPABASE_PROJECT_ARG:?Chybí cesta k supabase-project, např. /volume1/docker/supabase-project}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

resolve_compose_dir() {
  local dir="$1"
  if [[ -f "$dir/docker-compose.yml" ]]; then
    printf '%s' "$dir"
    return 0
  fi
  if [[ "$dir" == /volume/* ]]; then
    local alt="/volume1${dir#/volume}"
    if [[ -f "$alt/docker-compose.yml" ]]; then
      echo "Poznámka: používám $alt (místo $dir)" >&2
      printf '%s' "$alt"
      return 0
    fi
  fi
  return 1
}

if ! SUPABASE_PROJECT_DIR="$(resolve_compose_dir "$SUPABASE_PROJECT_DIR")"; then
  echo "Chyba: v zadaném adresáři není docker-compose.yml: $SUPABASE_PROJECT_ARG" >&2
  exit 1
fi

# shellcheck source=lib/db-psql.sh
source "$SCRIPT_DIR/lib/db-psql.sh"

run_sql() {
  local file="$1"
  echo ""
  echo "==> $(basename "$file")"
  run_supabase_psql "$SUPABASE_PROJECT_DIR" < "$file"
}

cd "$SUPABASE_PROJECT_DIR"

DB_USER="$(resolve_supabase_db_user "$SUPABASE_PROJECT_DIR")"
echo "Supabase: $SUPABASE_PROJECT_DIR"
echo "HUT Builder SQL: $REPO_DIR/supabase"
echo "DB uživatel: $DB_USER"

if [[ "$RESET" -eq 1 ]]; then
  echo ""
  echo "Režim: reset — mažu jen tabulky HUT Builder v public"
  run_sql "$REPO_DIR/supabase/scripts/drop-hut-builder-schema.sql"
fi

SQL_FILES=(
  cards_setup.sql
  cards_migrate_na_jmeno.sql
  cards_pozice_rk_na_pk.sql
  cards_prodano.sql
  # cards_ea_katalog.sql — zastaralé (placeholder UUID); místo toho ea_hraci_napoveda.sql
  cards_typ_karty_kanonicky.sql
  ea_hraci_napoveda.sql
  ea_hraci_napoveda_x_factors.sql
  ea_hraci_napoveda_migrate_jmeno.sql
  ea_ratings_setup.sql
  bonus_kombinace_nastaveni.sql
  bonus_kombinace_global.sql
  migrate_bonus_typ_sal_ap_to_plat_bs.sql
  hut_typy_karet_dynamic.sql
  hut_typy_karet_dynamic_extend.sql
  cards_duplikat_obsah_rpc.sql
  cards_najdi_obnova.sql
  cards_katalog_kopie_rpc.sql
  napoveda_jmena_z_cards_rpc.sql
  admin_prehled_uzivatelu_karet.sql
  data_api_grants_doplneni.sql
  fix_selfhosted_hut_grants.sql
)

for sql in "${SQL_FILES[@]}"; do
  file="$REPO_DIR/supabase/$sql"
  if [[ ! -f "$file" ]]; then
    echo "Chyba: chybí $file" >&2
    exit 1
  fi
  run_sql "$file"
done

echo ""
echo "Hotovo. Ověř v Supabase Studio → Table Editor: cards, hut_typy_karet_dynamic, bonus_kombinace_global."
echo "Další krok: export z cloudu + import dat — viz docs/MIGRACE-CLOUD-NA-SELFHOSTED.md"
