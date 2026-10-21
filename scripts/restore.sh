#!/usr/bin/env bash
# Restaura un respaldo creado con backup.sh en la base indicada.
# ¡Reemplaza los datos existentes! Uso: DATABASE_URL=... ./scripts/restore.sh archivo.dump
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL}"
FILE="${1:?Indica el archivo .dump}"
read -r -p "Esto reemplazará los datos de la base destino. Escribe RESTAURAR para continuar: " ok
[ "$ok" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
pg_restore --clean --if-exists --no-owner --dbname="${DATABASE_URL%%\?*}" "$FILE"
echo "Restauración terminada."
