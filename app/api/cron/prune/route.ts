/**
 * Daily prune cron — deletes LessonRun and SourceUpload rows past their
 * expiresAt. Runs nightly via vercel.json cron config.
 *
 * Auth: Vercel sets the `CRON_SECRET` env var and includes it in the
 * Authorization header on cron invocations as `Bearer <secret>`. We
 * verify before doing any work so the endpoint can't be hit anonymously.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GALLERY_IP_HASH } from "@/lib/gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  // Allow unauthenticated calls in dev so the route is testable locally.
  if (process.env.NODE_ENV === "production") {
    if (!expected) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured on server" },
        { status: 500 },
      );
    }
    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Lesson runs: prune expired, but never touch gallery seeds.
  const expiredLessons = await prisma.lessonRun.deleteMany({
    where: {
      expiresAt: { lt: now },
      ipHash: { not: GALLERY_IP_HASH },
    },
  });

  // Source uploads: 1-hour TTL — purge text content immediately, then
  // remove the row entirely.
  const expiredSources = await prisma.sourceUpload.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  // Rate-limit buckets older than 24 hours are useless; clean them up
  // so the table doesn't grow unbounded.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oldBuckets = await prisma.rateLimitBucket.deleteMany({
    where: { windowStart: { lt: oneDayAgo } },
  });

  return NextResponse.json({
    ok: true,
    prunedAt: now.toISOString(),
    deleted: {
      lesson_runs: expiredLessons.count,
      source_uploads: expiredSources.count,
      rate_limit_buckets: oldBuckets.count,
    },
  });
}
