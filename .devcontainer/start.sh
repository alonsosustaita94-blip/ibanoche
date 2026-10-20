#!/usr/bin/env bash
# Arranca el CRM en el puerto 3000 cada vez que se inicia el Codespace.
cd "$(dirname "$0")/.."
[ -d .next ] || npm run build
nohup npm start -- -p 3000 > /tmp/ibanoche-crm.log 2>&1 &
echo "IBANOCHE iniciando en el puerto 3000 (sitio en /, CRM en /crm) (registro: /tmp/ibanoche-crm.log)"
