#!/usr/bin/env bash
# Launch llama-server with Gemma 4 E4B base + both TLC LoRA adapters.
#
# Hunter at adapter id=0, Christine at id=1, both loaded with
# --lora-init-without-apply so the worker can hot-swap which one is
# active per request via POST /lora-adapters.
#
# Coexists with Sam's selene-llama service (port 8090) — that one runs
# the 26B-A4B with --n-cpu-moe 32 so its GPU footprint is only ~3 GB.
# We add ~5.5 GB on top, total ~8.5 GB on a 10 GB Arc B570 — tight but
# fits. If this crashes with VRAM OOM, drop --gpu-layers from 999 to
# something like 24 (partial offload).
#
# Usage:
#   bash scripts/run_local_llama.sh
#
# Override paths via env if needed:
#   LLAMACPP_DIR=/home/sam/llama.cpp
#   BASE_GGUF=/home/sam/models/gemma-4-E4B-it-Q5_K_M.gguf
#   HUNTER_LORA=/home/sam/models/tlc/tlc-hunter-lora.gguf
#   CHRISTINE_LORA=/home/sam/models/tlc/tlc-christine-lora.gguf
#   PORT=8091

set -euo pipefail

LLAMACPP_DIR="${LLAMACPP_DIR:-/home/sam/llama.cpp}"
BASE_GGUF="${BASE_GGUF:-/home/sam/models/gemma-4-E4B-it-Q5_K_M.gguf}"
HUNTER_LORA="${HUNTER_LORA:-/home/sam/models/tlc/tlc-hunter-lora.gguf}"
CHRISTINE_LORA="${CHRISTINE_LORA:-/home/sam/models/tlc/tlc-christine-lora.gguf}"
PORT="${PORT:-8091}"

for f in "$BASE_GGUF" "$HUNTER_LORA" "$CHRISTINE_LORA"; do
  [[ -f "$f" ]] || { echo "missing: $f" >&2; exit 1; }
done

exec "$LLAMACPP_DIR/build-vulkan/bin/llama-server" \
  --model "$BASE_GGUF" \
  --lora "$HUNTER_LORA" \
  --lora "$CHRISTINE_LORA" \
  --lora-init-without-apply \
  --alias tlc \
  --host 127.0.0.1 --port "$PORT" \
  --ctx-size 8192 \
  --gpu-layers 999 \
  --jinja --flash-attn on --parallel 1 \
  --reasoning off
