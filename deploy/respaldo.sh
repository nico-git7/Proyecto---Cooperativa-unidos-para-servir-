#!/usr/bin/env bash
# Respaldo de la base de datos y de los archivos adjuntos. Conserva los últimos 14 días.
#   DESTINO=/ruta/respaldos ./deploy/respaldo.sh
set -euo pipefail

cd "$(dirname "$0")/.."
DESTINO="${DESTINO:-/var/backups/policia-tucuman}"
DIAS="${DIAS:-14}"
FECHA="$(date +%Y%m%d-%H%M)"
mkdir -p "$DESTINO"

set -a; source .env; set +a

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-policia}" -d "${POSTGRES_DB:-policia_tucuman}" -Fc > "$DESTINO/base-$FECHA.dump"
docker compose exec -T api tar czf - -C /data/adjuntos . > "$DESTINO/adjuntos-$FECHA.tar.gz"

find "$DESTINO" -maxdepth 1 -type f \( -name 'base-*.dump' -o -name 'adjuntos-*.tar.gz' \) -mtime +"$DIAS" -delete

echo "$(date '+%F %T') respaldo generado en $DESTINO ($(du -sh "$DESTINO/base-$FECHA.dump" | cut -f1) base)"
