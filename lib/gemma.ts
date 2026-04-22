/**
 * Gemma 4 client — Google AI Studio via @google/genai.
 *
 * Responsibilities:
 *   - Build + cache a single GoogleGenAI instance.
 *   - Normalize tool-calling: we pass FunctionDeclaration[], we get back
 *     a parsed-JSON object (whatever the tool emitted).
 *   - Retry transient errors with exponential backoff.
 *   - Fall back to text/JSON parsing if the model returns text instead
 *     of a tool call (some Gemma variants don't fire tools reliably).
 *   - Track token usage and wall-clock timing per call.
 *
 * This is the ONE place in the codebase that talks to the model vendor.
 * Orchestrator code never imports @google/genai directly.
 */

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { requireGoogleKey } from "./env";
import type { FunctionDeclaration } from "./tools";

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
// AI Studio surfaces two Gemma 4 variants as of 2026-04: gemma-4-26b-a4b-it
// (MoE, ~4B active params, fast) and gemma-4-31b-it (dense, stronger, slower).
// Default to the dense 31b for structured-output accuracy — the MoE had
// visible drift between Build and Package in the simple-machines test run.
// Override via GEMMA_MODEL_ID env var.
export const MODEL_ID =
  process.env.GEMMA_MODEL_ID ?? "gemma-4-31b-it";

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
  /** Max retries on transient errors. Default 3. */
  maxRetries?: number;
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
    m.includes("429") ||
    m.includes("rate") ||
    m.includes("503") ||
    m.includes("502") ||
    m.includes("500") ||
    m.includes("timeout") ||
    m.includes("network")
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const {
    systemPrompt,
    userPrompt,
    tool,
    forceToolCall = true,
    temperature = 0.7,
    maxRetries = 3,
  } = params;

  const client = gemmaClient();
  const startedAt = Date.now();

  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: MODEL_ID,
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
      });

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
