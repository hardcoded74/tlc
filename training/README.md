# `training/` — fine-tuning Gemma 4 E4B for TLC

End-to-end pipeline for training two LoRA adapters on **Gemma 4 E4B**
that teach the small-edge model to emit TLC's strict structured-output
schema reliably enough to ship as the production inference path.

The shipped TLC stack already runs against cloud Gemma 4 31B (paid
AI Studio) with a local-Selene fallback on quota errors. That works,
but cloud adds latency, quota risk, and a privacy ceiling. A
sufficiently-trained local E4B removes all three at once and turns
TLC into a genuinely edge-friendly K-12 tool — the explicit theme of
the Gemma 4 Good Hackathon's Impact Track.

---

## Why this is needed

Stock Gemma 4 E4B (4 B parameters) was tested directly against TLC's
`PersonaScaffoldSchema` and it consistently dropped required fields
(`title`, `objective`, `grade_level`, `overview`, `lesson_steps` —
sometimes 4+ at once). The 4 B base doesn't have a strong enough prior
for "this nested JSON schema is mandatory" to honor it without
explicit training.

Cloud Gemma 4 31B and 26B-A4B (MoE) follow the schema reliably. So:
**we use the bigger cloud models as the teacher, distill into a LoRA
on E4B, deploy the LoRA locally.** Standard recipe.

---

## Pipeline

```
                       (1)                          (2)                       (3)
   topic × grade × persona     →    cloud Gemma 4 31B    →    JSONL of validated outputs
        (training/topics.ts)         (training/generate_           (training/data/sft_*.jsonl)
                                       _training_data.ts)
                                                                          │
                                                                          ▼
                       (4)                          (5)                          (6)
   QLoRA SFT on Colab T4    →    LoRA adapter      →    merge + GGUF + quantize
   (training/train_e4b_         (HF Hub or zip       (training/merge_and_quantize.sh)
   _lora.ipynb)                  download)
                                                                          │
                                                                          ▼
                                                              llama-server on :8090
                                                              with --alias tlc-{persona}
                                                              (worker hits it via the
                                                              normal local-backend path)
```

---

## Files

| Path | Role |
|---|---|
| [`topics.ts`](./topics.ts) | Curated K-12 topic × grade matrix (~50 topics × multi-grade = ~256 rows × 2 personas). Source of truth for what gets generated. |
| [`generate_training_data.ts`](./generate_training_data.ts) | Loops the matrix, calls cloud Gemma 4 31B via [`lib/gemma.ts`](../lib/gemma.ts), validates output against [`PersonaScaffoldSchema`](../lib/validators.ts), appends valid examples to JSONL. Resumable — re-running skips rows already in the output files. |
| `data/sft_hunter.jsonl` | Output JSONL — Hunter examples in OpenAI chat format (`{messages: […]}`). Gitignored. |
| `data/sft_christine.jsonl` | Same, Christine. Gitignored. |
| `data/sft_failed.jsonl` | Rows that exceeded retry budget. Inspect for prompt issues / topic problems. Gitignored. |
| [`train_e4b_lora.ipynb`](./train_e4b_lora.ipynb) | Colab T4 notebook — QLoRA SFT against the JSONL files. One adapter per persona. |
| [`merge_and_quantize.sh`](./merge_and_quantize.sh) | Local script — merges a LoRA into Gemma 4 E4B, runs `llama.cpp/convert_hf_to_gguf.py`, quantizes to Q5_K_M, drops the GGUF in `~/models/`. |

---

## Reproducing end-to-end

### 1. Generate training data

Set up your existing TLC env vars (`GOOGLE_AI_STUDIO_KEY`, paid lane
billing enabled), then:

```bash
GEMMA_BACKEND=studio \
GEMMA_MODEL_ID=gemma-4-31b-it \
GOOGLE_AI_STUDIO_KEY=<your key> \
npx tsx training/generate_training_data.ts
```

Expect 4–8 hours wall clock for ~250 valid examples per persona.
AI Studio's per-minute input-token cap throttles us; the script
handles 429s with a 65-second backoff and retries up to 3 times per
row. Failed rows land in `data/sft_failed.jsonl` for inspection.

