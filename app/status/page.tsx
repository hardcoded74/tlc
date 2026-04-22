import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pingGemma } from "@/lib/gemma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Snapshot {
  gemma: boolean;
  dbReachable: boolean;
  totalLessons: number;
  lessonsLast24h: number;
  lastLessonAt: string | null;
  avgLatencyMs: number | null;
  statusSince: string;
}

async function gather(): Promise<Snapshot> {
  const gemmaP = pingGemma().catch(() => false);
  let dbReachable = true;
  let totalLessons = 0;
  let lessonsLast24h = 0;
  let lastLessonAt: string | null = null;
  let avgLatencyMs: number | null = null;

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, recent, latest] = await Promise.all([
      prisma.lessonRun.count({ where: { status: "complete" } }),
      prisma.lessonRun.count({
        where: {
          status: "complete",
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      prisma.lessonRun.findFirst({
        where: { status: "complete" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, timings: true },
      }),
    ]);
    totalLessons = total;
    lessonsLast24h = recent;
    lastLessonAt = latest ? latest.createdAt.toISOString() : null;

    const timedRows = await prisma.lessonRun.findMany({
      where: {
        status: "complete",
        createdAt: { gte: twentyFourHoursAgo },
        timings: { not: { equals: null as unknown as object } },
      },
      select: { timings: true },
      take: 50,
    });
    const totals = timedRows
      .map((r) => {
        const t = r.timings as { total_ms?: number } | null;
        return t?.total_ms;
      })
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (totals.length > 0) {
      avgLatencyMs = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    }
  } catch {
    dbReachable = false;
  }

  const gemma = await gemmaP;

  return {
    gemma,
    dbReachable,
    totalLessons,
    lessonsLast24h,
    lastLessonAt,
    avgLatencyMs,
    statusSince: new Date().toISOString(),
  };
}

export default async function StatusPage() {
  const snap = await gather();
  const overallGreen = snap.gemma && snap.dbReachable;
  const overallLabel = overallGreen
    ? "All systems operational"
    : snap.dbReachable || snap.gemma
      ? "Partial degradation"
      : "Service down";

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-hunter-500 hover:underline">
          &larr; Home
        </Link>

        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-(--color-muted)">
            Status
          </p>
          <h1 className="font-serif text-4xl">System health</h1>
        </header>

        <section
          className={`rounded-lg border p-5 flex items-center gap-3 ${
            overallGreen
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full ${
              overallGreen ? "bg-green-500" : "bg-amber-500"
            }`}
          />
          <div>
            <p className="font-medium text-sm">{overallLabel}</p>
            <p className="text-xs text-(--color-muted) mt-0.5">
              Checked at {new Date(snap.statusSince).toUTCString()}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CheckRow
            label="Gemma 4 (Google AI Studio)"
            ok={snap.gemma}
            description="Model reachability — list models endpoint"
          />
          <CheckRow
            label="Database (Neon Postgres)"
            ok={snap.dbReachable}
            description="Lesson runs + source uploads"
          />
        </section>

        <section className="rounded-lg border border-hunter-100 bg-paper p-5">
          <p className="font-serif text-xl mb-4">Activity</p>
          <dl className="grid grid-cols-2 gap-y-4 gap-x-8">
            <Stat label="Lessons completed (total)" value={snap.totalLessons.toLocaleString()} />
            <Stat label="Lessons completed (24h)" value={snap.lessonsLast24h.toLocaleString()} />
            <Stat
              label="Avg generation time (24h)"
              value={
                snap.avgLatencyMs
                  ? `${(snap.avgLatencyMs / 1000).toFixed(1)} s`
                  : "—"
              }
            />
            <Stat
              label="Last lesson generated"
              value={
                snap.lastLessonAt
                  ? new Date(snap.lastLessonAt).toUTCString()
                  : "—"
              }
            />
          </dl>
        </section>

        <p className="text-xs text-(--color-muted)">
          Activity counts include the pre-generated gallery lessons. See the{" "}
          <Link href="/gallery" className="underline hover:text-hunter-500">
            gallery
          </Link>{" "}
          if live generation is unavailable — the example lessons are always up.
        </p>
      </div>
    </main>
  );
}

function CheckRow({
  label,
  ok,
  description,
}: {
  label: string;
  ok: boolean;
  description: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        ok ? "border-hunter-100 bg-paper" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{label}</p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {ok ? "OK" : "Down"}
        </span>
      </div>
      <p className="text-xs text-(--color-muted) mt-1">{description}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-(--color-muted)">
        {label}
      </dt>
      <dd className="font-mono mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
