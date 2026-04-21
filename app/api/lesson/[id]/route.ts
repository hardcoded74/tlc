/**
 * GET /api/lesson/:id
 *
 * Returns the full LessonRun row with finalPackage (or partial state
 * if still running). Used by /lesson/[id] page + judge-mode inspector.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const judgeMode = url.searchParams.get("judge") === "1";

  const run = await prisma.lessonRun.findUnique({ where: { id } });
  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (run.expiresAt < new Date()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Non-judge responses omit the per-phase internals; the final package
  // is what teachers need. Judge mode gets everything.
  const body = judgeMode
    ? {
        id: run.id,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        status: run.status,
        topic: run.topic,
        gradeLevel: run.gradeLevel,
        classLength: run.classLength,
        subject: run.subject,
        objective: run.objective,
        notes: run.notes,
        sourceUploadId: run.sourceUploadId,
        hunterBuild: run.hunterBuild,
        christineBuild: run.christineBuild,
        review: run.review,
        hunterPackage: run.hunterPackage,
        christinePackage: run.christinePackage,
        finalPackage: run.finalPackage,
        timings: run.timings,
        tokenUsage: run.tokenUsage,
        errorLog: run.errorLog,
        expiresAt: run.expiresAt,
      }
    : {
        id: run.id,
        createdAt: run.createdAt,
        status: run.status,
        topic: run.topic,
        gradeLevel: run.gradeLevel,
        subject: run.subject,
        finalPackage: run.finalPackage,
        expiresAt: run.expiresAt,
      };

  return NextResponse.json(body);
}
