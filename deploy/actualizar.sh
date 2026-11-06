#!/usr/bin/env bash
# Trae la última versión del repositorio y reconstruye los contenedores sin perder datos.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
