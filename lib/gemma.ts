/**
 * Gemma 4 client — dual backend.
 *
 *   GEMMA_BACKEND=studio  (default) → Google AI Studio via @google/genai
 *   GEMMA_BACKEND=local            → llama.cpp / llama-server over the
 *                                    OpenAI-compatible /v1/chat/completions
 *                                    endpoint (typically a tunneled local
 *                                    Selene)
 *
 * The orchestrator and verifier import callGemma from here and never see
 * which backend ran their request. The local path lives in
 * lib/gemma-local.ts; this file owns the studio path and the dispatcher.
 *
 * Responsibilities (studio path):
 *   - Build + cache a single GoogleGenAI instance
 *   - Normalize tool-calling: pass FunctionDeclaration[], get back a
 *     parsed-JSON object (whatever the tool emitted)
 *   - Bounded retries on transient errors; fail fast on quota
 *   - Per-call timeout via Promise.race
 *   - Fall back to text/JSON parsing if the model returns text instead
 *     of a tool call (some Gemma variants don't fire tools reliably)
 *   - Track token usage and wall-clock timing per call
 */

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { requireGoogleKey } from "./env";
import { callGemmaLocal, pingGemmaLocal } from "./gemma-local";
import type { FunctionDeclaration } from "./tools";

function selectedBackend(): "studio" | "local" {
  return process.env.GEMMA_BACKEND === "local" ? "local" : "studio";
}

// ──────────────────────────────────────────────────────────────────────
// Client singleton
// ──────────────────────────────────────────────────────────────────────

let _client: GoogleGenAI | null = null;

export function gemmaClient(): GoogleGenAI {
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: requireGoogleKey() });
  }
  return _client;
}

// Model ID — pinned via env so we can swap without redeploying code.
// AI Studio surfaces three Gemma 4 variants as of 2026-04:
//   gemma-4-e4b-it      (4B dense, fastest, smallest reasoning)
//   gemma-4-26b-a4b-it  (MoE, 4B active, balanced)
//   gemma-4-31b-it      (dense, strongest reasoning, slowest)
// Each model has its own per-minute input-token bucket on the paid tier
// (~16k tokens/min in our region as of 2026-05). Mixing per phase is
// supported via GEMMA_MODEL_BUILD / GEMMA_MODEL_REVIEW / GEMMA_MODEL_PACKAGE
// — each falls back to GEMMA_MODEL_ID, which defaults to the dense 31b.
const DEFAULT_MODEL_ID = process.env.GEMMA_MODEL_ID ?? "gemma-4-31b-it";

export const MODEL_ID = DEFAULT_MODEL_ID;

export type Phase = "build" | "review" | "package" | "verify";

export function modelForPhase(phase: Phase): string {
  switch (phase) {
    case "build":
      return process.env.GEMMA_MODEL_BUILD ?? DEFAULT_MODEL_ID;
    case "review":
      return process.env.GEMMA_MODEL_REVIEW ?? DEFAULT_MODEL_ID;
    case "package":
      return process.env.GEMMA_MODEL_PACKAGE ?? DEFAULT_MODEL_ID;
    case "verify":
      return process.env.GEMMA_MODEL_VERIFY ?? DEFAULT_MODEL_ID;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Public call shape
// ──────────────────────────────────────────────────────────────────────

export interface GemmaCallParams {
  systemPrompt: string;
  userPrompt: string;
  tool: FunctionDeclaration;
  /** forceToolCall: if true, we set toolConfig to require the named function. */
  forceToolCall?: boolean;
  /** Optional per-call override. */
  temperature?: number;
  /** Max retries on transient errors. Default 2 (so 3 total attempts). */
  maxRetries?: number;
  /** Per-call hard timeout in ms. Default 60000 (60s). */
  timeoutMs?: number;
  /** Phase tag — selects model via modelForPhase(). Optional; falls back to MODEL_ID. */
  phase?: Phase;
}

export interface GemmaCallResult {
  /** Parsed tool-call args (already JSON.parse'd). */
  toolArgs: Record<string, unknown>;
  /** Raw response text if the model replied with text (for debugging). */
  rawText: string | null;
  /** Whether we got a structured tool call (true) or parsed JSON text (false). */
  viaToolCall: boolean;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  /** How many attempts the call took (1 = first try). */
  attempts: number;
}

// ──────────────────────────────────────────────────────────────────────
// Retry helpers
// ──────────────────────────────────────────────────────────────────────

const BASE_BACKOFF_MS = 500;

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("503") ||
    m.includes("502") ||
    m.includes("500") ||
    m.includes("network")
  );
}

/**
 * 429 quota errors are NOT transient in our retry window — AI Studio
 * tells us "retry in 59s" but we only have a 300s function budget for
 * the whole lesson, so retrying a 429 just eats more of that budget.
 * Fail fast and let the orchestrator surface the error to the user;
 * they'll get a clean "rate-limited, try again in a minute" experience
 * instead of a 300s timeout.
 */
