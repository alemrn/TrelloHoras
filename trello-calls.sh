#!/usr/bin/env bash
# Script de ejemplo con las CURLs / peticiones para Trello (bash)
# Uso: export VITE_TRELLO_KEY=... VITE_TRELLO_TOKEN=... && ./trello-calls.sh
# También puedes pasar key/token como primeros argumentos: ./trello-calls.sh KEY TOKEN

set -euo pipefail

KEY=${1:-${API_KEY:-}}
TOKEN=${2:-${TOKEN:-}}

if [[ -z "$KEY" || -z "$TOKEN" ]]; then
  echo "Faltan credenciales. Exporta VITE_TRELLO_KEY y VITE_TRELLO_TOKEN o pásalas como argumentos."
  echo "Ejemplo: VITE_TRELLO_KEY=xxx VITE_TRELLO_TOKEN=yyy ./trello-calls.sh"
  exit 1
fi

SHORT="SHORTLINK"      # ejemplo: abc123xy
CARD_ID="CARD_ID"      # id de la tarjeta (si ya lo conoces)
BOARD_ID="BOARD_ID"    # id del tablero
CHECKLIST_ID="CHECKLIST_ID"
HOURS="1.5"
USER="mi-nick"
DATE=$(date +%F)

echo "Usando KEY=$KEY TOKEN=(redacted)"

# 1) Obtener tarjeta por shortLink (incluye checklists)
echo "\n1) GET card by shortLink"
curl -sS "https://api.trello.com/1/cards/${SHORT}?fields=idBoard,name,shortLink&checklists=all&key=${KEY}&token=${TOKEN}" | jq .

# 2) Obtener nombre del tablero (verificar 'seguimiento')
echo "\n2) GET board name"
curl -sS "https://api.trello.com/1/boards/${BOARD_ID}?fields=name&key=${KEY}&token=${TOKEN}" | jq .

# 3) Listar checklists de la tarjeta
echo "\n3) GET card checklists"
curl -sS "https://api.trello.com/1/cards/${CARD_ID}/checklists?key=${KEY}&token=${TOKEN}" | jq .

# 4) Crear checklist 'Horas invertidas' si no existe (POST)
echo "\n4) POST create checklist (Horas invertidas)"
curl -sS -X POST "https://api.trello.com/1/checklists?key=${KEY}&token=${TOKEN}" \
  --data-urlencode "idCard=${CARD_ID}" \
  --data-urlencode "name=Horas invertidas" | jq .

# 5) Añadir item al checklist (formato: "{hours}h — {user} — {YYYY-MM-DD}")
ITEM_TEXT="${HOURS}h — ${USER} — ${DATE}"
echo "\n5) POST add checklist item (text: ${ITEM_TEXT})"
curl -sS -X POST "https://api.trello.com/1/checklists/${CHECKLIST_ID}/checkItems?key=${KEY}&token=${TOKEN}" \
  --data-urlencode "name=${ITEM_TEXT}" | jq .

# Nota: reemplaza SHORTLINK, CARD_ID, BOARD_ID y CHECKLIST_ID por valores reales antes de ejecutar.
# Requiere 'jq' para formatear JSON en la salida; si no quieres usar jq, elimina las tuberías '| jq .' en los curl.
