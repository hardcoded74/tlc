/**
 * POST /api/lesson/[id]/react
 *
 * "Found this useful" — bumps LessonRun.reactionCount once per (lessonRun,
 * ipHash). The unique constraint on Reaction(lessonRunId, ipHash) IS the
 * dedupe rate-limit, so this route deliberately does NOT consume the
 * normal hourly bucket.
 *
 * Idempotent: a second POST from the same ipHash returns the current count
 * without incrementing. The Reaction row carries a 24h expiresAt for a
 * future prune cron; deletion of a LessonRun cascades to its reactions.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REACT_DEDUPE_MS = 24 * 60 * 60 * 1000;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ipHash = hashIp(req);

  const lesson = await prisma.lessonRun.findUnique({
    where: { id },
    select: { id: true, expiresAt: true, reactionCount: true },
  });
  if (!lesson || lesson.expiresAt < new Date()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const [, updated] = await prisma.$transaction([
      prisma.reaction.create({
        data: {
          lessonRunId: id,
          ipHash,
          expiresAt: new Date(Date.now() + REACT_DEDUPE_MS),
        },
      }),
      prisma.lessonRun.update({
        where: { id },
        data: { reactionCount: { increment: 1 } },
        select: { reactionCount: true },
      }),
    ]);
    return NextResponse.json({ count: updated.reactionCount, reacted: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({
        count: lesson.reactionCount,
        reacted: true,
      });
    }
    throw err;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lesson = await prisma.lessonRun.findUnique({
    where: { id },
    select: { reactionCount: true, expiresAt: true },
  });
  if (!lesson || lesson.expiresAt < new Date()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ count: lesson.reactionCount });
}
