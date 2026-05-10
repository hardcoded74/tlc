/**
 * Temporary test endpoint (DELETE by Day 6 when /api/lesson/create lands).
 *
 * Calls Hunter once on a fixed photosynthesis / 5th-grade prompt to verify
 * the Gemma 4 tool-calling loop works end-to-end.
 *
 * Usage:
 *   curl http://localhost:3000/api/test-gemma
 *   curl "http://localhost:3000/api/test-gemma?persona=christine"
 *   curl "http://localhost:3000/api/test-gemma?topic=fractions&grade=3rd"
 */

import { NextResponse } from "next/server";
import { callGemma } from "@/lib/gemma";
import {
  HUNTER_SYSTEM_PROMPT,
  CHRISTINE_SYSTEM_PROMPT,
  PHASE_1_BUILD_ADDENDUM,
  buildContext,
} from "@/lib/personas";
import { SCAFFOLD_TOOL } from "@/lib/tools";
import { PersonaScaffoldSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const persona = (url.searchParams.get("persona") ?? "hunter") as
    | "hunter"
    | "christine";
  const topic = url.searchParams.get("topic") ?? "photosynthesis";
  const gradeLevel = url.searchParams.get("grade") ?? "5th grade";
  const classLength = Number(url.searchParams.get("minutes") ?? "45");

  const systemPrompt =
    (persona === "christine" ? CHRISTINE_SYSTEM_PROMPT : HUNTER_SYSTEM_PROMPT) +
    PHASE_1_BUILD_ADDENDUM;

  const userPrompt = buildContext({
    topic,
    gradeLevel,
    classLength,
    subject: "Science",
    objective: null,
    notes: null,
    sourceText: null,
  });

  try {
    const result = await callGemma({
      systemPrompt,
      userPrompt,
      tool: SCAFFOLD_TOOL,
      persona,
    });

    // Attach persona field if the model forgot to include it.
    const withPersona = { persona, ...result.toolArgs };
    const parsed = PersonaScaffoldSchema.safeParse(withPersona);

    return NextResponse.json({
      ok: parsed.success,
      persona,
      topic,
      gradeLevel,
      viaToolCall: result.viaToolCall,
      latencyMs: result.latencyMs,
      attempts: result.attempts,
      tokens: { in: result.tokensIn, out: result.tokensOut },
      scaffold: parsed.success ? parsed.data : result.toolArgs,
      validationErrors: parsed.success ? null : parsed.error.issues,
      rawText: result.rawText,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
