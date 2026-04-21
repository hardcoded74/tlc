import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import type { HealthResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkDb(): Promise<{ reachable: boolean; lastLessonAt: string | null }> {
  try {
    const latest = await prisma.lessonRun.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return {
      reachable: true,
      lastLessonAt: latest ? latest.createdAt.toISOString() : null,
    };
  } catch {
    return { reachable: false, lastLessonAt: null };
  }
}

async function checkGemma(): Promise<boolean> {
  if (!env.googleAiStudioKey) return false;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${env.googleAiStudioKey}`,
      {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const [db, gemmaReachable] = await Promise.all([checkDb(), checkGemma()]);

  const status: HealthResponse["status"] = (() => {
    if (db.reachable && gemmaReachable) return "ok";
    if (db.reachable || gemmaReachable) return "degraded";
    return "down";
  })();

  const payload: HealthResponse = {
    status,
    gemma_reachable: gemmaReachable,
    db_reachable: db.reachable,
    last_lesson_at: db.lastLessonAt,
    uptime_pct_24h: null,
  };

  return NextResponse.json(payload, {
    status: status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
