#!/usr/bin/env bash
# Přemapuje cards.user_id z HUT cloudu na lokální auth.users (stejný e-mail, jiné UUID).
#
#   ./supabase/scripts/remap-cards-user-id-by-email.sh \
#     export/hut-builder-auth-data-pg15.sql \
#     /volume1/docker/supabase-project

set -euo pipefail

AUTH_SQL="${1:?Chybí auth dump z cloudu (hut-builder-auth-data-pg15.sql)}"
SUPABASE_PROJECT_DIR="${2:-/volume1/docker/supabase-project}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Absolutní cesta — po `cd` do supabase-project by relativní cesta nefungovala.
case "$AUTH_SQL" in
  /*) ;;
  *) AUTH_SQL="$REPO_DIR/$AUTH_SQL" ;;
esac

if [[ ! -f "$AUTH_SQL" ]]; then
  echo "Chyba: soubor neexistuje: $AUTH_SQL" >&2
  echo "Export: EXPORT_AUTH=1 v export/cloud.env → export-cloud-data.sh → fix-pg17-dump-for-pg15.sh" >&2
  exit 1
fi

# shellcheck source=lib/db-psql.sh
source "$SCRIPT_DIR/lib/db-psql.sh"

cd "$SUPABASE_PROJECT_DIR"

echo "=== Diagnostika před remapem ==="
run_supabase_psql "$SUPABASE_PROJECT_DIR" < "$REPO_DIR/supabase/scripts/diagnose-cards-user-id.sql"

CLOUD_USERS_TSV="$(mktemp)"
trap 'rm -f "$CLOUD_USERS_TSV"' EXIT

awk '
  /^COPY auth\.users \(/ {
    line = $0
    sub(/^COPY auth\.users \(/, "", line)
    sub(/\) FROM stdin;$/, "", line)
    n = split(line, cols, ", ")
    id_i = email_i = 0
    for (i = 1; i <= n; i++) {
      if (cols[i] == "id") id_i = i
      if (cols[i] == "email") email_i = i
    }
    if (id_i == 0 || email_i == 0) {
      print "Chyba: auth.users dump bez id/email sloupců" > "/dev/stderr"
      exit 1
    }
    incopy = 1
    next
  }
  incopy && /^\\.$/ { incopy = 0; next }
  incopy {
    nf = split($0, f, "\t")
    if (f[id_i] != "" && f[email_i] != "") print f[id_i] "\t" f[email_i]
  }
' "$AUTH_SQL" > "$CLOUD_USERS_TSV"

if [[ ! -s "$CLOUD_USERS_TSV" ]]; then
  echo "Chyba: z auth dumpu se nepodařilo načíst id+e-mail." >&2
  echo "Ruční oprava — viz docs/MIGRACE-CLOUD-NA-SELFHOSTED.md" >&2
  exit 1
fi

echo ""
echo "=== Cloud uživatelé k mapování ($(wc -l < "$CLOUD_USERS_TSV" | tr -d ' ') řádků) ==="
head -5 "$CLOUD_USERS_TSV"

echo ""
echo "=== Remap cards.user_id ==="
{
  echo "DROP TABLE IF EXISTS public._cloud_auth_users;"
  echo "CREATE TABLE public._cloud_auth_users (id uuid primary key, email text);"
  echo "COPY public._cloud_auth_users (id, email) FROM stdin;"
  cat "$CLOUD_USERS_TSV"
  echo "\\."
  cat "$REPO_DIR/supabase/scripts/remap-cards-user-id-by-email.sql"
  echo "DROP TABLE IF EXISTS public._cloud_auth_users;"
} | run_supabase_psql "$SUPABASE_PROJECT_DIR"

echo ""
echo "Hotovo. Obnov stránku Moje karty."
