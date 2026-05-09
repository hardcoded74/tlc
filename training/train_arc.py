"""TLC LoRA training on Intel Arc B570 (XPU).

Adapted from /opt/selene/training/local_arc/train.py — same Arc-friendly
recipe (no bitsandbytes / no QLoRA, fp16 base + LoRA, grad checkpointing,
max_seq tuned to TLC's longer assistant outputs).

Usage:
  cd /home/sam/tlc
  source /opt/selene/training/.venv_arc/bin/activate
  export HF_TOKEN=<token with gemma-4-e4b-it license accepted>
  python training/train_arc.py --persona hunter
  python training/train_arc.py --persona christine

  # Smoke test without training:
  python training/train_arc.py --persona hunter --dry-run

VRAM budget on Arc B570 (10 GB):
  - Gemma 4 E4B in fp16 base: ~8 GB
  - LoRA r=16 trainable: ~50 MB
  - Optimizer state (adamw_torch): ~200 MB
  - Activations + gradients at max_seq=2048 + grad-checkpoint: ~1.5 GB
  Total ~9.5 GB — tight but fits. If OOM, drop --max-seq to 1536.
"""

from __future__ import annotations

import os

# Clear inherited ONEAPI_DEVICE_SELECTOR so torch.xpu sees the discrete
# Arc B570 (selene-llama units sometimes pin to integrated UHD).
os.environ.pop("ONEAPI_DEVICE_SELECTOR", None)

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
)
from trl import SFTConfig, SFTTrainer

logger = logging.getLogger("tlc_arc_train")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)

ROOT = Path(__file__).resolve().parent  # /home/sam/tlc/training

# ─── Defaults ─────────────────────────────────────────────────────────
DEFAULT_BASE = "google/gemma-4-e4b-it"
MAX_SEQ_LENGTH = 2048
PER_DEVICE_BATCH = 1
GRAD_ACCUM = 4
EPOCHS = 3
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.03
MAX_GRAD_NORM = 1.0
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
LORA_TARGETS = [
    "q_proj",
    "k_proj",
    "v_proj",
    "o_proj",
    "gate_proj",
    "up_proj",
    "down_proj",
]


class GemmaTextOnlyCollator:
    """Same as Selene's local_arc collator. Gemma chat templates expect
    token_type_ids to exist; the default LM collator doesn't add them.
    Multimodal Gemma needs zeros injected so SFTTrainer's forward
    doesn't crash."""

    def __init__(self, tokenizer, multimodal: bool):
        self.base = DataCollatorForLanguageModeling(
            tokenizer=tokenizer, mlm=False
        )
        self.multimodal = multimodal

    def __call__(self, examples):
        batch = self.base(examples)
        if self.multimodal:
            batch["token_type_ids"] = torch.zeros_like(batch["input_ids"])
        return batch


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--persona",
        choices=["hunter", "christine"],
        required=True,
        help="Which persona's JSONL to train on",
    )
    ap.add_argument(
        "--base",
        default=DEFAULT_BASE,
        help=f"HF base model (default: {DEFAULT_BASE})",
    )
    ap.add_argument(
        "--out",
        default=None,
        help="Adapter output dir (default: training/out/lora-<persona>-<ts>)",
    )
    ap.add_argument(
        "--max-seq",
        type=int,
        default=MAX_SEQ_LENGTH,
        help=f"Max sequence length (default: {MAX_SEQ_LENGTH}). Drop to 1536 if OOM.",
    )
    ap.add_argument(
        "--epochs", type=int, default=EPOCHS, help=f"Epochs (default: {EPOCHS})"
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Load model + dataset, skip training — smoke test",
    )
    return ap.parse_args()


