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
import { getHandleFromRequest } from "@/lib/handle";
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

  // If a parentRunId was supplied, validate the parent exists and is not
  // expired. We don't require it to be `complete` — judges might remix
  // mid-stream — but a missing parent should not silently produce an
  // orphan. SetNull on delete keeps the FK from blocking a parent's prune.
  if (data.parentRunId) {
    const parent = await prisma.lessonRun.findUnique({
      where: { id: data.parentRunId },
      select: { id: true, expiresAt: true },
    });
    if (!parent || parent.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "parent_not_found" },
        { status: 404 },
      );
    }
  }

  const authorHandle = getHandleFromRequest(req);

  const run = await prisma.lessonRun.create({
    data: {
      topic: data.topic,
      gradeLevel: data.gradeLevel,
      classLength: data.classLength ?? null,
      subject: data.subject ?? null,
      objective: data.objective ?? null,
      notes: data.notes ?? null,
      sourceUploadId: data.sourceUploadId ?? null,
      parentRunId: data.parentRunId ?? null,
      authorHandle: authorHandle ?? null,
      ipHash,
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
    },
  });

  if (!judgeMode) {
    // Consume AFTER successful DB write so validation/DB failures don't burn the quota.
    await consumeRateLimit(ipHash);
  }

  // Two modes:
  //
  // - WORKER_MODE=1 (default for the local-Selene deploy): leave the run
  //   in `pending` and exit. A long-running worker on Sam's machine
  //   polls Neon, picks pending runs, and orchestrates against
  //   localhost:8090 — no Vercel function ceiling, no Cloudflare proxy
  //   timeout, no tunnel hop.
  //
  // - WORKER_MODE unset / "0" (legacy): fire-and-forget orchestrate()
  //   inside this function. Subject to Vercel's 300s ceiling and any
  //   quota / rate-limit issues on the configured Gemma backend.
  //
  // Both paths persist failures to LessonRun.errorLog so the UI can
  // surface them.
  if (process.env.WORKER_MODE !== "1") {
    void orchestrate({ runId: run.id }).catch((err) => {
      console.error(`[TLC] orchestrator threw for run ${run.id}:`, err);
    });
  }

  const response: CreateLessonResponse = { runId: run.id };
  return NextResponse.json(response, { status: 202 });
}
