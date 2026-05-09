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
 * Per-persona LoRA hot-swap (optional):
 *   GEMMA_LOCAL_PERSONA_LORA — JSON map of persona → llama-server lora
 *                              adapter index, e.g. '{"hunter":0,"christine":1}'.
 *                              When set, callGemmaLocal POSTs /lora-adapters
 *                              before each /v1/chat/completions to activate
 *                              the right LoRA (others scale=0). Requires
 *                              llama-server launched with both LoRAs and
 *                              --lora-init-without-apply.
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

interface OAIStreamDelta {
  role?: string;
  content?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    type?: "function";
    function?: { name?: string; arguments?: string };
  }>;
}

interface OAIStreamChunk {
  choices?: Array<{ delta?: OAIStreamDelta; finish_reason?: string }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Read an OpenAI SSE stream and reduce it to a single OAIResponse-shaped
 * object, accumulating tool-call argument deltas across chunks. Cloudflare
 * Free has a 100s proxy timeout for non-streaming responses; streaming
 * keeps the connection alive as long as bytes are flowing, which lets
 * locally-hosted models with longer wall-clock runs reach the client.
 */
async function consumeStream(res: Response): Promise<{
  toolCalls: NonNullable<OAIChoiceMessage["tool_calls"]>;
  content: string;
  usage: { prompt_tokens: number; completion_tokens: number };
}> {
  if (!res.body) throw new Error("Local Gemma stream had no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let content = "";
  // Tool calls are accumulated by index — llama.cpp streams the JSON
  // arguments incrementally across many chunks.
  const calls = new Map<
    number,
    { id: string; name: string; args: string }
  >();
  let usage = { prompt_tokens: 0, completion_tokens: 0 };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    // SSE messages are separated by blank lines; we process line-by-line.
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") break;
      let chunk: OAIStreamChunk;
      try {
        chunk = JSON.parse(payload) as OAIStreamChunk;
      } catch {
        continue;
      }
      const choice = chunk.choices?.[0];
      const delta = choice?.delta;
      if (delta?.content) content += delta.content;
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          const cur =
            calls.get(idx) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name = tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          calls.set(idx, cur);
        }
      }
      if (chunk.usage) {
        usage = {
          prompt_tokens: chunk.usage.prompt_tokens ?? usage.prompt_tokens,
          completion_tokens:
            chunk.usage.completion_tokens ?? usage.completion_tokens,
        };
      }
    }
  }

  const toolCalls: NonNullable<OAIChoiceMessage["tool_calls"]> = [];
  for (const c of calls.values()) {
    toolCalls.push({
      id: c.id,
      type: "function",
      function: { name: c.name, arguments: c.args },
    });
  }
  return { toolCalls, content, usage };
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

/**
 * Parse GEMMA_LOCAL_PERSONA_LORA into a persona → adapter-id map.
 * Returns null if unset or unparseable. Errors are silent so a malformed
 * env var doesn't take down the worker.
 */
function loraMap(): Record<string, number> | null {
  const raw = process.env.GEMMA_LOCAL_PERSONA_LORA;
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number") out[k] = v;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/**
 * POST /lora-adapters with the right scales for the active persona.
 * Sets the requested persona's adapter to scale=1.0, all others to 0.0.
 * If persona is undefined (e.g. review or verifier calls), every adapter
 * is set to 0 — i.e. the call uses the bare base.
 */
async function setActiveLora(
  baseUrl: string,
  apiKey: string,
  persona: "hunter" | "christine" | undefined,
  map: Record<string, number>,
): Promise<void> {
  const adapters = Object.entries(map).map(([name, id]) => ({
    id,
    scale: persona === name ? 1.0 : 0.0,
  }));
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const res = await fetch(`${baseUrl}/lora-adapters`, {
    method: "POST",
    headers,
    body: JSON.stringify(adapters),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Local Gemma /lora-adapters HTTP ${res.status}: ${text.slice(0, 200)}`,
    );
  }
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
  const lora = loraMap();

  const {
    systemPrompt,
    userPrompt,
    tool,
    forceToolCall = true,
    temperature = 0.7,
    // Local Selene per-call latency on a 26B-A4B MoE on Arc B570 sits
    // around 200-300s for a Phase 1 build and similar for Phase 3.
    // Default of 1 attempt + 10-minute hard ceiling gives margin without
    // wasting retries (re-running a slow call doesn't make Selene faster).
    maxRetries = 1,
    timeoutMs = 600_000,
    persona,
  } = params;

  const startedAt = Date.now();
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Activate the right LoRA for this persona, if configured. We do
      // this on every call so a process running multiple personas in
      // sequence is correct without tracking server-side state.
      if (lora) {
        await setActiveLora(baseUrl, apiKey, persona, lora);
      }

      const body = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [toOAITool(tool)],
        tool_choice: forceToolCall ? "auto" : "none",
        temperature,
        // Stream so Cloudflare's 100-second proxy timeout doesn't cut us
        // off mid-generation when Selene's wall-clock runs long.
        stream: true,
        // Ask llama-server to include final usage figures in the stream.
        stream_options: { include_usage: true },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
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

      const reduced = await consumeStream(res);
      const tokensIn = reduced.usage.prompt_tokens;
      const tokensOut = reduced.usage.completion_tokens;
      const latencyMs = Date.now() - startedAt;

      // 1. Native tool call path
      const toolCall = reduced.toolCalls.find(
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
      const rawText = reduced.content;
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