def main():
    args = parse_args()

    dataset_path = ROOT / "data" / f"sft_{args.persona}.jsonl"
    if not dataset_path.exists():
        logger.error("Dataset not found: %s", dataset_path)
        logger.error(
            "Run training/generate_training_data.ts first to populate it."
        )
        sys.exit(1)

    out_dir = (
        Path(args.out)
        if args.out
        else ROOT
        / "out"
        / f"lora-{args.persona}-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )

    logger.info("persona : %s", args.persona)
    logger.info("base    : %s", args.base)
    logger.info("dataset : %s", dataset_path)
    logger.info("output  : %s", out_dir)

    if not torch.xpu.is_available():
        logger.error(
            "No XPU detected. Did you `source /opt/intel/oneapi/setvars.sh`?"
        )
        sys.exit(1)
    for i in range(torch.xpu.device_count()):
        p = torch.xpu.get_device_properties(i)
        logger.info(
            "xpu dev %d: %s  %.1f GB", i, p.name, p.total_memory / 1e9
        )
    device = "xpu:0"

    # ── Tokenizer ──
    logger.info("loading tokenizer from %s", args.base)
    tokenizer = AutoTokenizer.from_pretrained(
        args.base, use_fast=True, trust_remote_code=True
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # ── Dataset ──
    logger.info("loading dataset")
    raw = load_dataset("json", data_files=str(dataset_path), split="train")

    def _norm_roles(ex):
        # Gemma's chat template uses "model" not "assistant".
        for m in ex["messages"]:
            if m.get("role") == "assistant":
                m["role"] = "model"
        return ex

    raw = raw.map(_norm_roles)
    logger.info("samples: %d", len(raw))

    def _render(ex):
        ex["text"] = tokenizer.apply_chat_template(
            ex["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
        return ex

    ds = raw.map(
        _render,
        remove_columns=[c for c in raw.column_names if c != "text"],
    )
    logger.info(
        "rendered sample[0] (300 chars):\n%s", ds[0]["text"][:300]
    )

    # ── Base model in fp16 on XPU ──
    logger.info("loading base model in fp16 onto %s", device)
    model = AutoModelForCausalLM.from_pretrained(
        args.base,
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
        trust_remote_code=True,
        attn_implementation="eager",
    )
    model = model.to(device)
    logger.info(
        "model on %s, %.2f GB used",
        device,
        torch.xpu.memory_allocated(0) / 1e9,
    )
    model.gradient_checkpointing_enable()

    # ── LoRA ──
    lora = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=LORA_TARGETS,
    )
    model = get_peft_model(model, lora)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    logger.info(
        "trainable: %s / %s (%.3f%%)",
        f"{trainable:,}",
        f"{total:,}",
        100 * trainable / total,
    )

    # ── Collator ──
    is_gemma_3x_or_4 = (
        "gemma-3" in args.base.lower() or "gemma-4" in args.base.lower()
    )
    collator = GemmaTextOnlyCollator(tokenizer, multimodal=is_gemma_3x_or_4)

    if args.dry_run:
        logger.info("--dry-run set — environment smoke test passed")
        return

    # ── Training ──
    cfg = SFTConfig(
        output_dir=str(out_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=PER_DEVICE_BATCH,
        gradient_accumulation_steps=GRAD_ACCUM,
        learning_rate=LEARNING_RATE,
        warmup_ratio=WARMUP_RATIO,
        max_grad_norm=MAX_GRAD_NORM,
        lr_scheduler_type="cosine",
        logging_steps=5,
        save_steps=50,
        save_total_limit=2,
        bf16=False,
        fp16=True,
        optim="adamw_torch",
        max_seq_length=args.max_seq,
        packing=False,
        dataset_text_field="text",
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        report_to="none",
        seed=42,
        use_cpu=False,
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=ds,
        args=cfg,
        processing_class=tokenizer,
        data_collator=collator,
    )

    logger.info(
        "starting training — epochs=%d batch=%d grad_accum=%d lr=%s max_seq=%d",
        args.epochs,
        PER_DEVICE_BATCH,
        GRAD_ACCUM,
        LEARNING_RATE,
        args.max_seq,
    )
    stats = trainer.train()
    logger.info("training complete, loss=%.4f", stats.training_loss)

    # ── Save ──
    out_dir.mkdir(parents=True, exist_ok=True)
    trainer.model.save_pretrained(out_dir)
    tokenizer.save_pretrained(out_dir)
    logger.info("adapter saved to %s", out_dir)

    # ── Sanity check ──
    logger.info("sanity-check generation")
    sample_user = (
        "Topic: Photosynthesis\n"
        "Grade level: 5th grade\n"
        "Class length: 45 minutes\n"
        "Subject: Science\n\n"
        'No teacher-provided source material. Use your general knowledge; '
        'label all sections with source_origin="not_applicable" (where '
        'appropriate) or "generated".'
    )
    prompt = tokenizer.apply_chat_template(
        [{"role": "user", "content": sample_user}],
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        out = trainer.model.generate(
            **inputs,
            max_new_tokens=2048,
            do_sample=False,
            repetition_penalty=1.05,
        )
    logger.info(
        "\n--- SANITY CHECK OUTPUT ---\n%s",
        tokenizer.decode(
            out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=False
        )[:1500],
    )


if __name__ == "__main__":
    main()
