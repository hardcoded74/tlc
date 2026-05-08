/**
 * TLC orchestration worker.
 *
 * Run on a machine that can talk to (a) the production Neon Postgres
 * the deployed Vercel app uses and (b) the Gemma 4 inference backend
 * — typically Sam's box, where Selene's llama-server is at
 * localhost:8090.
 *
 *   GEMMA_BACKEND=local \
 *   GEMMA_LOCAL_URL=http://localhost:8090 \
 *   GEMMA_LOCAL_MODEL=selene-live \
 *   DATABASE_URL=<neon prod URL> \
 *   npx tsx scripts/worker.ts
 *
 * The worker polls LessonRun for rows with status="pending" and runs
 * the same orchestrator the Vercel function would run — except here
 * the process can take 10 minutes if it has to. When the orchestrator
 * resolves (or throws) the row's status flips to "complete" or
 * "failed" and the next poll picks up another run.
 *
 * Single-flight by default — only one orchestration runs at a time.
 * That keeps Selene from thrashing between concurrent calls and gives
 * sequential users a fair queue.
 */

import { PrismaClient } from "@prisma/client";
import { orchestrate } from "../lib/orchestrator";

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = 4_000;
const STALE_AFTER_MS = 30 * 60_000; // 30 min — anything older was abandoned

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

async function pickOldestPending(): Promise<string | null> {
  // Atomically claim a single pending row by flipping it to "building"
  // — that prevents two workers (or a re-run of the same worker) from
  // grabbing the same lesson if someone ever scales horizontally.
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  // Newer Prisma supports orderBy/take on updateManyAndReturn; if the
  // installed version doesn't, the fallback path handles it. We just
  // claim everything pending+fresh and act on the first.
  const claimed = await prisma.lessonRun.updateManyAndReturn({
    where: { status: "pending", createdAt: { gt: cutoff } },
    data: { status: "building" },
    select: { id: true, createdAt: true },
  });
  if (claimed.length === 0) return null;
  // Sort client-side and pick oldest.
  claimed.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  // If somehow we claimed multiple, release all but the oldest by setting
  // them back to pending so the next poll catches them.
  if (claimed.length > 1) {
    const releaseIds = claimed.slice(1).map((c) => c.id);
    await prisma.lessonRun.updateMany({
      where: { id: { in: releaseIds } },
      data: { status: "pending" },
    });
  }
  return claimed[0].id;
}

async function fallbackPickOldestPending(): Promise<string | null> {
  // Older Prisma versions don't expose updateManyAndReturn — fall back
  // to a findFirst + update sequence. Race-y across concurrent workers
  // but fine for the single-worker setup we ship.
  const row = await prisma.lessonRun.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!row) return null;
  await prisma.lessonRun.update({
    where: { id: row.id },
    data: { status: "building" },
  });
  return row.id;
}

async function claimNextRun(): Promise<string | null> {
  try {
    return await pickOldestPending();
  } catch {
    return await fallbackPickOldestPending();
  }
}

async function processOne(): Promise<boolean> {
  const runId = await claimNextRun();
  if (!runId) return false;
  console.log(`[${ts()}] [worker] picked run ${runId}`);
  const t0 = Date.now();
  try {
    await orchestrate({ runId });
    console.log(
      `[${ts()}] [worker] run ${runId} finished in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  } catch (err) {
    console.error(
      `[${ts()}] [worker] run ${runId} threw after ${((Date.now() - t0) / 1000).toFixed(1)}s:`,
      err,
    );
    // orchestrate() catches its own errors and writes to errorLog +
    // status=failed already; nothing to do here.
  }
  return true;
}

async function main(): Promise<void> {
  console.log(`[${ts()}] [worker] starting; polling every ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`[${ts()}] [worker] backend: ${process.env.GEMMA_BACKEND ?? "studio"}`);
  if (process.env.GEMMA_BACKEND === "local") {
    console.log(`[${ts()}] [worker] local URL: ${process.env.GEMMA_LOCAL_URL}`);
    console.log(`[${ts()}] [worker] local model: ${process.env.GEMMA_LOCAL_MODEL}`);
  }

  while (!stopping) {
    try {
      const did = await processOne();
      if (!did) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    } catch (err) {
      console.error(`[${ts()}] [worker] poll loop error:`, err);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  console.log(`[${ts()}] [worker] shutdown signal received; exiting`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(`[${ts()}] [worker] fatal:`, err);
  prisma.$disconnect().finally(() => process.exit(1));
});
