#!/bin/bash
# Prueba end-to-end del sistema de QR, sin depender de copiar/pegar a mano
# (el token QR dura solo 25 segundos).
#
# Uso: ./test_scan.sh <device_id> <device_api_key>

set -e

DEVICE_ID="$1"
DEVICE_API_KEY="$2"
BASE_URL="http://localhost:8000/api/v1"
EMAIL="agus@gmail.com"
PASSWORD="agusjuliiciii"

if [ -z "$DEVICE_ID" ] || [ -z "$DEVICE_API_KEY" ]; then
  echo "Uso: ./test_scan.sh <device_id> <device_api_key>"
  exit 1
fi

echo "1. Login como estudiante..."
ACCESS_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "2. Generando token QR..."
QR_TOKEN=$(curl -s -X POST "$BASE_URL/qr/token" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "3. Enviando el escaneo al dispositivo..."
curl -s -X POST "$BASE_URL/devices/scan" \
  -H "X-Device-Id: $DEVICE_ID" \
  -H "X-Device-Api-Key: $DEVICE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$QR_TOKEN\"}" \
  | python3 -m json.tool
