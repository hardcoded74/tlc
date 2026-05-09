#!/usr/bin/env bash
# Wrapper for TLC LoRA training on Intel Arc B570.
#
# Activates the existing Selene Arc venv (already has torch+xpu,
# transformers, peft, trl installed and tested). Clears device-selector
# env. Requires HF_TOKEN with the gemma-4-e4b-it license accepted.
#
# Usage:
#   export HF_TOKEN=<token>
#   bash training/run_train_arc.sh hunter --dry-run
#   bash training/run_train_arc.sh hunter
#   bash training/run_train_arc.sh christine

set -eo pipefail
# NOT -u — oneAPI setvars.sh references unbound OCL_ICD_FILENAMES.

PERSONA="${1:-}"
if [[ "$PERSONA" != "hunter" && "$PERSONA" != "christine" ]]; then
  echo "usage: $0 hunter|christine [--dry-run] [...other train_arc.py args]" >&2
  exit 1
fi
shift

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SELENE_VENV="/opt/selene/training/.venv_arc"

if [[ ! -d "$SELENE_VENV" ]]; then
  echo "Selene Arc venv missing at $SELENE_VENV" >&2
  echo "Set SELENE_VENV to the right path or create one with torch+xpu, transformers, peft, trl." >&2
  exit 1
fi

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "HF_TOKEN not set." >&2
  echo "  1. Accept the Gemma 4 E4B license at:" >&2
  echo "     https://huggingface.co/google/gemma-4-e4b-it" >&2
  echo "  2. Create a Read token at https://huggingface.co/settings/tokens" >&2
  echo "  3. export HF_TOKEN=<token>" >&2
  exit 1
fi

unset ONEAPI_DEVICE_SELECTOR

source "$SELENE_VENV/bin/activate"

exec python "$SCRIPT_DIR/train_arc.py" --persona "$PERSONA" "$@"
