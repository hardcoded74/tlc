"use client";

import { useState } from "react";

export function ReactionButton({
  runId,
  initialCount,
  initiallyReacted,
}: {
  runId: string;
  initialCount: number;
  initiallyReacted: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initiallyReacted);
  const [pending, setPending] = useState(false);

  async function react() {
    if (pending || reacted) return;
    setPending(true);
    // Optimistic — we'll reconcile from the response either way.
    setCount((c) => c + 1);
    setReacted(true);
    try {
      const res = await fetch(`/api/lesson/${runId}/react`, { method: "POST" });
      if (!res.ok) {
        // Server said no — roll back.
        setCount((c) => Math.max(0, c - 1));
        setReacted(false);
      } else {
        const body = (await res.json().catch(() => null)) as
          | { count?: number; reacted?: boolean }
          | null;
        if (body && typeof body.count === "number") {
          setCount(body.count);
        }
        if (body && typeof body.reacted === "boolean") {
          setReacted(body.reacted);
        }
      }
    } catch {
      setCount((c) => Math.max(0, c - 1));
      setReacted(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={react}
      disabled={pending || reacted}
      aria-pressed={reacted}
      title={reacted ? "You found this useful" : "Mark this lesson as useful"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        reacted
          ? "border-christine-300 bg-christine-50 text-christine-700 cursor-default"
          : "border-hunter-200 bg-paper text-hunter-700 hover:border-hunter-400"
      }`}
    >
      <span aria-hidden>{reacted ? "♥" : "♡"}</span>
      <span>
        {reacted ? "Useful" : "Found this useful"}
        {count > 0 ? ` · ${count}` : ""}
      </span>
    </button>
  );
}
