#!/bin/sh
# Aktualizace běžící aplikace (volitelně před importem)
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "→ git pull" >&2
git pull origin main

echo "→ docker compose build" >&2
docker compose build

echo "→ docker compose up -d" >&2
docker compose up -d

echo "Hotovo — aplikace běží." >&2
