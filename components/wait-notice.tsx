"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tlc-wait-notice-seen";

/**
 * One-time modal explaining the wait. Pops once per browser (localStorage
 * flag) on the first lesson page a visitor hits while a lesson is being
 * generated. Dismissed-then-never-shown-again so judges don't see the
 * same speech twice.
 */
export function WaitNotice({ activeRun }: { activeRun: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeRun) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Brief delay so the page paints first; the modal feels deliberate
    // rather than a popup that beat the user to the screen.
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [activeRun]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage errors (private mode, quota); modal still closes.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wait-notice-title"
    >
      <div className="bg-paper rounded-lg border border-hunter-200 max-w-lg w-full p-7 shadow-xl space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-hunter-700 font-medium">
            A note about the wait
          </p>
          <h2
            id="wait-notice-title"
            className="font-serif text-2xl leading-tight"
          >
            You&rsquo;re welcome to sit and watch — but feel free to come back.
          </h2>
        </div>
        <p className="text-sm leading-relaxed">
          Some lessons can take up to <strong>ten minutes</strong> to create.
          Two AI specialists draft in parallel, a third reviews, and a verifier
          cross-checks every claim against Wikipedia and Wikidata. It&rsquo;s
          worth the wait — but it doesn&rsquo;t have to be your wait.
        </p>
        <p className="text-sm leading-relaxed">
          You could take a break, have an apple, listen to an audiobook, solve
          a puzzle, or — Hunter&rsquo;s personal favorite — take a nap.
        </p>
        <div className="pt-2 flex justify-end">
          <button
            onClick={dismiss}
            autoFocus
            className="px-5 py-2 rounded-md bg-hunter-700 text-white text-sm font-medium hover:bg-hunter-900 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
