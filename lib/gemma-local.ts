/**
 * Local-Selene backend for callGemma.
 *
 * Talks to a llama.cpp / llama-server instance via the OpenAI-compatible
 * /v1/chat/completions endpoint. Tools are sent in OpenAI's `tools`
 * format and the model's tool_calls are mapped back into the same
 * GemmaCallResult shape the AI Studio backend returns, so the
 * orchestrator and verifier don't know which backend they hit.
 *
 * Reachability assumptions:
 *   GEMMA_LOCAL_URL    — base URL (e.g. https://xyz.trycloudflare.com)
 *   GEMMA_LOCAL_MODEL  — model alias to send (e.g. "selene-live")
 *   GEMMA_LOCAL_KEY    — optional Bearer token; sent if set
 *
 * The local backend has no per-minute quota, so the orchestrator's
 * fail-fast-on-quota path never fires here.
 */

import type { FunctionDeclaration } from "./tools";
import type { GemmaCallParams, GemmaCallResult } from "./gemma";

interface OAIToolCall {
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
}

interface OAIChoiceMessage {
  role?: string;
  content?: string | null;
  tool_calls?: OAIToolCall[] | null;
}

interface OAIChoice {
  message?: OAIChoiceMessage;
  finish_reason?: string;
}

interface OAIResponse {
  choices?: OAIChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  const slice = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(slice);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let to: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        to = setTimeout(
          () => reject(new Error(`Local Gemma call timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (to) clearTimeout(to);
  }
}

function toOAITool(decl: FunctionDeclaration) {
  return {
    type: "function" as const,
    function: {
      name: decl.name,
      description: decl.description,
      parameters: decl.parameters,
    },
  };
}

export async function callGemmaLocal(
  params: GemmaCallParams,
): Promise<GemmaCallResult> {
  const baseUrl = (process.env.GEMMA_LOCAL_URL ?? "").replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error(
      "GEMMA_BACKEND=local but GEMMA_LOCAL_URL is not set. Point it at your llama-server tunnel URL.",
    );
  }
  const model = process.env.GEMMA_LOCAL_MODEL ?? "selene-live";
  const apiKey = process.env.GEMMA_LOCAL_KEY ?? "";

  const {
    systemPrompt,
    userPrompt,
    tool,
    forceToolCall = true,
    temperature = 0.7,
    maxRetries = 2,
    timeoutMs = 120_000, // local can be slower per call; allow more headroom
  } = params;

  const startedAt = Date.now();
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const body = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [toOAITool(tool)],
        tool_choice: forceToolCall ? "auto" : "none",
        temperature,
        // No max_tokens — let the model run to its natural stop on tool call.
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const res = await withTimeout(
        fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }),
        timeoutMs,
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Local Gemma HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      const json = (await res.json()) as OAIResponse;
      const choice = json.choices?.[0];
      const message = choice?.message;
      const usage = json.usage ?? {};
      const tokensIn = usage.prompt_tokens ?? 0;
      const tokensOut = usage.completion_tokens ?? 0;
      const latencyMs = Date.now() - startedAt;

      // 1. Native tool call path
      const toolCall = message?.tool_calls?.find(
        (tc) => tc.function?.name === tool.name,
      );
      if (toolCall?.function?.arguments) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(toolCall.function.arguments) as Record<
            string,
            unknown
          >;
        } catch {
          // Some local models emit slightly malformed JSON in arguments.
          const fb = parseJsonFromText(toolCall.function.arguments);
          if (fb) parsed = fb;
        }
        return {
          toolArgs: parsed,
          rawText: null,
          viaToolCall: true,
          tokensIn,
          tokensOut,
          latencyMs,
          attempts: attempt,
        };
      }

      // 2. JSON-in-content fallback
      const rawText = message?.content ?? "";
      const fallback = parseJsonFromText(rawText);
      if (fallback) {
        return {
          toolArgs: fallback,
          rawText,
          viaToolCall: false,
          tokensIn,
          tokensOut,
          latencyMs,
          attempts: attempt,
        };
      }

      throw new Error(
        `Local Gemma returned neither tool_call nor parseable JSON. Content: ${rawText.slice(0, 200)}`,
      );
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries) throw err;
      // Local backend doesn't have rate-limit semantics; just back off briefly.
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw lastErr ?? new Error("callGemmaLocal exhausted retries");
}

/** Reachability ping for /api/health when the local backend is selected. */
export async function pingGemmaLocal(timeoutMs = 3000): Promise<boolean> {
  const baseUrl = (process.env.GEMMA_LOCAL_URL ?? "").replace(/\/+$/, "");
  if (!baseUrl) return false;
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}
