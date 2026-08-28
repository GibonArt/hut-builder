#!/usr/bin/env bash
# Export dat HUT Builder z cloud Supabase (supabase.com) přes pg_dump v Dockeru.
#
# CLOUD_URI: export/cloud.env nebo proměnná prostředí (viz export-cloud.env.example).
# Na NAS bez IPv6 routy skript vynutí IPv4 (--add-host).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXPORT_DIR="${EXPORT_DIR:-$REPO_DIR/export}"
CLOUD_URI="${CLOUD_URI:-}"
ENV_FILE="${EXPORT_ENV_FILE:-$REPO_DIR/export/cloud.env}"

if [[ -z "$CLOUD_URI" && -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "$ENV_FILE"
  set +a
fi

if [[ -z "$CLOUD_URI" ]]; then
  echo "Chyba: nastav CLOUD_URI v export/cloud.env — viz export-cloud.env.example" >&2
  exit 1
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
  if [[ -n "$ip" ]]; then
    printf '%s' "$ip"
  fi
}

docker_pg_dump() {
  local out_file="$1"
  shift
  local -a docker_args=(--rm -v "$EXPORT_DIR:/out")
  local host ipv4

  if host="$(extract_pg_host "$CLOUD_URI")"; then
    ipv4="$(resolve_ipv4 "$host")"
    if [[ -n "$ipv4" ]]; then
      echo "→ Připojení přes IPv4: $host → $ipv4 (NAS/Docker často nemá IPv6)" >&2
      docker_args+=(--add-host="${host}:${ipv4}")
    else
      echo "→ Varování: nepodařilo se vyřešit IPv4 pro $host — zkouším vypnout IPv6 v kontejneru" >&2
      docker_args+=(--sysctl net.ipv6.conf.all.disable_ipv6=1)
    fi
  fi

  docker run "${docker_args[@]}" postgres:17 \
    pg_dump "$CLOUD_URI" "$@" -f "/out/$(basename "$out_file")"
}

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
