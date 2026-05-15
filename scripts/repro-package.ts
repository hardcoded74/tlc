/**
 * One-off repro: hit the trained E4B + Hunter LoRA with the exact
 * Phase 3 Package call that failed for a given run, and print the
 * FULL streamed content + tool_calls so we can see what the model
 * actually emitted (not the 200-char truncation in errorLog).
 *
 * Usage:  npx tsx scripts/repro-package.ts <runId>
 */
import { PrismaClient } from "@prisma/client";
import { callGemmaLocal } from "../lib/gemma-local";
import { PACKAGE_TOOL } from "../lib/tools";
import {
  HUNTER_SYSTEM_PROMPT,
  PHASE_3_PACKAGE_ADDENDUM,
} from "../lib/prompts";
import { buildContext, buildPhase3Context } from "../lib/personas";
import type { ContextInput } from "../lib/personas";

const RUN_ID = process.argv[2] || "e5f64676-dd10-434d-acbb-9ce3676d1b43";

async function main() {
  const prisma = new PrismaClient();
  const run = await prisma.lessonRun.findUnique({ where: { id: RUN_ID } });
  if (!run) throw new Error(`run not found: ${RUN_ID}`);
  if (!run.hunterBuild || !run.christineBuild || !run.review) {
    throw new Error("run missing hunterBuild/christineBuild/review");
  }

  const ctxInput: ContextInput = {
    topic: run.topic,
    gradeLevel: run.gradeLevel,
    classLength: run.classLength,
    subject: run.subject,
    objective: run.objective,
    notes: run.notes,
    sourceText: null,
    options: undefined,
  };
  const baseContext = buildContext(ctxInput);

  const phase3 = buildPhase3Context({
    baseContext,
    ownPersona: "hunter",
    ownBuild: run.hunterBuild as never,
    partnerBuild: run.christineBuild as never,
    review: run.review as never,
  });

  console.log("=== Calling trained Hunter package phase ===");
  console.log("system prompt length:", (HUNTER_SYSTEM_PROMPT + PHASE_3_PACKAGE_ADDENDUM).length);
  console.log("user prompt length:", phase3.length);
  console.log("");

  const t0 = Date.now();
  try {
    const out = await callGemmaLocal({
      systemPrompt: HUNTER_SYSTEM_PROMPT + PHASE_3_PACKAGE_ADDENDUM,
      userPrompt: phase3,
      tool: PACKAGE_TOOL,
      persona: "hunter",
      lora: { hunter: 0, christine: 1 },
      temperature: 0.7,
      maxRetries: 1,
    });
    console.log("=== SUCCESS in", Date.now() - t0, "ms ===");
    console.log("viaToolCall:", out.viaToolCall);
    console.log("tokensIn:", out.tokensIn, "tokensOut:", out.tokensOut);
    if (out.rawText) {
      console.log("--- rawText (length:", out.rawText.length, ") ---");
      console.log(out.rawText);
      console.log("--- end rawText ---");
    } else {
      console.log("rawText: null (came via tool_call)");
    }
    console.log("toolArgs keys:", Object.keys(out.toolArgs));
  } catch (e: unknown) {
    console.log("=== FAILED in", Date.now() - t0, "ms ===");
    const msg = e instanceof Error ? e.message : String(e);
    console.log("ERROR:", msg);
    // The error message has truncated content. We need to capture it
    // ourselves by hitting llama-server directly with the same body.
    console.log("");
    console.log("=== Direct retry to capture FULL content ===");
    const r = await fetch("http://127.0.0.1:8091/lora-adapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { id: 0, scale: 1.0 },
        { id: 1, scale: 0.0 },
      ]),
    });
    console.log("lora set:", await r.text());

    const directBody = {
      model: "tlc",
      messages: [
        { role: "system", content: HUNTER_SYSTEM_PROMPT + PHASE_3_PACKAGE_ADDENDUM },
        { role: "user", content: phase3 },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: PACKAGE_TOOL.name,
            description: PACKAGE_TOOL.description,
            parameters: PACKAGE_TOOL.parameters,
          },
        },
      ],
      tool_choice: "auto",
      temperature: 0.7,
      stream: false,
    };
    const r2 = await fetch("http://127.0.0.1:8091/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(directBody),
    });
    const j = (await r2.json()) as any;
    console.log("finish_reason:", j.choices?.[0]?.finish_reason);
    console.log("usage:", JSON.stringify(j.usage));
    console.log("--- content ---");
    console.log(j.choices?.[0]?.message?.content ?? "(null)");
    console.log("--- end content ---");
    console.log("tool_calls:", JSON.stringify(j.choices?.[0]?.message?.tool_calls, null, 2));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
