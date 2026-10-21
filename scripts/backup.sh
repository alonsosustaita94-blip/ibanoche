#!/usr/bin/env bash
# Respaldo lógico de la base de datos del CRM (formato custom de pg_dump).
# Uso: DATABASE_URL=... ./scripts/backup.sh [directorio]
# Programar a diario (cron) y copiar los archivos fuera del servidor.
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL}"
DIR="${1:-./backups}"
mkdir -p "$DIR"
FILE="$DIR/ibanoche-crm-$(date +%Y%m%d-%H%M%S).dump"
# Prisma agrega ?schema=public, que pg_dump no acepta.
pg_dump --format=custom --no-owner --dbname="${DATABASE_URL%%\?*}" --file="$FILE"
echo "Respaldo creado: $FILE"
