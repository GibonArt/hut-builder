#!/bin/sh
# Aktualizace běžící aplikace (volitelně před importem)
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "→ git pull" >&2
git pull origin main

SHA="$(git rev-parse --short HEAD)"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export NEXT_PUBLIC_APP_GIT_SHA="$SHA"
export NEXT_PUBLIC_APP_BUILT_AT="$BUILT_AT"
# Dockerfile bere SHA i z tohoto souboru (když sudo ztratí env)
printf '%s\n' "$SHA" > .build-git-sha
echo "→ build $SHA ($BUILT_AT)" >&2

echo "→ docker compose build" >&2
docker compose build

echo "→ docker compose up -d" >&2
docker compose up -d

echo "Hotovo — aplikace běží (build $SHA)." >&2
echo "Ověř: curl -s https://hut.gibonart.cz/api/version" >&2
