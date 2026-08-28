# shellcheck shell=bash
# Společné psql volání pro self-hosted Supabase na NAS.
# postgres často není superuser — supabase_admin umí ALTER/DROP cizích objektů.

resolve_supabase_db_user() {
  local project_dir="$1"
  if [[ -n "${SUPABASE_DB_USER:-}" ]]; then
    printf '%s' "$SUPABASE_DB_USER"
    return 0
  fi
  if (
    cd "$project_dir"
    docker compose exec -T db psql -U supabase_admin -d postgres -tAc "select 1" >/dev/null 2>&1
  ); then
    printf '%s' "supabase_admin"
  else
    printf '%s' "postgres"
  fi
}

run_supabase_psql() {
  local project_dir="$1"
  local db_user
  db_user="$(resolve_supabase_db_user "$project_dir")"
  (
    cd "$project_dir"
    docker compose exec -T db psql -U "$db_user" -d postgres -v ON_ERROR_STOP=1
  )
}
