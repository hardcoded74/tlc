/**
 * POST /api/lesson/create
 *
 * Validates teacher input, creates a LessonRun row, fires the orchestrator
 * in the background, returns { runId }. The client then subscribes to
 * /api/lesson/stream/[id] for SSE events.
 *
 * Rate-limited to 10 requests / hour per IP. Judge mode bypasses via
 * ?judge=1 on the query string (see ARCHITECTURE.md §5.7).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orchestrate } from "@/lib/orchestrator";
import { CreateLessonRequestSchema } from "@/lib/validators";
import { hashIp } from "@/lib/ip";
import { checkRateLimit, consumeRateLimit } from "@/lib/rate_limit";
import type { CreateLessonResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro ceiling; orchestrator runs here

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = CreateLessonRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const judgeMode = url.searchParams.get("judge") === "1";
  const ipHash = hashIp(req);

  if (!judgeMode) {
    const rl = await checkRateLimit(ipHash);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          limit: rl.limit,
          used: rl.used,
          retryAfterSeconds: rl.retryAfterSeconds,
          windowEnd: rl.windowEnd.toISOString(),
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSeconds ?? 3600) },
        },
      );
    }
  }

  const data = parsed.data;
  const run = await prisma.lessonRun.create({
    data: {
      topic: data.topic,
      gradeLevel: data.gradeLevel,
      classLength: data.classLength ?? null,
      subject: data.subject ?? null,
      objective: data.objective ?? null,
      notes: data.notes ?? null,
      sourceUploadId: data.sourceUploadId ?? null,
      ipHash,
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
    },
  });

  if (!judgeMode) {
    // Consume AFTER successful DB write so validation/DB failures don't burn the quota.
    await consumeRateLimit(ipHash);
  }

  // Fire-and-forget. Errors are caught inside orchestrate() and persisted
  // to LessonRun.errorLog; we don't want to block the response on them.
  void orchestrate({ runId: run.id }).catch((err) => {
    console.error(`[TLC] orchestrator threw for run ${run.id}:`, err);
  });

  const response: CreateLessonResponse = { runId: run.id };
  return NextResponse.json(response, { status: 202 });
}
