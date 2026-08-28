#!/usr/bin/env bash
# Export dat HUT Builder z cloud Supabase (supabase.com) přes pg_dump v Dockeru.
#
# Konfigurace: export/cloud.env (viz export-cloud.env.example).
# Heslo s @: CLOUD_HOST + CLOUD_USER + CLOUD_PASSWORD (NE CLOUD_URI).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXPORT_DIR="${EXPORT_DIR:-$REPO_DIR/export}"
CLOUD_URI="${CLOUD_URI:-}"
CLOUD_HOST="${CLOUD_HOST:-}"
CLOUD_USER="${CLOUD_USER:-}"
CLOUD_PASSWORD="${CLOUD_PASSWORD:-}"
CLOUD_PASSWORD_FILE="${CLOUD_PASSWORD_FILE:-}"
CLOUD_PORT="${CLOUD_PORT:-5432}"
CLOUD_DB="${CLOUD_DB:-postgres}"
ENV_FILE="${EXPORT_ENV_FILE:-$REPO_DIR/export/cloud.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "$ENV_FILE"
  set +a
fi

load_password_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Chyba: CLOUD_PASSWORD_FILE neexistuje: $path" >&2
    exit 1
  fi
  CLOUD_PASSWORD="$(tr -d '\r\n' < "$path")"
}

