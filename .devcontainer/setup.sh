#!/usr/bin/env bash
# Prepara la demo en Codespaces: dependencias, base de datos y datos ficticios.
set -euo pipefail
[ -f .env ] || cp .env.example .env
NODE_ENV=development npm ci
until pg_isready -h localhost -p 5432 -U ibanoche >/dev/null 2>&1 || (echo > /dev/tcp/localhost/5432) >/dev/null 2>&1; do echo "Esperando PostgreSQL…"; sleep 2; done
npx prisma migrate deploy
npm run db:seed
npm run build
