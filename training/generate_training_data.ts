/**
 * SFT data generator for the TLC Hunter + Christine LoRAs.
 *
 * For each (topic, grade, persona) row in training/topics.ts:
 *   1. Build the SAME system prompt + user context the production
 *      orchestrator would build (lib/personas.ts → buildContext).
 *   2. Call cloud Gemma 4 31B (the "teacher" model) with the SCAFFOLD_TOOL.
 *   3. Validate the tool-args output against the SAME PersonaScaffoldSchema
 *      production validates against. Reject anything that doesn't pass.
 *   4. Append a chat-format JSONL line to data/sft_<persona>.jsonl.
 *
 * Resumable: re-running skips rows whose key already appears in the
 * output file. Throttled by AI Studio's per-minute input-token cap, so
 * you'll see 429s — those are caught and the row is retried later in
 * the run; if it still fails after MAX_ROW_RETRIES it gets logged to
 * sft_failed.jsonl for inspection.
 *
 *   GEMMA_BACKEND=studio \
 *   GEMMA_MODEL_ID=gemma-4-31b-it \
 *   GOOGLE_AI_STUDIO_KEY=<key> \
 *   npx tsx training/generate_training_data.ts
 *
 * Output:
 *   training/data/sft_hunter.jsonl
 *   training/data/sft_christine.jsonl
 *   training/data/sft_failed.jsonl
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import { callGemma } from "../lib/gemma";
import {
  HUNTER_SYSTEM_PROMPT,
  CHRISTINE_SYSTEM_PROMPT,
  PHASE_1_BUILD_ADDENDUM,
  buildContext,
} from "../lib/personas";
import { SCAFFOLD_TOOL } from "../lib/tools";
import { PersonaScaffoldSchema } from "../lib/validators";
import { expandMatrix, rowKey, type GenerationRow } from "./topics";

const DATA_DIR = join(process.cwd(), "training", "data");
const HUNTER_OUT = join(DATA_DIR, "sft_hunter.jsonl");
const CHRISTINE_OUT = join(DATA_DIR, "sft_christine.jsonl");
const FAILED_OUT = join(DATA_DIR, "sft_failed.jsonl");
const PROGRESS_OUT = join(DATA_DIR, "sft_progress.json");

const MAX_ROW_RETRIES = 3;
const QUOTA_BACKOFF_MS = 65_000; // ~1 min — clears AI Studio per-minute bucket
const POLITE_DELAY_MS = 1_500;

interface ChatExample {
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
  }>;
  meta: {
    persona: "hunter" | "christine";
    topic: string;
    grade_level: string;
    subject: string;
    generated_at: string;
  };
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

/** Read previously-completed row keys from the output JSONL files. */
function loadCompletedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const path of [HUNTER_OUT, CHRISTINE_OUT]) {
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const ex = JSON.parse(line) as ChatExample;
        const k = `${ex.meta.persona}::${ex.meta.grade_level}::${ex.meta.topic}`;
        keys.add(k);
      } catch {
        // skip malformed lines
      }
    }
  }
  return keys;
}

function systemPromptFor(persona: "hunter" | "christine"): string {
  const base =
    persona === "hunter" ? HUNTER_SYSTEM_PROMPT : CHRISTINE_SYSTEM_PROMPT;
  return base + PHASE_1_BUILD_ADDENDUM;
}

function userPromptFor(row: GenerationRow): string {
  return buildContext({
    topic: row.topic,
    gradeLevel: row.gradeLevel,
    classLength: 45, // canonical demo length
    subject: row.subject,
    objective: null,
    notes: null,
    sourceText: null,
  });
}

