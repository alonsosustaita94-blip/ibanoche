#!/usr/bin/env bash
# (Re)inicia el sitio y el CRM en el puerto 3000. Se ejecuta al iniciar el Codespace.
cd "$(dirname "$0")/.."
# Detiene una instancia anterior (el proceso de Next.js se llama next-server).
pkill -f next-server 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1
[ -d .next ] || npm run build
nohup npm start -- -p 3000 -H 0.0.0.0 > /tmp/ibanoche-crm.log 2>&1 &
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000/; then
    echo "IBANOCHE listo en el puerto 3000 (sitio en /, CRM en /crm)."
    exit 0
  fi
  sleep 1
done
echo "El servidor no respondió. Revisa el registro: tail -50 /tmp/ibanoche-crm.log"
exit 1
