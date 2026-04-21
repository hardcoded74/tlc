/**
 * Simple per-run event bus.
 *
 * Used by the orchestrator to emit progress events and by the SSE
 * endpoint to forward them to the client. This lives in-process: when
 * a Next.js API route instance handles both the create call and the
 * stream subscription, events flow through here.
 *
 * On Vercel serverless the create call and the stream call may land on
 * different lambdas. For that case the stream endpoint ALSO polls the
 * database as a fallback — see app/api/lesson/stream/[id]/route.ts.
 * This bus is the fast path; the DB is the reliable path.
 */

import { EventEmitter } from "node:events";
import type { StreamEvent } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __tlcRunEmitters: Map<string, EventEmitter> | undefined;
}

const registry: Map<string, EventEmitter> =
  globalThis.__tlcRunEmitters ?? new Map();

if (!globalThis.__tlcRunEmitters) {
  globalThis.__tlcRunEmitters = registry;
}

function getEmitter(runId: string): EventEmitter {
  let em = registry.get(runId);
  if (!em) {
    em = new EventEmitter();
    em.setMaxListeners(32);
    registry.set(runId, em);
  }
  return em;
}

export function emitRunEvent(runId: string, event: StreamEvent): void {
  getEmitter(runId).emit("event", event);
}

export function subscribeToRun(
  runId: string,
  onEvent: (event: StreamEvent) => void,
): () => void {
  const em = getEmitter(runId);
  em.on("event", onEvent);
  return () => {
    em.off("event", onEvent);
    if (em.listenerCount("event") === 0) {
      registry.delete(runId);
    }
  };
}

/** Clear emitter after a run terminates — called by orchestrator. */
export function finalizeRun(runId: string): void {
  // Delay cleanup so late-arriving subscribers can still see the final event.
  setTimeout(() => {
    registry.delete(runId);
  }, 30_000);
}
