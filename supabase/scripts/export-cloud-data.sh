#!/usr/bin/env bash
# Export dat HUT Builder z cloud Supabase (supabase.com) přes pg_dump v Dockeru.
#
# CLOUD_URI: export/cloud.env (viz export-cloud.env.example).
# Na NAS bez IPv6: použij Session pooler (port 5432), NE Direct db.*.supabase.co.

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
  ref="$(extract_project_ref "$CLOUD_URI" 2>/dev/null || true)"
  echo "" >&2
  echo "Chyba: $host nemá IPv4 (jen IPv6). Synology/NAS se na Direct connection nedostane." >&2
  echo "" >&2
  echo "Řešení — v export/cloud.env použij Session pooler z Supabase Dashboard:" >&2
  echo "  Project Settings → Database → Connection string → Session pooler (port 5432)" >&2
  echo "" >&2
  if [[ -n "$ref" ]]; then
    echo "  CLOUD_URI=postgresql://postgres.${ref}:HESLO@aws-0-TVUJ_REGION.pooler.supabase.com:5432/postgres" >&2
  else
    echo "  CLOUD_URI=postgresql://postgres.REF:HESLO@aws-0-REGION.pooler.supabase.com:5432/postgres" >&2
  fi
  echo "" >&2
  echo "REGION (např. eu-central-1) zkopíruj z Dashboardu — u každého projektu může být jiný." >&2
  echo "Alternativa: export na Macu (má IPv6) a scp export/*.sql na NAS." >&2
  exit 1
}

docker_pg_dump() {
  local out_file="$1"
  shift
  local -a docker_args=(--rm -v "$EXPORT_DIR:/out")
  local host ipv4

  if host="$(extract_pg_host "$CLOUD_URI")"; then
    case "$host" in
      db.*.supabase.co)
        ipv4="$(resolve_ipv4 "$host")"
        if [[ -z "$ipv4" ]]; then
          fail_direct_ipv6_only "$host"
        fi
        echo "→ Připojení přes IPv4: $host → $ipv4" >&2
        docker_args+=(--add-host="${host}:${ipv4}")
        ;;
      *)
        ipv4="$(resolve_ipv4 "$host")"
        if [[ -n "$ipv4" ]]; then
          echo "→ Pooler/host $host → IPv4 $ipv4" >&2
          docker_args+=(--add-host="${host}:${ipv4}")
        fi
        ;;
    esac
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
