#!/bin/sh
# Spustí příkaz v Node 22 kontejneru nad kořenem repa (pro Synology bez lokálního Node).
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Chybí $ROOT/.env — zkopíruj z .env.example a doplň Supabase." >&2
  exit 1
fi

if ! grep -q 'SUPABASE_SERVICE_ROLE_KEY=.' .env 2>/dev/null; then
  echo "V .env chybí SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role)." >&2
  exit 1
fi

echo "→ Docker Node: $*" >&2
docker run --rm \
  --env-file "$ROOT/.env" \
  -v "$ROOT:/app" \
  -w /app \
  node:22-alpine \
  sh -c "npm ci && npx tsx $*"