if [[ -n "$CLOUD_PASSWORD_FILE" ]]; then
  case "$CLOUD_PASSWORD_FILE" in
    /*) load_password_file "$CLOUD_PASSWORD_FILE" ;;
    *) load_password_file "$REPO_DIR/$CLOUD_PASSWORD_FILE" ;;
  esac
fi

extract_pg_host() {
  local uri="$1"
  local host
  host="$(printf '%s' "$uri" | sed -n 's|.*@\([^:/]*\).*|\1|p' | head -1)"
  if [[ -n "$host" ]]; then
    printf '%s' "$host"
    return 0
  fi
  return 1
}

extract_project_ref() {
  local uri="$1"
  local ref host
  ref="$(printf '%s' "$uri" | sed -n 's|.*postgres\.\([a-z0-9]*\):.*|\1|p' | head -1)"
  if [[ -n "$ref" ]]; then
    printf '%s' "$ref"
    return 0
  fi
  host="$(extract_pg_host "$uri")"
  case "$host" in
    db.*.supabase.co)
      printf '%s' "${host#db.}" | sed 's/\.supabase\.co$//'
      return 0
      ;;
  esac
  return 1
}

uri_has_at_in_password() {
  local uri="$1"
  local n
  n="$(printf '%s' "$uri" | tr -cd '@' | wc -c | tr -d ' ')"
  [[ "${n:-0}" -gt 1 ]]
}

resolve_connection() {
  if [[ -n "$CLOUD_HOST" && -n "$CLOUD_USER" && -n "$CLOUD_PASSWORD" ]]; then
    if [[ -n "$CLOUD_URI" ]]; then
      echo "→ Používám CLOUD_HOST/USER/PASSWORD (CLOUD_URI ignoruji — @ v hesle rozbíjí URI)" >&2
    fi
    PG_CONN_MODE=flags
    PG_HOST="$CLOUD_HOST"
    PG_USER="$CLOUD_USER"
    PG_PASSWORD="$CLOUD_PASSWORD"
    PG_PORT="$CLOUD_PORT"
    PG_DB="$CLOUD_DB"
    return 0
  fi

  if [[ -n "$CLOUD_URI" ]]; then
    if uri_has_at_in_password "$CLOUD_URI"; then
      echo "Chyba: heslo v CLOUD_URI obsahuje @ — URI to neumí." >&2
      echo "" >&2
      echo "V export/cloud.env smaž CLOUD_URI a použij:" >&2
      echo "  CLOUD_HOST=aws-0-REGION.pooler.supabase.com" >&2
      echo "  CLOUD_USER=postgres.TVUJ_REF" >&2
      echo "  CLOUD_PASSWORD='heslo@s@pec@ial'" >&2
      echo "" >&2
      echo "Nebo heslo do souboru (bez uvozovek):" >&2
      echo "  echo -n 'heslo@s@pec@ial' > export/cloud.password" >&2
      echo "  CLOUD_PASSWORD_FILE=export/cloud.password" >&2
      exit 1
    fi
    PG_CONN_MODE=uri
    PG_URI="$CLOUD_URI"
    PG_HOST="$(extract_pg_host "$CLOUD_URI" || true)"
    return 0
  fi

  echo "Chyba: doplň export/cloud.env — viz export-cloud.env.example" >&2
  exit 1
}

resolve_ipv4() {
  local host="$1"
  local ip=""
  ip="$(getent ahostsv4 "$host" 2>/dev/null | awk '{print $1; exit}')" || true
  if [[ -z "$ip" ]] && command -v dig >/dev/null 2>&1; then
    ip="$(dig +short A "$host" 2>/dev/null | grep -E '^[0-9.]+$' | head -1)" || true
  fi
  if [[ -z "$ip" ]] && command -v nslookup >/dev/null 2>&1; then
    ip="$(nslookup -type=A "$host" 2>/dev/null | awk '/^Address: / { print $2; exit }' | grep -E '^[0-9.]+$')" || true
  fi
  if [[ -z "$ip" ]]; then
    ip="$(docker run --rm postgres:17 getent ahostsv4 "$host" 2>/dev/null | awk '{print $1; exit}')" || true
  fi
  if [[ -n "$ip" ]]; then
    printf '%s' "$ip"
  fi
}

fail_direct_ipv6_only() {
  local host="$1"
  local ref=""
  ref="$(extract_project_ref "${PG_URI:-}" 2>/dev/null || true)"
  if [[ -z "$ref" && -n "${CLOUD_USER:-}" ]]; then
    ref="${CLOUD_USER#postgres.}"
  fi
  echo "" >&2
  echo "Chyba: $host nemá IPv4 (jen IPv6). Synology/NAS se na Direct connection nedostane." >&2
  echo "V export/cloud.env použij Session pooler — viz export-cloud.env.example" >&2
  exit 1
}

write_docker_pgpass_env() {
  local tmp
  tmp="$(mktemp "${TMPDIR:-/tmp}/hut-export-pgpass.XXXXXX")"
  chmod 600 "$tmp"
  printf 'PGPASSWORD=%s\n' "$PG_PASSWORD" > "$tmp"
  printf '%s' "$tmp"
}

docker_pg_dump() {
  local out_file="$1"
  shift
  local -a docker_args=(--rm -v "$EXPORT_DIR:/out")
  local host ipv4 pgpass_env=""

  if [[ -n "${PG_HOST:-}" ]]; then
    case "$PG_HOST" in
      db.*.supabase.co)
        ipv4="$(resolve_ipv4 "$PG_HOST")"
        if [[ -z "$ipv4" ]]; then
          fail_direct_ipv6_only "$PG_HOST"
        fi
        echo "→ Připojení přes IPv4: $PG_HOST → $ipv4" >&2
        docker_args+=(--add-host="${PG_HOST}:${ipv4}")
        ;;
      *)
        ipv4="$(resolve_ipv4 "$PG_HOST")"
        if [[ -n "$ipv4" ]]; then
          echo "→ Pooler/host $PG_HOST → IPv4 $ipv4" >&2
          docker_args+=(--add-host="${PG_HOST}:${ipv4}")
        fi
        ;;
    esac
  fi

  if [[ "$PG_CONN_MODE" == flags ]]; then
    pgpass_env="$(write_docker_pgpass_env)"
    docker_args+=(--env-file "$pgpass_env")
    docker run "${docker_args[@]}" postgres:17 \
      pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" "$@" \
      -f "/out/$(basename "$out_file")"
    rm -f "$pgpass_env"
  else
    docker run "${docker_args[@]}" postgres:17 \
      pg_dump "$PG_URI" "$@" -f "/out/$(basename "$out_file")"
  fi
}

resolve_connection

mkdir -p "$EXPORT_DIR"
cd "$EXPORT_DIR"

PUBLIC_OUT="hut-builder-public-data.sql"
AUTH_OUT="hut-builder-auth-data.sql"

echo "→ Export public dat HUT Builder do $EXPORT_DIR/$PUBLIC_OUT"
docker_pg_dump "$PUBLIC_OUT" \
  --schema=public \
  --data-only \
  --no-owner \
  --table=public.cards \
  --table=public.ea_hraci_napoveda \
  --table=public.bonus_kombinace_global \
  --table=public.bonus_kombinace_nastaveni \
  --table=public.hut_typy_karet_dynamic

echo ""
echo "→ Export auth (volitelné — stejné účty jako na cloudu)"
if [[ "${EXPORT_AUTH:-}" == "1" ]]; then
  docker_pg_dump "$AUTH_OUT" \
    --schema=auth \
    --data-only \
    --no-owner \
    --table=auth.users \
    --table=auth.identities
  echo "Auth export: $EXPORT_DIR/$AUTH_OUT"
else
  echo "Přeskočeno (pro export auth nastav EXPORT_AUTH=1 v cloud.env)."
fi

echo ""
echo "Hotovo: $EXPORT_DIR/$PUBLIC_OUT"
echo "Další krok (PG 15 na NAS):"
echo "  $REPO_DIR/supabase/scripts/fix-pg17-dump-for-pg15.sh $EXPORT_DIR/$PUBLIC_OUT"