function isQuotaError(err: unknown): boolean {
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Race a promise against a timeout. Throws "Gemma call timed out after Xs". */
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let to: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        to = setTimeout(
          () => reject(new Error(`Gemma call timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (to) clearTimeout(to);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Response parsing
// ──────────────────────────────────────────────────────────────────────

/**
 * Extract tool-call args from a @google/genai response. Returns null if
 * the model replied with text instead of a tool call.
 */
function extractToolCall(
  response: unknown,
  expectedName: string,
): Record<string, unknown> | null {
  // @google/genai puts function calls inside candidates[0].content.parts[].functionCall
  const r = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ functionCall?: { name: string; args: Record<string, unknown> } }> };
    }>;
  };
  const parts = r?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.functionCall && part.functionCall.name === expectedName) {
      return part.functionCall.args ?? {};
    }
  }
  return null;
}

/**
 * Fall back to parsing text response as JSON. Handles fenced code blocks.
 */
function parseJsonFromText(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  // Find first { through last } for robustness against preamble.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  const slice = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(slice);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function extractText(response: unknown): string {
  const r = response as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const parts = r?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

function extractUsage(response: unknown): { in: number; out: number } {
  const r = response as {
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  return {
    in: r?.usageMetadata?.promptTokenCount ?? 0,
    out: r?.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Main call
// ──────────────────────────────────────────────────────────────────────

export async function callGemma(params: GemmaCallParams): Promise<GemmaCallResult> {
  // Backend dispatch — local Selene gets the same callGemma() shape but
  // routes through lib/gemma-local.ts (OpenAI-compatible /v1/chat/completions
  // against a tunneled llama.cpp server).
  if (selectedBackend() === "local") {
    return callGemmaLocal(params);
  }
  return callGemmaStudio(params);
}

async function callGemmaStudio(
  params: GemmaCallParams,
): Promise<GemmaCallResult> {
  const {
    systemPrompt,
    userPrompt,
    tool,
    forceToolCall = true,
    temperature = 0.7,
    maxRetries = 2,
    timeoutMs = 60_000,
    phase,
  } = params;

  const client = gemmaClient();
  const model = phase ? modelForPhase(phase) : MODEL_ID;
  const startedAt = Date.now();

  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        client.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: systemPrompt,
            temperature,
            tools: [{ functionDeclarations: [tool as unknown as never] }],
            // NOTE: Gemma 4 hangs (60s+ no response) when mode=ANY forces a
            // tool call. mode=AUTO still calls the named tool reliably
            // because the system prompt tells it to — and if the model
            // ever emits JSON as text instead, parseJsonFromText() below
            // catches it. Empirically tested against gemma-4-26b-a4b-it
            // 2026-04-21. Don't flip back to ANY without re-testing.
            toolConfig: forceToolCall
              ? {
                  functionCallingConfig: {
                    mode: FunctionCallingConfigMode.AUTO,
                  },
                }
              : undefined,
          },
        }),
        timeoutMs,
      );

      const latencyMs = Date.now() - startedAt;
      const usage = extractUsage(response);
      const toolArgs = extractToolCall(response, tool.name);

      if (toolArgs !== null) {
        return {
          toolArgs,
          rawText: null,
          viaToolCall: true,
          tokensIn: usage.in,
          tokensOut: usage.out,
          latencyMs,
          attempts: attempt,
        };
      }

      // Fallback: model returned text. Try to parse it as JSON.
      const rawText = extractText(response);
      const parsed = parseJsonFromText(rawText);
      if (parsed !== null) {
        return {
          toolArgs: parsed,
          rawText,
          viaToolCall: false,
          tokensIn: usage.in,
          tokensOut: usage.out,
          latencyMs,
          attempts: attempt,
        };
      }

      // Neither worked — treat as bad output and let the retry loop kick in.
      throw new Error(
        `Model returned neither a tool call nor parseable JSON. Text: ${rawText.slice(0, 200)}…`,
      );
    } catch (err) {
      lastErr = err;
      // Fail fast on quota errors — retrying a 429 burns the function
      // budget without ever waiting long enough for the per-minute window
      // to reset.
      if (isQuotaError(err)) throw err;
      if (attempt >= maxRetries || !isTransientError(err)) {
        throw err;
      }
      const backoff = BASE_BACKOFF_MS * Math.pow(3, attempt - 1);
      await sleep(backoff);
    }
  }

  throw lastErr ?? new Error("callGemma exhausted retries");
}

// ──────────────────────────────────────────────────────────────────────
// Reachability ping (used by /api/health)
// ──────────────────────────────────────────────────────────────────────

export async function pingGemma(timeoutMs = 3000): Promise<boolean> {
  if (selectedBackend() === "local") {
    return pingGemmaLocal(timeoutMs);
  }
  try {
    const key = requireGoogleKey();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { method: "GET", signal: AbortSignal.timeout(timeoutMs) },
    );
    return res.ok;
  } catch {
    return false;
  }
}
