"use client";

import { useEffect, useMemo, useState } from "react";
import type { RunStatus } from "@/lib/types";

/**
 * In-flight companion card for the lesson page.
 *
 * Two halves of one card on desktop, stacked on mobile:
 *   left  — live elapsed counter + honest median expectation
 *   right — rotating, hand-written snippet (phase narration / pedagogy
 *           trivia / the cuppa-tea line) on an 8-second fade
 *
 * Auto-hides on terminal status (complete | failed). All client-side.
 * No LLM calls, no server work.
 */

const SNIPPETS: Array<{ body: string; credit?: string }> = [
  {
    body:
      "Hunter is mapping lesson steps and the assessment. Christine is writing the hook, the discussion prompts, and the misconceptions. Neither sees the other's draft yet.",
  },
  {
    body:
      "Phase 2 audits both drafts and cross-references every vocabulary term against Wikipedia and Wikidata in parallel. Contradicted claims become must-fix issues.",
  },
  {
    body:
      "Phase 3 lets each persona revise in light of the review, then a deterministic merge layer assembles the final package by field ownership.",
  },
  {
    body:
      "Cognitive Load Theory says working memory holds about 4±1 chunks at a time. Lesson steps stay short on purpose.",
  },
  {
    body:
      "The 'forgetting curve' (Ebbinghaus) drops to ~25% retention within 24 hours without retrieval practice. The exit ticket isn't decoration.",
  },
  {
    body:
      "K-12 teachers make roughly 1,500 educational decisions per school day. TLC is meant to take the lesson-prep ones off the pile.",
  },
  {
    body:
      "Every vocabulary term and misconception correction is cross-referenced against Wikipedia and Wikidata while you wait. Standards codes are regex-validated against published frameworks.",
  },
  {
    body:
      "This is a good moment for a cup of tea. Kettle's worth of water in 90 seconds.",
  },
  {
    body: "The art of teaching is the art of assisting discovery.",
    credit: "Mark Van Doren",
  },
];

const SNIPPET_INTERVAL_MS = 8_000;
const FADE_MS = 250;

export function WhileYouWait({
  status,
  createdAt,
}: {
  status: RunStatus;
  createdAt: string;
}) {
  // Hide entirely once the lesson is finished or has errored — the page
  // below is the answer at that point.
  const isTerminal = status === "complete" || status === "failed";

  const startedAt = useMemo(() => new Date(createdAt).getTime(), [createdAt]);

  // Live elapsed seconds. Updates every 1s.
  const [elapsedMs, setElapsedMs] = useState(() =>
    Math.max(0, Date.now() - startedAt),
  );
  useEffect(() => {
    if (isTerminal) return;
    const tick = () => setElapsedMs(Math.max(0, Date.now() - startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, isTerminal]);

  // Shuffle once on mount, then iterate linearly so the user sees each
  // item before any repeats.
  const order = useMemo(() => shuffle(SNIPPETS.map((_, i) => i)), []);
  const [step, setStep] = useState(0);
  // Two-stage state for fade: visible item index + opacity flag.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (isTerminal) return;
    const id = setInterval(() => {
      // Fade out, swap, fade in.
      setVisible(false);
      const t = setTimeout(() => {
        setStep((s) => (s + 1) % order.length);
        setVisible(true);
      }, FADE_MS);
      return () => clearTimeout(t);
    }, SNIPPET_INTERVAL_MS);
    return () => clearInterval(id);
  }, [order.length, isTerminal]);

  if (isTerminal) return null;

  const snippet = SNIPPETS[order[step]];
  const seconds = Math.floor(elapsedMs / 1000);

  return (
    <section
      aria-label="Lesson generation progress"
      className="rounded-lg border border-hunter-100 bg-paper grid grid-cols-1 md:grid-cols-[minmax(220px,260px)_1fr] divide-y md:divide-y-0 md:divide-x divide-hunter-100 overflow-hidden"
    >
      <ElapsedHalf seconds={seconds} />
      <SnippetHalf
        body={snippet.body}
        credit={snippet.credit}
        visible={visible}
      />
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Left: elapsed counter + median expectation
// ──────────────────────────────────────────────────────────────────────

function ElapsedHalf({ seconds }: { seconds: number }) {
  const tone = pickTone(seconds);
  return (
    <div className="px-5 py-4 bg-hunter-50/40 flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-widest text-(--color-muted)">
        Elapsed
      </p>
      <p className="font-serif text-3xl leading-none tabular-nums">
        {formatElapsed(seconds)}
      </p>
      <p
        className={`text-xs leading-snug pt-1 ${
          tone === "warm"
            ? "text-amber-800"
            : tone === "long"
              ? "text-amber-900"
              : "text-(--color-muted)"
        }`}
      >
        {tone === "normal" && "Typical lesson runs 60–180s end-to-end."}
        {tone === "warm" &&
          "Taking a little longer than usual — paid lane should still finish; hang tight."}
        {tone === "long" &&
          "Past the typical Vercel function window. The run may have stalled — try a fresh lesson if it doesn't resolve in the next minute."}
      </p>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickTone(seconds: number): "normal" | "warm" | "long" {
  if (seconds < 180) return "normal";
  if (seconds < 300) return "warm";
  return "long";
}

// ──────────────────────────────────────────────────────────────────────
// Right: rotating snippet
// ──────────────────────────────────────────────────────────────────────

function SnippetHalf({
  body,
  credit,
  visible,
}: {
  body: string;
  credit?: string;
  visible: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] uppercase tracking-widest text-(--color-muted) mb-1.5">
        While you wait
      </p>
      <div
        className="transition-opacity ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transitionDuration: `${FADE_MS}ms`,
        }}
        aria-live="polite"
      >
        <p className="text-sm leading-relaxed text-ink">
          {credit ? <em>&ldquo;{body}&rdquo;</em> : body}
        </p>
        {credit ? (
          <p className="text-xs text-(--color-muted) mt-1.5">— {credit}</p>
        ) : null}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
