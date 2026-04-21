"use client";

import { useState } from "react";

export function DownloadButtons({ runId }: { runId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyShareLink() {
    const url = `${window.location.origin}/lesson/${runId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: prompt the user.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`/api/lesson/${runId}/download?format=md`}
        className="px-3 py-1.5 rounded-md border border-hunter-200 text-sm hover:bg-hunter-50 transition"
        download
      >
        Download Markdown
      </a>
      <a
        href={`/api/lesson/${runId}/download?format=html`}
        className="px-3 py-1.5 rounded-md border border-hunter-200 text-sm hover:bg-hunter-50 transition"
        download
      >
        Download HTML
      </a>
      <a
        href={`/api/lesson/${runId}/download?format=json`}
        className="px-3 py-1.5 rounded-md border border-hunter-200 text-sm hover:bg-hunter-50 transition"
        download
      >
        Download JSON
      </a>
      <button
        type="button"
        onClick={copyShareLink}
        className="px-3 py-1.5 rounded-md bg-hunter-700 text-white text-sm hover:bg-hunter-900 transition"
      >
        {copied ? "Link copied ✓" : "Copy share link"}
      </button>
    </div>
  );
}
