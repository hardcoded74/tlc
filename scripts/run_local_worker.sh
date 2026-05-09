#!/usr/bin/env bash
# Run the TLC worker pointed at the local LoRA-tuned llama-server.
#
# Prereqs:
#   1. Run scripts/run_local_llama.sh in another terminal first.
#   2. .env.local has DATABASE_URL pointing at the prod Neon database
#      (so the worker picks up the same lessons the live Vercel site
#      writes).
#
# Usage:
#   bash scripts/run_local_worker.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# Read DATABASE_URL out of .env.local without exporting the whole file.
DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not found in .env.local" >&2
  exit 1
fi

export DATABASE_URL
export GEMMA_BACKEND=local
export GEMMA_LOCAL_URL=http://127.0.0.1:8091
export GEMMA_LOCAL_MODEL=tlc
# Adapter indexes match the order in scripts/run_local_llama.sh:
#   --lora <hunter>     → id 0
#   --lora <christine>  → id 1
export GEMMA_LOCAL_PERSONA_LORA='{"hunter":0,"christine":1}'

echo "worker → $GEMMA_LOCAL_URL with LoRA hot-swap (hunter=0, christine=1)"
exec npx tsx scripts/worker.ts
