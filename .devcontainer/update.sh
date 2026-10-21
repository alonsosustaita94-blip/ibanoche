#!/usr/bin/env bash
# Actualiza el Codespace a la última versión de la rama y reinicia el servidor.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
NODE_ENV=development npm ci
npx prisma migrate deploy
npm run db:seed
pkill -f next-server 2>/dev/null || true
rm -rf .next
npm run build
bash .devcontainer/start.sh
