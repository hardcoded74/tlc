#!/usr/bin/env bash
# Merge a TLC LoRA adapter into Gemma 4 E4B base, then convert + quantize
# to a Q5_K_M GGUF for llama.cpp / Ollama deployment.
#
# Run on Sam's box where llama.cpp is built (../llama.cpp/...).
# Usage:
#   training/merge_and_quantize.sh hunter
#   training/merge_and_quantize.sh christine
#
# Inputs:
#   $1 = persona ("hunter" | "christine")
#   $TRAINING_OUT_DIR (default: ./training/out)  — where the LoRA adapter lives
#                                                  e.g. $TRAINING_OUT_DIR/lora-hunter/
#   $LLAMACPP_DIR (default: /home/sam/llama.cpp) — local llama.cpp build
#   $MODELS_DIR   (default: /home/sam/models)    — where the final GGUF lands
#
# Outputs:
#   $MODELS_DIR/gemma-4-e4b-tlc-<persona>-Q5_K_M.gguf
#
# After this you can point the worker at the new model:
#   GEMMA_LOCAL_MODEL=tlc-<persona>  (alias set in your llama-server launch)

set -euo pipefail

PERSONA="${1:-}"
if [[ "$PERSONA" != "hunter" && "$PERSONA" != "christine" ]]; then
  echo "usage: $0 hunter|christine" >&2
  exit 1
fi

TRAINING_OUT_DIR="${TRAINING_OUT_DIR:-./training/out}"
LLAMACPP_DIR="${LLAMACPP_DIR:-/home/sam/llama.cpp}"
MODELS_DIR="${MODELS_DIR:-/home/sam/models}"
BASE_MODEL="${BASE_MODEL:-google/gemma-4-e4b-it}"

ADAPTER_DIR="$TRAINING_OUT_DIR/lora-$PERSONA"
MERGED_DIR="$TRAINING_OUT_DIR/merged-$PERSONA"
FINAL_GGUF="$MODELS_DIR/gemma-4-e4b-tlc-$PERSONA-Q5_K_M.gguf"

echo "=== TLC LoRA → GGUF pipeline (persona: $PERSONA) ==="
echo "adapter:  $ADAPTER_DIR"
echo "base:     $BASE_MODEL"
echo "merged:   $MERGED_DIR"
echo "final:    $FINAL_GGUF"
echo

if [[ ! -d "$ADAPTER_DIR" ]]; then
  echo "✗ adapter not found at $ADAPTER_DIR" >&2
  exit 1
fi
if [[ ! -d "$LLAMACPP_DIR" ]]; then
  echo "✗ llama.cpp not found at $LLAMACPP_DIR (set LLAMACPP_DIR)" >&2
  exit 1
fi

mkdir -p "$MERGED_DIR" "$MODELS_DIR"

# ── 1. Merge LoRA into base via PEFT ──────────────────────────────────
echo "[1/3] merging LoRA adapter into base..."
python - <<PYEOF
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

BASE = "$BASE_MODEL"
ADAPTER = "$ADAPTER_DIR"
OUT = "$MERGED_DIR"

print(f"loading base: {BASE}")
tok = AutoTokenizer.from_pretrained(BASE)
base = AutoModelForCausalLM.from_pretrained(
    BASE,
    torch_dtype=torch.bfloat16,
    device_map="cpu",  # CPU merge — slower but predictable, no XPU/CUDA dependency
    low_cpu_mem_usage=True,
)

print(f"loading adapter: {ADAPTER}")
peft = PeftModel.from_pretrained(base, ADAPTER)

print("merging...")
merged = peft.merge_and_unload()
merged.save_pretrained(OUT, safe_serialization=True)
tok.save_pretrained(OUT)
print(f"merged → {OUT}")
PYEOF

# ── 2. Convert to GGUF (BF16 first, then quantize) ────────────────────
BF16_GGUF="$MERGED_DIR/$PERSONA-bf16.gguf"
echo "[2/3] HF → GGUF (bf16)..."
python "$LLAMACPP_DIR/convert_hf_to_gguf.py" \
  "$MERGED_DIR" \
  --outfile "$BF16_GGUF" \
  --outtype bf16

# ── 3. Quantize to Q5_K_M for deployment ──────────────────────────────
echo "[3/3] quantize Q5_K_M..."
"$LLAMACPP_DIR/build-vulkan/bin/llama-quantize" \
  "$BF16_GGUF" \
  "$FINAL_GGUF" \
  Q5_K_M

# Cleanup the bf16 intermediate (it's 8GB and we've got the quantized one)
rm -f "$BF16_GGUF"

echo
echo "=== done ==="
ls -lh "$FINAL_GGUF"
echo
echo "Launch llama-server with this model:"
echo "  $LLAMACPP_DIR/build-vulkan/bin/llama-server \\"
echo "    --model $FINAL_GGUF \\"
echo "    --alias tlc-$PERSONA \\"
echo "    --host 127.0.0.1 --port 8090 \\"
echo "    --gpu-layers 999 --ctx-size 8192 \\"
echo "    --jinja --flash-attn on --parallel 1"
