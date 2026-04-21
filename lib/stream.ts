/**
 * Client-side SSE subscription hook for lesson runs.
 *
 * EventSource handles reconnection on network hiccups but closes cleanly
 * when the server ends the stream (which our orchestrator does after
 * complete/failed). We mirror events into a small reducer-backed state
 * object that components can read without each one subscribing.
 */

"use client";

import { useEffect, useReducer } from "react";
import type {
  LessonPackage,
  PersonaScaffold,
  PhaseTimings,
  ReviewReport,
  RunStatus,
  StreamEvent,
} from "./types";

export interface StreamState {
  status: RunStatus;
  connected: boolean;
  error: string | null;
  hunterScaffold: PersonaScaffold | null;
  christineScaffold: PersonaScaffold | null;
  review: ReviewReport | null;
  finalPackage: LessonPackage | null;
  timings: PhaseTimings | null;
  lastEventAt: string | null;
}

const INITIAL_STATE: StreamState = {
  status: "pending",
  connected: false,
  error: null,
  hunterScaffold: null,
  christineScaffold: null,
  review: null,
  finalPackage: null,
  timings: null,
  lastEventAt: null,
};

type Action =
  | { type: "connected"; connected: boolean }
  | { type: "event"; event: StreamEvent }
  | { type: "fatal"; message: string };

function reducer(state: StreamState, action: Action): StreamState {
  switch (action.type) {
    case "connected":
      return { ...state, connected: action.connected };
    case "fatal":
      return { ...state, error: action.message, connected: false };
    case "event": {
      const { event } = action;
      const next: StreamState = {
        ...state,
        lastEventAt: event.timestamp,
      };
      const payload = event.payload as Record<string, unknown>;

      switch (event.type) {
        case "phase_start": {
          const phase = payload?.phase as RunStatus | undefined;
          if (phase) next.status = phase;
          return next;
        }
        case "hunter_complete":
          next.hunterScaffold = (payload?.scaffold as PersonaScaffold) ?? state.hunterScaffold;
          return next;
        case "christine_complete":
          next.christineScaffold = (payload?.scaffold as PersonaScaffold) ?? state.christineScaffold;
          return next;
        case "review_start":
          next.status = "reviewing";
          return next;
        case "review_complete":
          next.review = (payload?.review as ReviewReport) ?? state.review;
          next.status = "reviewing";
          return next;
        case "package_ready":
          next.finalPackage = (payload?.finalPackage as LessonPackage) ?? state.finalPackage;
          next.timings = (payload?.timings as PhaseTimings) ?? state.timings;
          next.status = "complete";
          return next;
        case "error": {
          const fatal = payload?.fatal === true;
          const message = (payload?.message as string) ?? (payload?.code as string) ?? "unknown error";
          if (fatal) {
            next.error = message;
            next.status = "failed";
          }
          return next;
        }
        default:
          return next;
      }
    }
    default:
      return state;
  }
}

export function useLessonStream(runId: string | null): StreamState {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    if (!runId) return;
    if (typeof window === "undefined") return;

    const url = `/api/lesson/stream/${runId}`;
    const source = new EventSource(url);
    dispatch({ type: "connected", connected: true });

    const eventTypes: StreamEvent["type"][] = [
      "phase_start",
      "hunter_token",
      "christine_token",
      "hunter_complete",
      "christine_complete",
      "review_start",
      "review_complete",
      "package_ready",
      "source_anchor",
      "error",
    ];

    const handlers: { type: StreamEvent["type"]; handler: (e: MessageEvent) => void }[] = eventTypes.map(
      (type) => {
        const handler = (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data) as StreamEvent;
            dispatch({ type: "event", event: parsed });
            if (parsed.type === "package_ready" || (parsed.type === "error" && (parsed.payload as { fatal?: boolean })?.fatal)) {
              source.close();
              dispatch({ type: "connected", connected: false });
            }
          } catch {
            // Skip malformed events silently — DB poll recovers.
          }
        };
        source.addEventListener(type, handler);
        return { type, handler };
      },
    );

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        dispatch({ type: "connected", connected: false });
      }
    };

    return () => {
      for (const { type, handler } of handlers) {
        source.removeEventListener(type, handler);
      }
      source.close();
    };
  }, [runId]);

  return state;
}