function isQuotaErr(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("429") ||
    m.includes("rate") ||
    m.includes("resource_exhausted") ||
    m.includes("quota")
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateOne(row: GenerationRow): Promise<ChatExample | null> {
  const system = systemPromptFor(row.persona);
  const user = userPromptFor(row);

  const result = await callGemma({
    systemPrompt: system,
    userPrompt: user,
    tool: SCAFFOLD_TOOL,
    temperature: 0.6,
    maxRetries: 1,
    timeoutMs: 90_000,
  });

  // Inject the persona field if the model omitted it (mirrors orchestrator).
  const withPersona = { persona: row.persona, ...result.toolArgs };
  const parsed = PersonaScaffoldSchema.safeParse(withPersona);
  if (!parsed.success) {
    return null;
  }

  // Strip the orchestrator-side coercions: re-serialize the validated
  // object so we get the canonical, post-coercion JSON. That's what the
  // student model should learn to emit directly.
  const canonical = JSON.stringify(parsed.data);

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
      { role: "assistant", content: canonical },
    ],
    meta: {
      persona: row.persona,
      topic: row.topic,
      grade_level: row.gradeLevel,
      subject: row.subject,
      generated_at: new Date().toISOString(),
    },
  };
}

function appendExample(ex: ChatExample): void {
  const path = ex.meta.persona === "hunter" ? HUNTER_OUT : CHRISTINE_OUT;
  appendFileSync(path, JSON.stringify(ex) + "\n");
}

function appendFailure(row: GenerationRow, reason: string): void {
  appendFileSync(
    FAILED_OUT,
    JSON.stringify({
      ...row,
      reason: reason.slice(0, 500),
      timestamp: new Date().toISOString(),
    }) + "\n",
  );
}

interface Progress {
  completed: number;
  failed: number;
  attempted: number;
  started_at: string;
  last_update: string;
}

function writeProgress(p: Progress): void {
  appendFileSync(PROGRESS_OUT + ".tmp", JSON.stringify(p, null, 2));
}

async function main(): Promise<void> {
  ensureDir();

  const rows = expandMatrix();
  const done = loadCompletedKeys();
  const todo = rows.filter((r) => !done.has(rowKey(r)));

  console.log(
    `[${ts()}] [gen] ${rows.length} total rows; ${done.size} already done; ${todo.length} to do`,
  );

  const progress: Progress = {
    completed: done.size,
    failed: 0,
    attempted: 0,
    started_at: new Date().toISOString(),
    last_update: new Date().toISOString(),
  };

  for (const row of todo) {
    progress.attempted++;
    const k = rowKey(row);

    let attempt = 0;
    let saved = false;
    let lastErr = "unknown";

    while (attempt < MAX_ROW_RETRIES && !saved) {
      attempt++;
      try {
        const ex = await generateOne(row);
        if (ex) {
          appendExample(ex);
          progress.completed++;
          saved = true;
          console.log(
            `[${ts()}] [gen] OK   ${k}  (attempt ${attempt})  → ${
              row.persona === "hunter" ? "sft_hunter.jsonl" : "sft_christine.jsonl"
            }`,
          );
        } else {
          lastErr = "schema validation failed";
          console.log(
            `[${ts()}] [gen] FAIL ${k}  (attempt ${attempt})  schema rejected`,
          );
        }
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        if (isQuotaErr(err)) {
          console.log(
            `[${ts()}] [gen] 429  ${k}  (attempt ${attempt})  sleeping ${QUOTA_BACKOFF_MS / 1000}s`,
          );
          await sleep(QUOTA_BACKOFF_MS);
          continue;
        }
        console.log(
          `[${ts()}] [gen] ERR  ${k}  (attempt ${attempt})  ${lastErr.slice(0, 120)}`,
        );
      }

      if (!saved && attempt < MAX_ROW_RETRIES) {
        await sleep(POLITE_DELAY_MS);
      }
    }

    if (!saved) {
      progress.failed++;
      appendFailure(row, lastErr);
    }

    progress.last_update = new Date().toISOString();
    writeProgress(progress);

    // small pause between rows to be polite to the API
    await sleep(POLITE_DELAY_MS);
  }

  console.log(
    `[${ts()}] [gen] done. completed=${progress.completed} failed=${progress.failed} attempted=${progress.attempted}`,
  );
}

main().catch((err) => {
  console.error("[gen] fatal:", err);
  process.exit(1);
});
