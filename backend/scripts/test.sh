#!/usr/bin/env bash
set -euo pipefail
: "${API:?Set API=https://xxx.execute-api.eu-west-3.amazonaws.com/prod}"
: "${KEY:?Set KEY=your_api_key}"

echo "[1] JSON canonicalization"
curl -s -X POST "$API/statement" \
 -H "Content-Type: application/json" -H "x-api-key: $KEY" \
 -d '{"apiVersion":"v1","template":"annex4-v1","locale":"en","payload":{"provider":{"version":"1.2.0","name":"ABC"},"purpose":"Hire engineers","system":{"components":["A","B"]}}}' | jq .

echo "[2] PDF via Accept header"
curl -s -X POST "$API/statement" \
 -H "Content-Type: application/json" -H "Accept: application/pdf" -H "x-api-key: $KEY" \
 -d '{"apiVersion":"v1","template":"annex4-v1","locale":"en","payload":{"dev":{"design":"...", "training":"...", "validation":"..."}}}' \
 --output statement.pdf -D headers.txt

echo "Headers:" && cat headers.txt | egrep -i 'HTTP/|Content-Type|Content-Length'
test -s statement.pdf && echo "PDF OK: $(wc -c < statement.pdf) bytes"
