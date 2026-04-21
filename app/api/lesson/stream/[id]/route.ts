/**
 * GET /api/lesson/stream/:id — Server-Sent Events for a single lesson run.
 *
 * Strategy:
 *   1. Emit a snapshot event on connect so late joiners see whatever phases
 *      have already landed in the DB.
 *   2. Subscribe to the in-process event bus for any run happening on this
 *      Node instance.
 *   3. Poll the DB every 800ms as a fallback in case the orchestrator is
 *      running on a different Vercel lambda (events we'd have missed are
 *      reconstructed from the persisted phase outputs).
 *   4. Close cleanly on status=complete or status=failed.
 */

import { prisma } from "@/lib/prisma";
import { subscribeToRun } from "@/lib/events";
import type { StreamEvent, RunStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const POLL_INTERVAL_MS = 800;
const HEARTBEAT_INTERVAL_MS = 15_000;

function sseEncode(event: StreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

interface SnapshotState {
  status: RunStatus;
  hunterBuildEmitted: boolean;
  christineBuildEmitted: boolean;
  reviewEmitted: boolean;
  packageEmitted: boolean;
  failedEmitted: boolean;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  const state: SnapshotState = {
    status: "pending",
    hunterBuildEmitted: false,
    christineBuildEmitted: false,
    reviewEmitted: false,
    packageEmitted: false,
    failedEmitted: false,
  };

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(event)));
        } catch {
          // Controller may be closed; swallow.
        }
      };

      const sendHeartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: hb ${Date.now()}\n\n`));
        } catch {
          // Ignore.
        }
      };

      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(hbTimer);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Ignore.
        }
      };

      const applyRunRow = (run: Awaited<ReturnType<typeof prisma.lessonRun.findUnique>>) => {
        if (!run) return;

        // Emit phase events the first time we see them in the DB.
        if (!state.hunterBuildEmitted && run.hunterBuild) {
          state.hunterBuildEmitted = true;
          send({
            type: "hunter_complete",
            payload: { scaffold: run.hunterBuild, recovered: true },
            timestamp: new Date().toISOString(),
          });
        }
        if (!state.christineBuildEmitted && run.christineBuild) {
          state.christineBuildEmitted = true;
          send({
            type: "christine_complete",
            payload: { scaffold: run.christineBuild, recovered: true },
            timestamp: new Date().toISOString(),
          });
        }
        if (!state.reviewEmitted && run.review) {
          state.reviewEmitted = true;
          send({
            type: "review_complete",
            payload: { review: run.review, recovered: true },
            timestamp: new Date().toISOString(),
          });
        }
        if (!state.packageEmitted && run.finalPackage) {
          state.packageEmitted = true;
          send({
            type: "package_ready",
            payload: {
              finalPackage: run.finalPackage,
              timings: run.timings,
              recovered: true,
            },
            timestamp: new Date().toISOString(),
          });
        }
        if (!state.failedEmitted && run.status === "failed") {
          state.failedEmitted = true;
          send({
            type: "error",
            payload: { code: "run_failed", errorLog: run.errorLog, fatal: true },
            timestamp: new Date().toISOString(),
          });
        }
        state.status = run.status as RunStatus;
      };

      // Subscribe to the live bus.
      let unsubscribe: (() => void) | undefined;
      try {
        unsubscribe = subscribeToRun(id, (event) => {
          send(event);
          // Mark phase flags so the DB poller doesn't re-emit.
          if (event.type === "hunter_complete") state.hunterBuildEmitted = true;
          if (event.type === "christine_complete") state.christineBuildEmitted = true;
          if (event.type === "review_complete") state.reviewEmitted = true;
          if (event.type === "package_ready") state.packageEmitted = true;
        });
      } catch {
        // Bus errored; DB polling still works.
      }

      // Initial snapshot.
      try {
        const initial = await prisma.lessonRun.findUnique({ where: { id } });
        if (!initial) {
          send({
            type: "error",
            payload: { code: "run_not_found", message: `No run with id ${id}`, fatal: true },
            timestamp: new Date().toISOString(),
          });
          stop();
          return;
        }
        send({
          type: "phase_start",
          payload: { phase: initial.status, snapshot: true },
          timestamp: new Date().toISOString(),
        });
        applyRunRow(initial);
        if (initial.status === "complete" || initial.status === "failed") {
          stop();
          return;
        }
      } catch (err) {
        send({
          type: "error",
          payload: {
            code: "snapshot_failed",
            message: err instanceof Error ? err.message : String(err),
            fatal: false,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Periodic DB poll as fallback.
      const pollTimer = setInterval(async () => {
        if (closed) return;
        try {
          const run = await prisma.lessonRun.findUnique({ where: { id } });
          if (!run) return;
          applyRunRow(run);
          if (run.status === "complete" || run.status === "failed") {
            stop();
          }
        } catch {
          // Transient — retry on next tick.
        }
      }, POLL_INTERVAL_MS);

      const hbTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
