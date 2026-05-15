/**
 * Reproduce the regenerate-on-must-fix Build call for a given run,
 * print the FULL model content (not the 200-char errorLog truncation),
 * and the finish_reason so we know whether it was ctx-clipped or
 * naturally EOS'd.
 */
import { PrismaClient } from "@prisma/client";
import { SCAFFOLD_TOOL } from "../lib/tools";
import {
  HUNTER_SYSTEM_PROMPT,
  PHASE_1_BUILD_ADDENDUM,
} from "../lib/prompts";
import {
  buildContext,
  buildRetryAddendum,
  type ContextInput,
} from "../lib/personas";
import { contradictedSourceExcerpts } from "../lib/verify";

const RUN_ID = process.argv[2] || "e5f64676-dd10-434d-acbb-9ce3676d1b43";

async function main() {
  const prisma = new PrismaClient();
  const run = await prisma.lessonRun.findUnique({ where: { id: RUN_ID } });
  if (!run) throw new Error(`run not found: ${RUN_ID}`);
  if (!run.hunterBuild || !run.christineBuild || !run.review) {
    throw new Error("run missing build/review outputs");
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

  const review = run.review as never as {
    verification?: unknown;
    must_fix_count: number;
  };
  const contradictedExcerpts = contradictedSourceExcerpts(
    (review as { verification: never }).verification,
  );

  const hunterBuild = run.hunterBuild as never as Record<string, unknown>;
  const christineBuild = run.christineBuild as never as Record<string, unknown>;

  const userPrompt =
    baseContext +
    buildRetryAddendum({
      previousScaffold: hunterBuild as never,
      partnerScaffold: christineBuild as never,
      review: review as never,
      contradictedExcerpts,
    });

  const systemPrompt = HUNTER_SYSTEM_PROMPT + PHASE_1_BUILD_ADDENDUM;

  console.log("system prompt length:", systemPrompt.length);
  console.log("user prompt length:", userPrompt.length);
  console.log("must_fix_count:", (review as { must_fix_count: number }).must_fix_count);
  console.log("");

  // Set Hunter LoRA active
  const r = await fetch("http://127.0.0.1:8091/lora-adapters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      { id: 0, scale: 1.0 },
      { id: 1, scale: 0.0 },
    ]),
  });
  console.log("lora set:", await r.text());

  const body = {
    model: "tlc",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: SCAFFOLD_TOOL.name,
          description: SCAFFOLD_TOOL.description,
          parameters: SCAFFOLD_TOOL.parameters,
        },
      },
    ],
    tool_choice: "auto",
    temperature: 0.7,
    stream: false,
  };

  console.log("calling...");
  const t0 = Date.now();
  const res = await fetch("http://127.0.0.1:8091/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json()) as Record<string, never>;
  console.log("elapsed:", Date.now() - t0, "ms");
  console.log("finish_reason:", (j as never as { choices: never[] }).choices?.[0]?.finish_reason);
  console.log("usage:", JSON.stringify((j as never as { usage: unknown }).usage));
  const content = (j as never as { choices: never[] }).choices?.[0]?.message?.content ?? null;
  const toolCalls = (j as never as { choices: never[] }).choices?.[0]?.message?.tool_calls ?? null;
  console.log("");
  console.log("--- tool_calls ---");
  console.log(JSON.stringify(toolCalls, null, 2));
  console.log("--- content (length", content?.length || 0, ") ---");
  console.log(content);
  console.log("--- end ---");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
