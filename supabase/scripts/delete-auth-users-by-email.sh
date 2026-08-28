#!/usr/bin/env bash
# Smaže vybrané auth účty podle seznamu e-mailů (jeden e-mail na řádek).
#
# ⚠️  Sdílený Supabase s hut-turnaj — smazaní se nepřihlásí ani do turnaje.
#
#   ./supabase/scripts/delete-auth-users-by-email.sh emails-ke-smazani.txt
#   ./supabase/scripts/delete-auth-users-by-email.sh --dry-run emails-ke-smazani.txt
#   ./supabase/scripts/delete-auth-users-by-email.sh --yes emails-ke-smazani.txt
#
# Soubor emails-ke-smazani.txt (necommituj — zůstane lokálně na NAS):
#   ruby-23@seznam.cz
#   lukas.kozela@gmail.com
#
# gibonart@gmail.com se nikdy nesmaže (chráněný admin).

set -euo pipefail

DRY_RUN=0
SKIP_CONFIRM=0
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --yes) SKIP_CONFIRM=1 ;;
    *)
      echo "Neznámý přepínač: $1" >&2
      exit 1
      ;;
  esac
  shift
done

EMAILS_FILE="${1:?Chybí soubor s e-maily (jeden na řádek)}"
SUPABASE_PROJECT_DIR="${2:-/volume1/docker/supabase-project}"
PROTECTED_EMAIL="gibonart@gmail.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

case "$EMAILS_FILE" in
  /*) ;;
  *) EMAILS_FILE="$REPO_DIR/$EMAILS_FILE" ;;
esac

if [[ ! -f "$EMAILS_FILE" ]]; then
  echo "Chyba: soubor neexistuje: $EMAILS_FILE" >&2
  exit 1
fi

# shellcheck source=lib/db-psql.sh
source "$SCRIPT_DIR/lib/db-psql.sh"

EMAILS=()
while IFS= read -r line; do
  line="$(echo "$line" | sed 's/#.*//' | tr -d '\r' | xargs | tr '[:upper:]' '[:lower:]')"
  [[ -n "$line" ]] && EMAILS+=("$line")
done < "$EMAILS_FILE"

# uniq (bez mapfile — kompatibilita se starším bash)
if [[ "${#EMAILS[@]}" -gt 0 ]]; then
  SORTED="$(printf '%s\n' "${EMAILS[@]}" | sort -u)"
  EMAILS=()
  while IFS= read -r line; do
    [[ -n "$line" ]] && EMAILS+=("$line")
  done <<< "$SORTED"
fi

if [[ "${#EMAILS[@]}" -eq 0 ]]; then
  echo "Chyba: v souboru nejsou žádné e-maily." >&2
  exit 1
fi

FILTERED=()
for e in "${EMAILS[@]}"; do
  e="$(echo "$e" | xargs)"
  [[ -z "$e" ]] && continue
  if [[ "$e" == "$(echo "$PROTECTED_EMAIL" | tr '[:upper:]' '[:lower:]')" ]]; then
    echo "Přeskočeno (chráněný admin): $e" >&2
    continue
  fi
  if [[ ! "$e" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]]; then
    echo "Chyba: neplatný e-mail: $e" >&2
    exit 1
  fi
  FILTERED+=("$e")
done

if [[ "${#FILTERED[@]}" -eq 0 ]]; then
  echo "Nic ke smazání (po vyfiltrování admina)." >&2
  exit 0
fi

echo "=== E-maily ke smazání (${#FILTERED[@]}) ==="
printf '  %s\n' "${FILTERED[@]}"

{
  echo "CREATE TEMP TABLE _delete_emails (email text primary key);"
  echo "COPY _delete_emails (email) FROM stdin;"
  printf '%s\n' "${FILTERED[@]}"
  echo "\\."
  echo "SELECT u.id, u.email, u.created_at"
  echo "FROM auth.users u"
  echo "INNER JOIN _delete_emails d ON lower(trim(u.email)) = d.email"
  echo "ORDER BY u.email;"
} | run_supabase_psql "$SUPABASE_PROJECT_DIR"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo ""
  echo "Dry-run — nic se nesmazalo. Spusť znovu bez --dry-run."
  exit 0
fi

echo ""
if [[ "$SKIP_CONFIRM" -eq 1 ]]; then
  CONFIRM="ano"
else
  read -r -p "Opravdu smazat tyto účty? [ano/ne] " CONFIRM
fi
if [[ "$CONFIRM" != "ano" ]]; then
  echo "Zrušeno."
  exit 0
fi

{
  echo "CREATE TEMP TABLE _delete_emails (email text primary key);"
  echo "COPY _delete_emails (email) FROM stdin;"
  printf '%s\n' "${FILTERED[@]}"
  echo "\\."
  cat "$SCRIPT_DIR/delete-auth-users-by-email.sql"
} | run_supabase_psql "$SUPABASE_PROJECT_DIR"

echo ""
echo "Hotovo."
