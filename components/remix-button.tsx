"use client";

import Link from "next/link";

export function RemixButton({ runId }: { runId: string }) {
  return (
    <Link
      href={`/create?from=${runId}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-christine-300 bg-christine-50 px-3 py-1.5 text-sm text-christine-700 hover:bg-christine-100 transition"
      title="Start a new lesson pre-filled from this one"
    >
      <span aria-hidden>↻</span>
      Remix this lesson
    </Link>
  );
}