**The script is resumable** — kill and restart any time, it skips
rows already present in the output JSONL files.

### 2. Train (Colab T4, recommended)

Upload `data/sft_hunter.jsonl` and `data/sft_christine.jsonl` to a
Colab notebook running on T4. Open
[`train_e4b_lora.ipynb`](./train_e4b_lora.ipynb), follow cells in
order. Each persona trains in ~2 hours.

The notebook covers QLoRA setup (4-bit base, bf16 LoRA), training,
quick sanity-generation, and pushing both adapters to a public HF
Hub repo for download.

### 3. Merge + quantize + deploy

On the box with `llama.cpp` built:

```bash
# Pull the adapters from HF Hub (or unzip from the Colab download)
huggingface-cli download hardcoded74/tlc-gemma-4-e4b-hunter-lora \
  --local-dir training/out/lora-hunter
huggingface-cli download hardcoded74/tlc-gemma-4-e4b-christine-lora \
  --local-dir training/out/lora-christine

# Merge each into base, convert to GGUF, quantize to Q5_K_M
training/merge_and_quantize.sh hunter
training/merge_and_quantize.sh christine
```

Each `merge_and_quantize.sh` run produces
`~/models/gemma-4-e4b-tlc-{persona}-Q5_K_M.gguf`.

### 4. Run two llama-servers (one per persona)

```bash
# Hunter on port 8090
~/llama.cpp/build-vulkan/bin/llama-server \
  --model ~/models/gemma-4-e4b-tlc-hunter-Q5_K_M.gguf \
  --alias tlc-hunter \
  --host 127.0.0.1 --port 8090 \
  --gpu-layers 999 --ctx-size 8192 \
  --jinja --flash-attn on --parallel 1 &

# Christine on port 8091
~/llama.cpp/build-vulkan/bin/llama-server \
  --model ~/models/gemma-4-e4b-tlc-christine-Q5_K_M.gguf \
  --alias tlc-christine \
  --host 127.0.0.1 --port 8091 \
  --gpu-layers 999 --ctx-size 8192 \
  --jinja --flash-attn on --parallel 1 &
```

### 5. Wire the worker to route per-phase per-persona

`lib/gemma.ts` already has `modelForPhase()` reading
`GEMMA_MODEL_BUILD` / `_REVIEW` / `_PACKAGE` / `_VERIFY` env vars. The
next step is to add a per-persona axis so Hunter calls go to
`tlc-hunter` (port 8090) and Christine calls go to `tlc-christine`
(port 8091). One small refactor — left as a todo until adapters
exist.

---

## Schema discipline

The training data **must validate against the production
`PersonaScaffoldSchema`** in [`lib/validators.ts`](../lib/validators.ts).
The data-gen script enforces this — anything the cloud teacher emits
that fails schema validation is rejected before being written to
JSONL. That's how we guarantee the LoRA only ever learns valid
outputs.

The orchestrator-side coercions (synonym mapping for
`assessment.format`, array→string for prose fields, etc.) ARE
applied during validation, so the LoRA learns the canonical
post-coercion shape. That makes inference cleaner: the local model
emits canonical JSON without us having to coerce again.

---

## Open-source story

Both adapters are MIT-licensed (matching the rest of TLC) and pushed
to public HF Hub repos:

- `hardcoded74/tlc-gemma-4-e4b-hunter-lora`
- `hardcoded74/tlc-gemma-4-e4b-christine-lora`

A school district, a single teacher, or a curious researcher can
pull the adapters and run TLC entirely on local hardware — a single
laptop GPU is enough for a 4 B model at Q5. No API budget, no
quotas, no student data leaving the building. Cloud Gemma 4 stays
available as a faster fallback for installations that want it.

This is the pattern the Gemma 4 Good Hackathon explicitly wants to
encourage: small open-weights models, fine-tuned on synthetic
high-quality outputs from larger teachers, deployed at the edge for
real users.
