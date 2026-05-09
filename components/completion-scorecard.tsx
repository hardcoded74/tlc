"use client";

/**
 * Completion scorecard — shown the instant a lesson finishes, *if* the
 * user was playing trivia. It serves three purposes:
 *
 *   1. Confirms the lesson finished (the page state changes can be
 *      easy to miss when a modal is open).
 *   2. Gives a tidy stopping point for the trivia session — final score,
 *      no awkward "are we still doing this?" lingering.
 *   3. The single "Yes" button forces an explicit acknowledgement,
 *      which lets us dismiss for good (we never re-show this card on
 *      the same run after the user clicks Yes).
 *
 * Suppression: if the user never opened trivia (score.total === 0),
 * we don't render — no scorecard to show.
 */

import { useEffect, useState } from "react";
import type { TriviaScore } from "./trivia-popup";

interface Props {
  status: string; // "complete" triggers the modal
  score: TriviaScore;
}

export function CompletionScorecard({ status, score }: Props) {
  // Latch: once we fire on a "complete" transition, stay open until
  // the user clicks Yes. If status flickers back (it shouldn't, but
  // belt-and-suspenders) we don't reopen.
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status === "complete" && !dismissed && score.total > 0) {
      setOpen(true);
    }
  }, [status, score.total, dismissed]);

  if (!open || dismissed) return null;

  const percent = Math.round((score.right / Math.max(score.total, 1)) * 100);
  const verdict =
    percent >= 80
      ? "Top of the class."
      : percent >= 60
        ? "Solid."
        : percent >= 40
          ? "Honest effort."
          : "Plenty to learn — same as the students.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-md border border-hunter-200 bg-paper p-6 shadow-xl">
        <p className="text-xs uppercase tracking-widest text-(--color-muted)">
          Scorecard
        </p>
        <h3 className="mt-2 font-serif text-2xl leading-snug">
          Your trivia score
        </h3>
        <p className="mt-1 text-sm text-(--color-muted)">{verdict}</p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Right" value={score.right} tone="good" />
          <Stat label="Wrong" value={score.wrong} tone="meh" />
          <Stat label="Total" value={score.total} tone="neutral" />
        </div>

        <hr className="my-5 border-hunter-100" />

        <p className="font-serif text-lg">
          One last question…
        </p>
        <p className="mt-1 text-(--color-muted)">
          Did you realize your lesson finished?
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded bg-hunter-700 text-white text-sm px-5 py-2"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "meh" | "neutral";
}) {
  const ring =
    tone === "good"
      ? "border-green-200 bg-green-50 text-green-900"
      : tone === "meh"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-hunter-200 bg-white text-hunter-800";
  return (
    <div className={`rounded border ${ring} px-3 py-2`}>
      <div className="text-2xl font-serif tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide opacity-75">{label}</div>
    </div>
  );
}
